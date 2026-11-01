"""Prepare (never execute) a restore for the dedicated local services rehearsal.

Native Auth/Storage definitions stay in place. SQL and data stay on this machine.
The generated plan must be inspected before a separate transactional import.
"""
import argparse
import csv
import json
import pathlib
import re
import subprocess
import sys

import backup

CONTAINER = 'supabase_db_batcaverna-ensaio-v2'
NETWORK = 'batcaverna-ensaio-v2-interna'
AUTH_DATA = {'users', 'identities', 'mfa_factors'}
IDENT = r'"((?:[^"]|"")+)"'
PAIR = IDENT + r'\.' + IDENT
COPY = re.compile(r'^COPY ' + PAIR + r' \((.+)\) FROM stdin;\s*$')
TABLE = re.compile(r'^CREATE TABLE(?: IF NOT EXISTS)? ' + PAIR + r'\s*\((.*?)^\);', re.M | re.S)
FUNC = re.compile(r'^(?:CREATE(?: OR REPLACE)? FUNCTION|ALTER FUNCTION|COMMENT ON FUNCTION) ' + PAIR, re.I)
TRIGGER = re.compile(r'^CREATE(?: OR REPLACE)?(?: CONSTRAINT)? TRIGGER ' + IDENT + r'.*?\bON ' + PAIR + r'.*?EXECUTE (?:FUNCTION|PROCEDURE) ' + PAIR, re.I | re.S)
POLICY = re.compile(r'^CREATE POLICY ' + IDENT + r' ON ' + PAIR, re.I)
FK = re.compile(r'^ALTER TABLE(?: ONLY)? ' + PAIR + r'\s+ADD CONSTRAINT ' + IDENT + r'\s+(FOREIGN KEY.*);$', re.I | re.S)


def unquote(value):
    return value.replace('""', '"')


def clean(statement):
    import sqlparse
    return sqlparse.format(statement, strip_comments=True).strip()


def statements(text):
    import sqlparse
    return [(statement, clean(statement)) for statement in sqlparse.split(text) if clean(statement)]


def norm_type(value):
    return re.sub(r'\s+', ' ', value.replace('"', '').strip()).lower()


def norm_fk(value):
    return re.sub(r'\s+', '', value.replace('"', '').rstrip(';')).lower()


def source_columns(text):
    result = {}
    for table in TABLE.finditer(text):
        schema, name = map(unquote, table.group(1, 2))
        for column in re.finditer(r'^\s+"([^"]+)"\s+([^\r\n]+)', table[3], re.M):
            kind = re.split(r'\s+(?:DEFAULT|NOT NULL|NULL|GENERATED|CONSTRAINT|CHECK|REFERENCES|COLLATE)\b', column[2], maxsplit=1)[0].strip().rstrip(',')
            result[(schema, name, column[1])] = norm_type(kind)
    return result


def filter_data(text):
    """COPY rows are opaque; SQL-looking values must never become commands."""
    lines = text.splitlines(keepends=True)
    output, imported, skipped, columns = [], {}, {}, {}
    i = 0
    while i < len(lines):
        line = lines[i]
        match = COPY.match(line)
        if not match:
            if line.startswith('COPY '):
                raise ValueError('Formato COPY nao reconhecido; preparacao interrompida.')
            # Native auth identity/token sequences are not needed for the retained UUID tables.
            if not (line.startswith('SELECT ') and 'setval(' in line and '"auth".' in line):
                output.append(line)
            i += 1
            continue
        schema, table = map(unquote, match.group(1, 2))
        key = (schema, table)
        if key in imported or key in skipped:
            raise ValueError('Tabela COPY duplicada no pacote.')
        names = next(csv.reader([match[3]], skipinitialspace=True))
        if not names or len(names) != len(set(names)):
            raise ValueError('Colunas COPY invalidas.')
        columns[key] = names
        start = i
        i += 1
        while i < len(lines) and lines[i].rstrip('\r\n') != '\\.':
            i += 1
        if i == len(lines):
            raise ValueError('COPY sem terminador no pacote.')
        count = i - start - 1
        i += 1
        if schema == 'auth' and table not in AUTH_DATA:
            skipped[key] = count
        else:
            imported[key] = count
            output.extend(lines[start:i])
    if not imported:
        raise ValueError('Nenhuma tabela de dados encontrada.')
    return ''.join(output), imported, skipped, columns


def command(args, data=None):
    result = subprocess.run(args, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        raise RuntimeError('Falha na consulta local [' + backup.failure_category(result.stderr) + ']; saida omitida.')
    return result.stdout


def catalog():
    inspected = json.loads(command(['docker', 'inspect', CONTAINER]))[0]
    if not inspected['State']['Running'] or set(inspected['NetworkSettings']['Networks']) != {NETWORK}:
        raise ValueError('O novo banco deve estar em execucao somente na rede interna do ensaio.')
    query = """
SELECT json_build_object(
 'empty', (SELECT count(*)=0 FROM auth.users)
          AND (SELECT count(*)=0 FROM storage.buckets)
          AND (SELECT count(*)=0 FROM storage.objects)
          AND NOT EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public'),
 'columns', COALESCE((SELECT json_agg(row_to_json(x)) FROM (
   SELECT n.nspname AS schema,c.relname AS name,a.attname AS col,
          format_type(a.atttypid,a.atttypmod) AS type,
          (a.attnotnull AND NOT a.atthasdef AND a.attidentity='' AND a.attgenerated='') AS required
   FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname IN ('auth','storage','supabase_functions') AND c.relkind IN ('r','p') AND a.attnum>0 AND NOT a.attisdropped
 ) x),'[]'::json),
 'functions',COALESCE((SELECT json_agg(ARRAY[n.nspname,p.proname]) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('auth','storage')),'[]'::json),
 'triggers',COALESCE((SELECT json_agg(ARRAY[n.nspname,c.relname,t.tgname]) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal),'[]'::json),
 'policies',COALESCE((SELECT json_agg(ARRAY[schemaname,tablename,policyname]) FROM pg_policies),'[]'::json),
 'fks',COALESCE((SELECT json_agg(row_to_json(x)) FROM (
   SELECT n.nspname AS schema,c.relname AS name,k.conname AS constraint,pg_get_constraintdef(k.oid,true) AS definition
   FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE k.contype='f'
 ) x),'[]'::json));
"""
    return json.loads(command(['docker', 'exec', '-i', CONTAINER, 'psql', '-X', '-qAt', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], query.encode()))


def verify_folder(folder):
    meta = json.loads((folder / 'snapshot.json').read_text(encoding='utf-8-sig'))
    if meta.get('format') != 2 or meta.get('completed') is not True or meta.get('project') != backup.PROJECT:
        raise ValueError('E necessario o pacote corrigido formato 2.')
    paths = {'snapshot.json'}
    for item in meta['files']:
        path = pathlib.PurePosixPath(item['path'])
        if path.is_absolute() or '..' in path.parts or path.as_posix() in paths:
            raise ValueError('Caminho invalido no manifesto.')
        paths.add(path.as_posix())
        local = folder.joinpath(*path.parts)
        if local.is_symlink() or not local.is_file() or local.stat().st_size != item['bytes'] or backup.digest(local) != item['sha256']:
            raise ValueError('Arquivo ausente ou divergente no pacote extraido.')
    if any(p.is_symlink() for p in folder.rglob('*')):
        raise ValueError('Links nao sao permitidos no pacote extraido.')
    if {p.relative_to(folder).as_posix() for p in folder.rglob('*') if p.is_file()} != paths:
        raise ValueError('Arquivo nao inventariado na pasta do backup.')
    if not {'schema.sql','managed_schema.sql','functions_schema.sql','data.sql'}.issubset(paths):
        raise ValueError('SQL obrigatorio ausente.')
    return meta


def prepare(sql, meta):
    if not meta['empty']:
        raise ValueError('O banco novo ja contem dados ou tabelas da aplicacao; nao sera preparado outro import.')
    data, imported, skipped, copy_columns = filter_data(sql['data.sql'])
    source = source_columns(sql['managed_schema.sql'] + '\n' + sql['functions_schema.sql'])
    target = {(c['schema'], c['name'], c['col']): c for c in meta['columns']}
    for key, names in copy_columns.items():
        if key[0] not in {'auth', 'storage', 'supabase_functions'} or key in skipped:
            continue
        for name in names:
            column = (*key, name)
            if column not in source or column not in target or source[column] != norm_type(target[column]['type']):
                raise ValueError('Definicao de coluna gerenciada ausente ou divergente: ' + '.'.join(column))
        for column, definition in target.items():
            if column[:2] == key and column[2] not in names and definition['required']:
                raise ValueError('Coluna extra obrigatoria sem padrao: ' + '.'.join(column))
    pre, post, functions = [], [], []
    for original, head in statements(sql['schema.sql']):
        (post if TRIGGER.match(head) or POLICY.match(head) or FK.match(head) else pre).append(original)
    for original, head in statements(sql['functions_schema.sql']):
        if FUNC.match(head) or re.match(r'^(GRANT|REVOKE)\b.*\bON FUNCTION\b', head, re.I | re.S):
            functions.append(original)
    if not any(re.match(r'^CREATE(?: OR REPLACE)? FUNCTION', clean(s), re.I) for s in functions):
        raise ValueError('Definicoes de funcoes de supabase_functions ausentes.')
    native_functions = {tuple(f) for f in meta['functions']}
    native_triggers = {tuple(t) for t in meta['triggers']}
    native_policies = {tuple(p) for p in meta['policies']}
    native_fks = {(c['schema'], c['name'], c['constraint']): c['definition'] for c in meta['fks']}
    managed = statements(sql['managed_schema.sql'])
    added_functions = set()
    for _, head in managed:
        match = FUNC.match(head)
        if match and head.upper().startswith('CREATE'):
            key = tuple(map(unquote, match.group(1, 2)))
            if key not in native_functions:
                added_functions.add(key)
    preserved_triggers = preserved_fks = 0
    for original, head in managed:
        fn, trigger, policy, fk = FUNC.match(head), TRIGGER.match(head), POLICY.match(head), FK.match(head)
        if fn:
            if tuple(map(unquote, fn.group(1, 2))) in added_functions:
                pre.append(original)
        elif trigger:
            name, schema, table, fn_schema, _ = map(unquote, trigger.groups())
            if (schema, table, name) in native_triggers:
                if fn_schema not in {'auth', 'storage'}:
                    raise ValueError('Gatilho gerenciado em conflito exige revisao: ' + schema + '.' + table + '.' + name)
                preserved_triggers += 1
            else:
                post.append(original)
        elif policy:
            name, schema, table = map(unquote, policy.groups())
            if (schema, table, name) in native_policies:
                raise ValueError('Politica gerenciada em conflito exige revisao: ' + schema + '.' + table + '.' + name)
            post.append(original)
        elif fk:
            schema, table, name = map(unquote, fk.group(1, 2, 3))
            key = (schema, table, name)
            if key in native_fks:
                if norm_fk(fk[4]) != norm_fk(native_fks[key]):
                    raise ValueError('FK gerenciada em conflito exige revisao: ' + '.'.join(key))
                preserved_fks += 1
            else:
                post.append(original)
        elif re.match(r'^(GRANT|REVOKE)\b', head, re.I) and not re.search(r'\bON FUNCTION\b', head, re.I) and re.search(r'\b(anon|authenticated|service_role)\b', head, re.I):
            # Replay only application-role ACLs; never replace platform ownership or tables.
            if not re.search(r'\bON FUNCTION\b', head, re.I):
                pre.append(original)
        elif re.match(r'^(GRANT|REVOKE)\b', head, re.I):
            function_acl = re.search(r'\bON FUNCTION ' + PAIR, head, re.I)
            if function_acl and tuple(map(unquote, function_acl.group(1, 2))) in added_functions:
                pre.append(original)
    def joined(items):
        return 'SET check_function_bodies = false;\n' + '\n\n'.join(items) + '\n'
    files = {'01-functions.sql': joined(functions), '02-schema-pre.sql': joined(pre), '03-data.sql': data, '04-schema-post.sql': joined(post)}
    summary = {'preparation_only': True, 'container': CONTAINER, 'imported_tables': len(imported), 'imported_rows': sum(imported.values()), 'auth_tables_omitted': ['.'.join(key) for key in sorted(skipped)], 'auth_rows_omitted': sum(skipped.values()), 'native_triggers_preserved': preserved_triggers, 'native_fks_preserved': preserved_fks, 'post_statements': len(post), 'expected_counts': {'.'.join(key): count for key, count in imported.items()}}
    return files, summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backup', type=pathlib.Path, required=True)
    parser.add_argument('--output', type=pathlib.Path, required=True)
    args = parser.parse_args()
    folder, output = args.backup.resolve(), args.output.resolve()
    if output.exists() or output == folder or folder in output.parents:
        raise ValueError('Use uma pasta nova de plano, fora do pacote extraido.')
    verify_folder(folder)
    sql = {name: (folder / name).read_text(encoding='utf-8-sig') for name in ('schema.sql','managed_schema.sql','functions_schema.sql','data.sql')}
    files, summary = prepare(sql, catalog())
    output.mkdir(parents=True, mode=0o700)
    for name, text in files.items():
        (output / name).write_text(text, encoding='utf-8', newline='\n')
    summary['files'] = {name: backup.digest(output / name) for name in files}
    (output / 'plan.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    print(json.dumps({k: v for k, v in summary.items() if k not in {'expected_counts','files'}}, ensure_ascii=False))
    print('Plano preparado. Nenhum SQL de restauracao foi executado.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError) as error:
        sys.exit(str(error))
    except Exception as error:
        sys.exit('Falha na preparacao (' + type(error).__name__ + '); detalhes locais omitidos.')

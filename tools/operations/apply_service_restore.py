"""Validate a freshly generated local plan; import only with explicit --apply.

Only the dedicated local rehearsal container is supported. Rebuilds the plan
from the verified package before opening a transaction. Logs remain private.
"""
import argparse
import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys
import uuid

import backup
import prepare_service_restore as prepare

SQL_FILES = ('01-functions.sql', '02-schema-pre.sql', '03-data.sql', '04-schema-post.sql')
VALIDATION_PREFIX = 'BATCAVERNA_VALIDATION='


def literal(value):
    return "'" + value.replace("'", "''") + "'"


def validate_plan(folder, plan_folder):
    import sqlparse
    if sqlparse.__version__ != '0.6.0':
        raise ValueError('Use sqlparse 0.6.0, a mesma versao testada na preparacao.')
    prepare.verify_folder(folder)
    sql = {name: (folder / name).read_text(encoding='utf-8-sig') for name in ('schema.sql','managed_schema.sql','functions_schema.sql','data.sql')}
    files, regenerated = prepare.prepare(sql, prepare.catalog())
    recorded = json.loads((plan_folder / 'plan.json').read_text(encoding='utf-8'))
    if recorded.get('preparation_only') is not True or recorded.get('container') != prepare.CONTAINER:
        raise ValueError('Plano nao pertence ao novo conteiner local.')
    if recorded.get('expected_counts') != regenerated['expected_counts']:
        raise ValueError('As contagens registradas nao correspondem ao pacote.')
    for name in SQL_FILES:
        path = plan_folder / name
        expected = hashlib.sha256(files[name].encode('utf-8')).hexdigest()
        if path.is_symlink() or backup.digest(path) != expected or recorded.get('files', {}).get(name) != expected:
            raise ValueError('Arquivo do plano foi alterado ou diverge da preparacao: ' + name)
    # Only our wrapper owns BEGIN/COMMIT. Function bodies and COPY rows are opaque.
    controls = [files[name] for name in ('01-functions.sql', '02-schema-pre.sql', '04-schema-post.sql')]
    outside_copy, in_copy = [], False
    for line in files['03-data.sql'].splitlines(keepends=True):
        if in_copy:
            if line.rstrip('\r\n') == '\\.':
                in_copy = False
        elif prepare.COPY.match(line):
            in_copy = True
        else:
            outside_copy.append(line)
    controls.append(''.join(outside_copy))
    for content in controls:
        for _, head in prepare.statements(content):
            if head.startswith('\\') or re.match(r'^(BEGIN|COMMIT|END|ROLLBACK|ABORT|START TRANSACTION)\b', head, re.I):
                raise ValueError('Controle de transacao inesperado no plano.')
    _, counts, _, _ = prepare.filter_data(sql['data.sql'])
    return files, regenerated, counts


GUARD_SQL = r'''
SELECT pg_advisory_xact_lock(15020261101);
LOCK TABLE auth.users, storage.buckets, storage.objects IN ACCESS EXCLUSIVE MODE;
DO $guard$
BEGIN
  IF EXISTS(SELECT 1 FROM auth.users)
     OR EXISTS(SELECT 1 FROM storage.buckets)
     OR EXISTS(SELECT 1 FROM storage.objects)
     OR EXISTS(SELECT 1 FROM supabase_functions.hooks)
     OR EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public') THEN
    RAISE EXCEPTION 'RECOVERY_DESTINATION_NOT_EMPTY';
  END IF;
END
$guard$;
'''


def validation_sql(counts, read_only=False):
    rows = ',\n'.join('(' + literal(schema) + ',' + literal(table) + ',' + str(count) + '::bigint)' for (schema, table), count in sorted(counts.items()))
    if not rows:
        raise ValueError('Plano sem contagens de dados.')
    # Scan actual rows even when native FKs are already convalidated=true.
    header = '' if read_only else '''CREATE TEMP TABLE __batcaverna_validation(
  tables_checked integer, rows_checked bigint, foreign_keys_scanned integer
) ON COMMIT DROP;
'''
    summary = '  PERFORM checked_tables,checked_rows,scanned;' if read_only else '  INSERT INTO __batcaverna_validation VALUES(checked_tables,checked_rows,scanned);'
    footer = '' if read_only else 'SELECT tables_checked, rows_checked, foreign_keys_scanned\nFROM __batcaverna_validation\n\\gset recovery_\n'
    return header + r'''
DO $validate$
DECLARE
  expected record;
  actual bigint;
  checked_tables integer := 0;
  checked_rows bigint := 0;
  fk record;
  all_present text;
  any_present text;
  equalities text;
  condition text;
  invalid boolean;
  scanned integer := 0;
BEGIN
  FOR expected IN SELECT * FROM (VALUES
''' + rows + r'''
  ) AS v(schema_name,table_name,expected_count) LOOP
    EXECUTE format('SELECT count(*) FROM %I.%I',expected.schema_name,expected.table_name) INTO actual;
    IF actual <> expected.expected_count THEN
      RAISE EXCEPTION 'RECOVERY_COUNT_MISMATCH: %.%',expected.schema_name,expected.table_name;
    END IF;
    checked_tables := checked_tables + 1;
    checked_rows := checked_rows + actual;
  END LOOP;
  FOR fk IN
    SELECT k.* FROM pg_constraint k
    JOIN pg_class c ON c.oid=k.conrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE k.contype='f' AND left(n.nspname,3) <> 'pg_'
      AND n.nspname <> 'information_schema'
  LOOP
    SELECT
      string_agg(format('c.%I IS NOT NULL',ca.attname),' AND ' ORDER BY u.ord),
      string_agg(format('c.%I IS NOT NULL',ca.attname),' OR ' ORDER BY u.ord),
      string_agg(format('p.%I OPERATOR(%I.%s) c.%I',pa.attname,onsp.nspname,op.oprname,ca.attname),' AND ' ORDER BY u.ord)
    INTO all_present,any_present,equalities
    FROM unnest(fk.conkey,fk.confkey,fk.conpfeqop) WITH ORDINALITY AS u(child_att,parent_att,eq_op,ord)
    JOIN pg_attribute ca ON ca.attrelid=fk.conrelid AND ca.attnum=u.child_att
    JOIN pg_attribute pa ON pa.attrelid=fk.confrelid AND pa.attnum=u.parent_att
    JOIN pg_operator op ON op.oid=u.eq_op
    JOIN pg_namespace onsp ON onsp.oid=op.oprnamespace;
    IF all_present IS NULL OR equalities IS NULL OR fk.confmatchtype NOT IN ('s','f') THEN
      RAISE EXCEPTION 'RECOVERY_UNSUPPORTED_FK: %',fk.conname;
    END IF;
    condition := format('(%s) AND NOT EXISTS(SELECT 1 FROM %s p WHERE %s)',all_present,fk.confrelid::regclass,equalities);
    IF fk.confmatchtype='f' THEN
      condition := format('((%s) AND NOT (%s)) OR (%s)',any_present,all_present,condition);
    END IF;
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM %s c WHERE %s)',fk.conrelid::regclass,condition) INTO invalid;
    IF invalid THEN
      RAISE EXCEPTION 'RECOVERY_FK_ORPHANS: %.%',fk.conrelid::regclass,fk.conname USING ERRCODE='23503';
    END IF;
    scanned := scanned + 1;
  END LOOP;
''' + summary + r'''
END
$validate$;
''' + footer


def transaction_sql(files, counts):
    return ('BEGIN;\n' + GUARD_SQL + '\n' + files[SQL_FILES[0]] + '\n' + files[SQL_FILES[1]]
            + '\nSET LOCAL session_replication_role = replica;\n' + files[SQL_FILES[2]]
            + '\nSET LOCAL session_replication_role = origin;\n' + files[SQL_FILES[3]]
            + '\n' + validation_sql(counts) + '\nCOMMIT;\n' + commit_report_sql())


def commit_report_sql():
    return """COPY (SELECT """ + literal(VALIDATION_PREFIX) + """ || json_build_object(
      'tables_checked', :recovery_tables_checked::integer,
      'rows_checked', :recovery_rows_checked::bigint,
      'foreign_keys_scanned', :recovery_foreign_keys_scanned::integer
    )::text) TO STDOUT;\n"""


def private_write(path, data):
    fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, 'wb') as stream:
        stream.write(data)


def run_restore(sql, attempt, runner=None):
    runner = runner or subprocess.run
    result = runner(['docker','exec','-i',prepare.CONTAINER,'psql','-X','-q','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-U','postgres','-d','postgres'],
                    input=sql.encode('utf-8'), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    private_write(attempt / 'psql.out.log', result.stdout)
    private_write(attempt / 'psql.err.log', result.stderr)
    if result.returncode:
        state = re.search(rb'(?:ERROR|FATAL):\s+([0-9A-Z]{5}):', result.stderr)
        report = {'status': 'failed', 'exit_code': result.returncode,
                  'sqlstate': state[1].decode() if state else None,
                  'category': backup.failure_category(result.stderr)}
    else:
        lines = result.stdout.decode('utf-8').splitlines()
        reports = [json.loads(line[len(VALIDATION_PREFIX):]) for line in lines if line.startswith(VALIDATION_PREFIX)]
        if len(reports) != 1:
            report = {'status': 'confirmation_missing', 'exit_code': 0}
        else:
            report = {'status': 'committed', **reports[0]}
    private_write(attempt / 'execution.json', json.dumps(report, indent=2).encode())
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backup', type=pathlib.Path, required=True)
    parser.add_argument('--plan', type=pathlib.Path, required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    folder, plan_folder = args.backup.resolve(), args.plan.resolve()
    files, summary, counts = validate_plan(folder, plan_folder)
    if not args.apply:
        print(json.dumps({'validated_only': True, 'tables': len(counts), 'rows': sum(counts.values())}))
        return
    attempt = plan_folder / ('execucao-' + uuid.uuid4().hex)
    attempt.mkdir(mode=0o700)
    report = run_restore(transaction_sql(files, counts), attempt)
    print(json.dumps(report))
    if report['status'] == 'failed':
        sys.exit('Restauracao nao confirmada. Nao repita a importacao antes de conferir o banco; preserve os logs privados na pasta de execucao.')
    if report['status'] != 'committed':
        sys.exit('O psql terminou sem o comprovante esperado. Nao repita a importacao; precisamos conferir o banco.')
    if report['tables_checked'] != len(counts) or report['rows_checked'] != sum(counts.values()):
        sys.exit('Comprovante divergente. Nao repita a importacao; precisamos conferir o banco.')
    print('Restauracao SQL local confirmada. Login e midias ainda precisam de teste.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError) as error:
        sys.exit(str(error))
    except Exception as error:
        sys.exit('Falha na execucao (' + type(error).__name__ + '); detalhes locais omitidos. Nao repita a importacao antes de conferir o estado do banco.')

"""Restore blobs into the exact local file backend without writing database rows.

Only the dedicated rehearsal containers and storage-api v1.84.19 are supported.
Existing files must match bytes and attributes; nothing is overwritten. No
object names, owners, keys, HTTP bodies or connection strings are printed.
"""
import argparse
import base64
import csv
import hashlib
import json
import os
import pathlib
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

import backup
import prepare_service_restore as prepare

STORAGE = 'supabase_storage_batcaverna-ensaio-v2'
IMAGE = 'public.ecr.aws/supabase/storage-api:v1.84.19'
API = 'http://127.0.0.1:54321'

# Layout and xattrs match storage v1.84.19's TenantLocation, withOptionalVersion
# and FileBackend. This helper is executed inside that image as its normal user.
NODE_HELPER = r'''
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const xattr = require('fs-xattr');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
function fail(code) { const e = new Error(); e.code = code; throw e; }
function validateConfig() {
  if (process.env.STORAGE_BACKEND !== 'file' ||
      (process.env.STORAGE_FILE_BACKEND_PATH || process.env.FILE_STORAGE_BACKEND_PATH) !== '/mnt' ||
      process.env.TENANT_ID !== 'stub' || process.env.GLOBAL_S3_BUCKET !== 'stub') fail('BACKEND_CONFIG');
  if (!['', 'false', 'true'].includes(process.env.TUS_USE_FILE_VERSION_SEPARATOR || '')) fail('VERSION_CONFIG');
}
function segment(s) {
  if (typeof s !== 'string' || !s || /[\x00\\/]/.test(s) || s === '.' || s === '..') fail('UNSAFE_PATH');
  return s;
}
function destination(item) {
  if (typeof item.name !== 'string' || !item.name || /[\x00\\]/.test(item.name) || item.name.startsWith('/')) fail('UNSAFE_PATH');
  const names = item.name.split('/');
  for (const n of names) segment(n);
  let relative = 'stub/stub/' + segment(item.bucket) + '/' + item.name;
  if (item.version !== null && item.version !== undefined && item.version !== '') {
    relative += (process.env.TUS_USE_FILE_VERSION_SEPARATOR === 'true' ? '-$v-' : '/') + segment(item.version);
  }
  const resolved = path.resolve('/mnt', relative);
  if (!resolved.startsWith('/mnt/')) fail('UNSAFE_PATH');
  let current = '/mnt';
  const parts = path.relative('/mnt', resolved).split(path.sep);
  const root = fs.lstatSync('/mnt');
  if (root.isSymbolicLink() || !root.isDirectory()) fail('UNSAFE_ROOT');
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    let stat;
    try { stat = fs.lstatSync(current); } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
    if (stat.isSymbolicLink()) fail('UNSAFE_LINK');
    if (i < parts.length - 1 && !stat.isDirectory()) fail('PATH_COLLISION');
    if (i === parts.length - 1 && !stat.isFile()) fail('PATH_COLLISION');
  }
  return resolved;
}
function attributes(item) {
  const result = {
    'user.supabase.content-type': item.mimetype || 'application/octet-stream',
    'user.supabase.cache-control': item.cacheControl || 'no-cache',
  };
  if (item.contentEncoding) result['user.supabase.content-encoding'] = item.contentEncoding;
  for (const value of Object.values(result)) {
    if (typeof value !== 'string' || value.length > 2048 || /[\x00-\x1f\x7f]/.test(value)) fail('INVALID_ATTRIBUTE');
  }
  return result;
}
function validateItem(item) {
  if (!Number.isSafeInteger(item.bytes) || item.bytes < 0 || item.bytes > 536870912 || !/^[a-f0-9]{64}$/.test(item.sha256)) fail('INVALID_INVENTORY');
  attributes(item);
}
function matches(file, item) {
  let stat;
  try { stat = fs.lstatSync(file); } catch (e) { if (e.code === 'ENOENT') return false; throw e; }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== item.bytes || hash(fs.readFileSync(file)) !== item.sha256) fail('EXISTING_FILE_DIFFERS');
  for (const [name, value] of Object.entries(attributes(item))) {
    let actual;
    try { actual = xattr.getAttributeSync(file, name).toString(); } catch (_) { fail('EXISTING_ATTRIBUTES_DIFFER'); }
    if (actual !== value) fail('EXISTING_ATTRIBUTES_DIFFER');
  }
  if (!item.contentEncoding) {
    try { xattr.getAttributeSync(file, 'user.supabase.content-encoding'); fail('EXISTING_ATTRIBUTES_DIFFER'); }
    catch (e) { if (!['ENODATA', 'ENOATTR'].includes(e.code)) throw e; }
  }
  return true;
}
function preflight(items) {
  let existing = 0;
  const paths = new Set();
  for (const item of items) {
    validateItem(item);
    const file = destination(item);
    if (paths.has(file)) fail('DUPLICATE_DESTINATION');
    paths.add(file);
    if (matches(file, item)) existing++;
  }
  for (const file of paths) {
    let parent = path.dirname(file);
    while (parent !== '/mnt') {
      if (paths.has(parent)) fail('PATH_COLLISION');
      parent = path.dirname(parent);
    }
  }
  return {ok:true, objects:items.length, existing};
}
function write(item) {
  validateItem(item);
  const file = destination(item);
  if (matches(file, item)) return {ok:true, written:false};
  const data = Buffer.from(item.data, 'base64');
  if (data.length !== item.bytes || hash(data) !== item.sha256) fail('INPUT_HASH_MISMATCH');
  fs.mkdirSync(path.dirname(file), {recursive:true, mode:0o750});
  destination(item); // Recheck components after directory creation.
  const temporary = path.join(path.dirname(file), '.batcaverna-' + crypto.randomUUID() + '.tmp');
  let createdTemporary = false;
  try {
    const fd = fs.openSync(temporary, 'wx', 0o640);
    createdTemporary = true;
    try {
      fs.writeFileSync(fd, data);
      for (const [key,value] of Object.entries(attributes(item))) xattr.setAttributeSync(temporary,key,value);
      fs.fsyncSync(fd);
    } finally { fs.closeSync(fd); }
    try { fs.linkSync(temporary, file); }
    catch (e) { if (e.code !== 'EEXIST' || !matches(file,item)) throw e; return {ok:true,written:false}; }
    fs.unlinkSync(temporary);
    createdTemporary = false;
    const parent = fs.openSync(path.dirname(file), 'r');
    try { fs.fsyncSync(parent); } finally { fs.closeSync(parent); }
    if (!matches(file,item)) fail('FINAL_HASH_MISMATCH');
    return {ok:true,written:true};
  } finally {
    if (createdTemporary) {
      try { fs.unlinkSync(temporary); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
  }
}
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    validateConfig();
    const payload = JSON.parse(input);
    let result;
    if (payload.action === 'preflight') result = preflight(payload.objects);
    else if (payload.action === 'write') result = write(payload.object);
    else fail('INVALID_ACTION');
    console.log(JSON.stringify(result));
  } catch (e) {
    console.log(JSON.stringify({ok:false,code:/^[A-Z_0-9]+$/.test(e.code || '') ? e.code : 'LOCAL_FILE_ERROR'}));
    process.exitCode = 1;
  }
});
'''


def local_command(args, data=None, env=None):
    try:
        result = subprocess.run(args, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120, env=env)
    except subprocess.TimeoutExpired:
        raise RuntimeError('A operacao local excedeu o tempo; nenhum detalhe privado foi exibido.') from None
    if result.returncode:
        raise RuntimeError('Falha na operacao local [' + backup.failure_category(result.stderr) + ']; saida omitida.')
    return result.stdout


def inspect_local():
    for name in (prepare.CONTAINER, STORAGE):
        info = json.loads(local_command(['docker','inspect',name]))[0]
        if not info['State']['Running'] or set(info['NetworkSettings']['Networks']) != {prepare.NETWORK}:
            raise ValueError('Os dois servicos com dados devem estar somente na rede interna do ensaio.')
        if name == STORAGE:
            if info['Config']['Image'] != IMAGE:
                raise ValueError('A ferramenta exige a imagem Storage v1.84.19 conferida.')
            settings = dict(value.split('=',1) for value in info['Config']['Env'] if '=' in value)
            if settings.get('STORAGE_BACKEND') != 'file' or settings.get('TENANT_ID') != 'stub' or settings.get('GLOBAL_S3_BUCKET') != 'stub' or (settings.get('STORAGE_FILE_BACKEND_PATH') or settings.get('FILE_STORAGE_BACKEND_PATH')) != '/mnt':
                raise ValueError('Configuracao de backend local diferente da conferida.')
            if not any(m['Type']=='volume' and m['Destination']=='/mnt' for m in info['Mounts']):
                raise ValueError('O diretorio de midias deve usar um volume Docker separado.')


def read_state():
    query = """SELECT json_build_object(
      'objects',COALESCE((SELECT json_agg(to_jsonb(o) ORDER BY bucket_id,name) FROM storage.objects o),'[]'::json),
      'buckets',COALESCE((SELECT json_agg(to_jsonb(b) ORDER BY id) FROM storage.buckets b),'[]'::json));"""
    return json.loads(local_command(['docker','exec','-i',prepare.CONTAINER,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],query.encode()))


def state_digest(state):
    # Reads may update access/derived update timestamps. Owners, ids, versions,
    # metadata and bucket privacy/configuration must remain identical.
    normalized = {kind:[{key:value for key,value in row.items() if key not in {'last_accessed_at','updated_at'}} for row in rows] for kind,rows in state.items()}
    return hashlib.sha256(json.dumps(normalized,sort_keys=True,separators=(',',':')).encode()).hexdigest()


def decode_copy(value):
    if value == b'\\N':
        return None
    result = bytearray()
    escapes = {ord('b'):8, ord('f'):12, ord('n'):10, ord('r'):13, ord('t'):9, ord('v'):11}
    i = 0
    while i < len(value):
        if value[i] != 92:
            result.append(value[i]); i += 1; continue
        i += 1
        if i == len(value):
            raise ValueError('Escape COPY incompleto nos metadados originais.')
        char = value[i]
        if char in escapes:
            result.append(escapes[char]); i += 1
        elif 48 <= char <= 55:
            end = i + 1
            while end < min(i+3,len(value)) and 48 <= value[end] <= 55: end += 1
            number = int(value[i:end],8)
            if number > 255: raise ValueError('Escape COPY fora do intervalo.')
            result.append(number); i = end
        elif char == ord('x') and i+1 < len(value) and value[i+1] in b'0123456789abcdefABCDEF':
            end = i+2
            if end < len(value) and value[end] in b'0123456789abcdefABCDEF': end += 1
            result.append(int(value[i+1:end],16)); i = end
        else:
            result.append(char); i += 1
    return result.decode('utf-8')


def original_objects(folder):
    wanted = {'id','bucket_id','name','version','owner','owner_id','metadata','user_metadata'}
    active, names, found, result = False, None, False, {}
    # COPY records are LF-delimited, not Unicode splitlines-delimited.
    for raw in (folder/'data.sql').read_bytes().split(b'\n'):
        raw = raw.removesuffix(b'\r')
        if active:
            if raw == b'\\.': active = False; names = None; continue
            if names is None: continue
            values = raw.split(b'\t')
            if len(values) != len(names): raise ValueError('Registro COPY original com numero de colunas divergente.')
            row = {name:decode_copy(value) for name,value in zip(names,values) if name in wanted}
            for name in ('metadata','user_metadata'):
                if row.get(name) is not None: row[name] = json.loads(row[name])
            key = (row['bucket_id'],row['name'])
            if key in result: raise ValueError('Objeto duplicado nos metadados originais.')
            result[key] = row
        elif raw.startswith(b'COPY '):
            match = prepare.COPY.match(raw.decode('utf-8'))
            if not match: raise ValueError('Cabecalho COPY nao reconhecido.')
            active = True
            if match.group(1,2) == ('storage','objects'):
                if found: raise ValueError('Secao de objetos duplicada no pacote.')
                found = True
                names = next(csv.reader([match[3]],skipinitialspace=True))
                if not {'id','bucket_id','name'}.issubset(names): raise ValueError('Identidade original de objetos ausente.')
            else: names = None
    if active or not found: raise ValueError('Metadados originais de objetos incompletos.')
    return result


def inventory(folder, manifest, state):
    index = json.loads((folder/'storage-index.json').read_text(encoding='utf-8-sig'))
    if len(index['objects']) != manifest['storage_objects']:
        raise ValueError('Contagem de midias divergente do manifesto.')
    rows = {(row['bucket_id'],row['name']):row for row in state['objects']}
    if len(rows) != len(state['objects']):
        raise ValueError('Identidade de objeto duplicada no banco.')
    originals = original_objects(folder)
    if set(originals) != set(rows):
        raise ValueError('Objetos do banco diferem da copia SQL original.')
    for key, original in originals.items():
        if any(rows[key].get(name) != value for name,value in original.items()):
            raise ValueError('Identidade, versao, proprietario ou metadados mudaram desde a restauracao SQL. Nenhum arquivo copiado.')
    buckets = {row['id']:row for row in state['buckets']}
    if set(buckets) != {row['id'] for row in index['buckets']}:
        raise ValueError('Buckets do banco nao correspondem ao inventario.')
    for row in index['buckets']:
        if buckets[row['id']]['public'] != row['public']:
            raise ValueError('Privacidade de bucket divergente do inventario.')
    expected = set()
    result = []
    for entry in index['objects']:
        key = (entry['bucket'],entry['name'])
        relative = pathlib.PurePosixPath(entry['file'])
        if key in expected or relative.parent.as_posix() != 'objects' or '\\' in entry['file'] or ':' in entry['file']:
            raise ValueError('Entrada de midia duplicada ou caminho invalido.')
        expected.add(key)
        if key not in rows:
            raise ValueError('Uma midia do inventario nao possui metadados restaurados.')
        source = folder.joinpath(*relative.parts)
        if source.is_symlink() or source.stat().st_size != entry['bytes'] or backup.digest(source) != entry['sha256']:
            raise ValueError('Bytes de midia divergentes do inventario.')
        row = rows[key]
        metadata = row.get('metadata') or {}
        if metadata.get('size') is not None and metadata['size'] != entry['bytes']:
            raise ValueError('Tamanho de midia divergente dos metadados do banco.')
        result.append({'bucket':entry['bucket'],'name':entry['name'],'version':row.get('version'),
                       'bytes':entry['bytes'],'sha256':entry['sha256'],'source':source,
                       'mimetype':metadata.get('mimetype') or metadata.get('contentType') or 'application/octet-stream',
                       'cacheControl':metadata.get('cacheControl') or 'no-cache',
                       'contentEncoding':metadata.get('contentEncoding')})
    if expected != set(rows):
        raise ValueError('O banco possui objetos ausentes do inventario.')
    return result


def node_call(payload):
    result = subprocess.run(['docker','exec','-i',STORAGE,'node','-e',NODE_HELPER], input=json.dumps(payload,ensure_ascii=False).encode(), stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=120)
    try:
        report = json.loads(result.stdout)
    except (ValueError,UnicodeError):
        raise RuntimeError('Falha no auxiliar de arquivos; saida privada omitida.') from None
    if result.returncode or report.get('ok') is not True:
        code = report.get('code','LOCAL_FILE_ERROR')
        if not isinstance(code,str) or not code.replace('_','').isalnum(): code='LOCAL_FILE_ERROR'
        raise RuntimeError('Falha no auxiliar de arquivos [' + code + ']. Nenhum arquivo existente foi sobrescrito.')
    return report


def public_item(item):
    return {key:value for key,value in item.items() if key != 'source'}


def service_key(base):
    cli = base/'ferramentas'/'supabase-2.122.0'/'supabase.exe'
    result = local_command([str(cli),'status','--workdir',str(base/'ensaio'),'-o','json'], env={**os.environ,'DO_NOT_TRACK':'1'})
    config = json.loads(result)
    key = config.get('SERVICE_ROLE_KEY')
    if not isinstance(key,str) or not key.startswith('eyJ'):
        raise ValueError('Chave de leitura administrativa local indisponivel; nao enviar chaves ao chat.')
    return key


def verify_buckets_api(state, key, opener=None):
    opener = opener or urllib.request.build_opener(urllib.request.ProxyHandler({}), backup.RejectStorageRedirects())
    request = urllib.request.Request(API + '/storage/v1/bucket', headers={'apikey':key, 'Authorization':'Bearer '+key})
    try:
        with opener.open(request, timeout=60) as response:
            if response.status != 200:
                raise RuntimeError('Leitura administrativa de buckets recusada; nenhum arquivo copiado.')
            buckets = json.load(response)
    except (urllib.error.HTTPError, urllib.error.URLError, ValueError):
        raise RuntimeError('Falha ao conferir buckets pela API local; nenhum arquivo copiado e detalhes omitidos.') from None
    expected = {row['id']:row['public'] for row in state['buckets']}
    if not isinstance(buckets,list) or len(buckets) != len(expected) or {row['id']:row['public'] for row in buckets} != expected:
        raise ValueError('Buckets ou privacidade da API diferem do banco restaurado.')


def verify_api(items, key, opener=None):
    opener = opener or urllib.request.build_opener(urllib.request.ProxyHandler({}),backup.RejectStorageRedirects())
    for ordinal,item in enumerate(items,1):
        path = '/storage/v1/object/authenticated/' + urllib.parse.quote(item['bucket'],safe='') + '/' + urllib.parse.quote(item['name'],safe='/')
        request = urllib.request.Request(API+path,headers={'apikey':key,'Authorization':'Bearer '+key})
        try:
            with opener.open(request,timeout=60) as response:
                if response.status != 200:
                    raise RuntimeError('Resposta administrativa inesperada no objeto ' + str(ordinal) + '.')
                digest, count = hashlib.sha256(), 0
                for block in iter(lambda:response.read(1048576),b''):
                    count += len(block)
                    if count > item['bytes']: raise ValueError('Download administrativo excedeu o tamanho do inventario.')
                    digest.update(block)
            if count != item['bytes'] or digest.hexdigest() != item['sha256']:
                raise ValueError('Hash do download administrativo divergente no objeto ' + str(ordinal) + '.')
        except urllib.error.HTTPError as error:
            raise RuntimeError('Download administrativo recusado no objeto ' + str(ordinal) + '; HTTP ' + str(error.code) + '. Corpo privado omitido.') from None
        except urllib.error.URLError:
            raise RuntimeError('Falha de conexao com a API exclusivamente local; detalhes omitidos.') from None
    return len(items)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backup',type=pathlib.Path,required=True)
    parser.add_argument('--apply',action='store_true')
    args = parser.parse_args()
    folder = args.backup.resolve()
    manifest = prepare.verify_folder(folder)
    inspect_local()
    before = read_state()
    items = inventory(folder,manifest,before)
    preflight = node_call({'action':'preflight','objects':[public_item(item) for item in items]})
    if not args.apply:
        print(json.dumps({'validated_only':True,'objects':len(items),'existing_matching':preflight['existing']}))
        return
    # Validate administrative-read credentials before writing any files.
    key = service_key(folder.parent)
    verify_buckets_api(before, key)
    written = 0
    for ordinal,item in enumerate(items,1):
        payload = public_item(item)
        payload['data'] = base64.b64encode(item['source'].read_bytes()).decode('ascii')
        report = node_call({'action':'write','object':payload})
        written += int(report['written'])
        if ordinal % 10 == 0 or ordinal == len(items): print('Arquivos conferidos: ' + str(ordinal) + '/' + str(len(items)),flush=True)
    if state_digest(before) != state_digest(read_state()):
        raise ValueError('Metadados do banco mudaram durante a copia. Interrompido antes dos testes de acesso.')
    verified = verify_api(items,key)
    if state_digest(before) != state_digest(read_state()):
        raise ValueError('Identidades, proprietarios ou configuracoes mudaram durante a verificacao.')
    print(json.dumps({'status':'verified','objects':len(items),'files_written':written,'existing_matching':preflight['existing'],
                      'admin_downloads_verified':verified,'metadata_preserved':True,'bucket_privacy_preserved':True}))
    print('Midias verificadas pela API administrativa local. O acesso de conta comum ainda precisa de teste.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError,RuntimeError) as error:
        sys.exit(str(error))
    except Exception as error:
        sys.exit('Falha na restauracao de midias (' + type(error).__name__ + '); detalhes locais omitidos. Nenhum arquivo existente foi sobrescrito.')

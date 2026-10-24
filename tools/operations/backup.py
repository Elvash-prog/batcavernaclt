"""Read-only Supabase export. Encrypts before any file leaves this computer.
Requires an authenticated, linked Supabase CLI, Docker, Python 3 and GnuPG.
Never uploads a backup. Never prints keys, SQL data or remote error bodies.
"""
import argparse,datetime,getpass,hashlib,json,os,pathlib,shutil,subprocess,tarfile,tempfile,urllib.request,urllib.parse,sys
PROJECT='luoqlhgfmixvfqbfcdoc'
ROOT=pathlib.Path(__file__).resolve().parents[2]

class RejectStorageRedirects(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,request,response,code,message,headers,new_url):
  # Administrative headers must never be forwarded to a redirect target.
  raise RuntimeError('Redirecionamento inesperado do Storage. Exportação interrompida sem reenviar credenciais.')

def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as source:
  for part in iter(lambda:source.read(1048576),b''):h.update(part)
 return h.hexdigest()

def failure_category(stderr):
 # Inspect locally, but emit only fixed labels; never interpolate remote text.
 message=stderr.decode('utf-8',errors='replace').lower()
 groups=[
  ('DB_AUTH',('password authentication failed','sasl authentication failed','sqlstate 28p01','no password supplied','wrong password')),
  ('DB_PERMISSION',('permission denied for','must be superuser','insufficient_privilege','sqlstate 42501')),
  ('DB_VERSION',('server version mismatch','aborting because of server version')),
  ('DOCKER_IMAGE',('failed to pull','pull access denied','manifest unknown','toomanyrequests','error response from daemon: denied')),
  ('DOCKER_DAEMON',('cannot connect to the docker daemon','is the docker daemon running','permission denied while trying to connect to the docker')),
  ('TLS',('certificate verify failed','certificate signed by unknown authority','ssl error','tls handshake')),
  ('NETWORK',('network is unreachable','connection refused','connection timed out','i/o timeout','no such host','could not translate host name','temporary failure in name resolution','context deadline exceeded','dial tcp')),
  ('API_PERMISSION',('unexpected login role','unauthorized','forbidden','status 401','status 403')),
  ('LOCAL_SPACE',('no space left on device',)),
 ]
 for category,patterns in groups:
  if any(pattern in message for pattern in patterns):return category
 return 'UNCLASSIFIED'

def call(args):
 executable=shutil.which(args[0])
 if not executable:raise RuntimeError('Executável indisponível: '+pathlib.Path(args[0]).name)
 result=subprocess.run([executable,*args[1:]],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 if result.returncode:raise RuntimeError('Falha em '+pathlib.Path(args[0]).name+' ['+failure_category(result.stderr)+']; codigo '+str(result.returncode)+'. A saída remota foi omitida para proteger credenciais.')
 return result.stdout

def encrypt_public(archive,encrypted,public_key,home):
 # CI receives only an armored public key. Never import a private key into it.
 armored=public_key.read_text(encoding='utf-8-sig').strip()
 if not armored.startswith('-----BEGIN PGP PUBLIC KEY BLOCK-----') or not armored.endswith('-----END PGP PUBLIC KEY BLOCK-----') or 'PRIVATE KEY BLOCK' in armored:
  raise ValueError('Forneça somente a chave pública ASCII do backup.')
 home.mkdir(mode=0o700)
 call(['gpg','--homedir',str(home),'--batch','--trust-model','always','--recipient-file',str(public_key),'--output',str(encrypted),'--encrypt',str(archive)])
 if not encrypted.is_file() or not encrypted.stat().st_size:raise RuntimeError('Criptografia não produziu um arquivo.')

def storage_export(folder,key,max_bytes):
 base='https://'+PROJECT+'.supabase.co/storage/v1';headers={'apikey':key,**({} if key.startswith('sb_secret_') else {'Authorization':'Bearer '+key})};used=0;index=[]
 opener=urllib.request.build_opener(RejectStorageRedirects())
 def request(path,body=None):
  request_headers=dict(headers)
  if body is not None:request_headers['Content-Type']='application/json'
  return opener.open(urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers=request_headers),timeout=60)
 def read_json(path,body=None):
  with request(path,body)as response:return json.load(response)
 buckets=read_json('/bucket');(folder/'objects').mkdir(parents=True)
 for bucket in buckets:
  name=bucket['id'];prefixes=['']
  while prefixes:
   prefix=prefixes.pop();offset=0
   while True:
    entries=read_json('/object/list/'+urllib.parse.quote(name,safe=''),{'prefix':prefix,'limit':100,'offset':offset,'sortBy':{'column':'name','order':'asc'}})
    if not isinstance(entries,list):raise RuntimeError('Listagem Storage inválida')
    for entry in entries:
     object_name=(prefix+'/' if prefix else '')+entry['name']
     if entry.get('id') is None:prefixes.append(object_name);continue
     filename=hashlib.sha256((name+'/'+object_name).encode()).hexdigest()+'.bin';target=folder/'objects'/filename
     with request('/object/authenticated/'+urllib.parse.quote(name,safe='')+'/'+urllib.parse.quote(object_name,safe='/'))as response,target.open('wb')as output:
      while True:
       chunk=response.read(65536)
       if not chunk:break
       used+=len(chunk)
       if used>max_bytes:raise RuntimeError('Storage excedeu o limite escolhido. Nenhuma cópia parcial será marcada como concluída.')
       output.write(chunk)
     index.append({'bucket':name,'name':object_name,'file':'objects/'+filename,'sha256':digest(target),'bytes':target.stat().st_size})
    if len(entries)<100:break
    offset+=len(entries)
 (folder/'storage-index.json').write_text(json.dumps({'buckets':buckets,'objects':index},ensure_ascii=False,indent=2),encoding='utf-8')
 return len(index)

def manifest(folder,objects):
 files=[{'path':p.relative_to(folder).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)}for p in sorted(folder.rglob('*'))if p.is_file() and p.name!='snapshot.json']
 result={'format':1,'project':PROJECT,'completed':True,'created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'storage_objects':objects,'files':files,'scope':'Supabase CLI roles/schema/data/history + Storage objects; custom auth/storage configuration and external secrets require the recovery runbook.'}
 (folder/'snapshot.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
 return result

def verify(archive):
 with tarfile.open(archive,'r:gz')as tar:
  members={}
  for member in tar.getmembers():
   path=pathlib.PurePosixPath(member.name)
   if path.is_absolute() or '..' in path.parts or member.issym() or member.islnk():raise ValueError('Caminho inseguro no backup')
   if member.isdir():continue
   if not member.isfile():raise ValueError('Tipo de arquivo inseguro no backup')
   name=path.as_posix().removeprefix('./')
   if name in members:raise ValueError('Arquivo duplicado')
   members[name]=member
  with tar.extractfile(members['snapshot.json'])as source:meta=json.load(source)
  if meta.get('format')!=1 or meta.get('completed') is not True or meta.get('project')!=PROJECT:raise ValueError('Manifesto inválido')
  expected={'snapshot.json'}
  for item in meta['files']:
   name=item['path']
   if name in expected:raise ValueError('Entrada duplicada no manifesto')
   expected.add(name);member=members[name]
   if member.size!=item['bytes']:raise ValueError('Tamanho inválido')
   h=hashlib.sha256()
   with tar.extractfile(member)as source:
    for chunk in iter(lambda:source.read(1048576),b''):h.update(chunk)
   if h.hexdigest()!=item['sha256']:raise ValueError('Backup corrompido')
  if set(members)!=expected:raise ValueError('Arquivo não inventariado')
  required={'roles.sql','schema.sql','data.sql','history_schema.sql','history_data.sql','managed_schema.sql','storage-index.json'}
  if not required.issubset(members):raise ValueError('Backup incompleto')
  with tar.extractfile(members['storage-index.json'])as source:index=json.load(source)
  if len(index['objects'])!=meta['storage_objects']:raise ValueError('Contagem Storage inválida')
  recorded={item['path']:item for item in meta['files']}
  identities=set();object_files=set()
  for item in index['objects']:
   identity=(item['bucket'],item['name']);filename=item['file']
   if identity in identities or filename in object_files:raise ValueError('Objeto Storage duplicado')
   if not isinstance(filename,str) or not filename.startswith('objects/') or pathlib.PurePosixPath(filename).parent.as_posix()!='objects':raise ValueError('Caminho Storage inválido')
   identities.add(identity);object_files.add(filename)
   saved=recorded[item['file']]
   if saved['sha256']!=item['sha256'] or saved['bytes']!=item['bytes']:raise ValueError('Objeto Storage inconsistente')
  if object_files!={name for name in recorded if name.startswith('objects/')}:raise ValueError('Objeto Storage não inventariado')
 return {'verified_files':len(meta['files']),'storage_objects':meta['storage_objects']}

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--output',type=pathlib.Path);parser.add_argument('--verify',type=pathlib.Path);parser.add_argument('--max-storage-mib',type=int,default=256);parser.add_argument('--recipient-file',type=pathlib.Path,help='Chave pública ASCII para criptografia desassistida; a recuperação será verificada separadamente.');args=parser.parse_args()
 if args.verify:print(json.dumps(verify(args.verify)));return
 if not args.output:parser.error('--output deve apontar para um arquivo .tar.gz.gpg fora do repositório')
 destination=args.output.expanduser().resolve()
 if destination==ROOT or ROOT in destination.parents:raise RuntimeError('Guarde o backup fora do repositório.')
 if destination.exists():raise RuntimeError('O destino já existe; escolha outro nome.')
 for command in ['supabase','docker','gpg']:
  if not shutil.which(command):raise RuntimeError('Instale '+command+' antes de continuar.')
 linked=ROOT/'supabase/.temp/project-ref'
 if not linked.exists() or linked.read_text().strip()!=PROJECT:raise RuntimeError('Autentique o CLI e vincule o projeto correto conforme docs/RECOVERY.md.')
 key=(os.environ.get('BATCAVERNA_BACKUP_SERVICE_KEY') or getpass.getpass('Chave sb_secret_ do Storage (entrada oculta; nunca envie no chat): ')).strip()
 if not key.startswith('sb_secret_') or any(c.isspace() for c in key):raise RuntimeError('É necessária uma chave administrativa, usada somente neste processo local.')
 destination.parent.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='batcaverna-backup-')as temp:
  private=pathlib.Path(temp);os.chmod(private,0o700);folder=private/'snapshot';folder.mkdir();os.chmod(folder,0o700)
  # No passwords are placed in argv: credentials come from the authenticated CLI session.
  jobs=[('roles.sql',['--role-only']),('schema.sql',[]),('managed_schema.sql',['--schema','auth,storage']),('data.sql',['--data-only','--use-copy','-x','storage.buckets_vectors,storage.vector_indexes']),('history_schema.sql',['--schema','supabase_migrations']),('history_data.sql',['--schema','supabase_migrations','--data-only','--use-copy'])]
  for filename,flags in jobs:
   print('Exportando '+filename+'...',flush=True)
   call(['supabase','db','dump','--linked','--file',str(folder/filename),*flags])
  print('Exportando objetos do Storage...',flush=True)
  count=storage_export(folder,key,args.max_storage_mib*1024*1024);key='';manifest(folder,count)
  archive=private/'snapshot.tar.gz'
  with tarfile.open(archive,'w:gz')as tar:
   for path in sorted(folder.iterdir()):tar.add(path,arcname=path.name)
  verified=verify(archive)
  print('Criptografando e verificando a cópia...',flush=True)
  encrypted=private/'snapshot.gpg'
  if args.recipient_file:
   encrypt_public(archive,encrypted,args.recipient_file.expanduser().resolve(),private/'gpg')
  else:
   subprocess.run(['gpg','--no-symkey-cache','--symmetric','--cipher-algo','AES256','--output',str(encrypted),str(archive)],check=True)
   # The operator confirms decryption locally before calling the export usable.
   restored=private/'verification.tar.gz'
   subprocess.run(['gpg','--no-symkey-cache','--output',str(restored),'--decrypt',str(encrypted)],check=True)
   verified=verify(restored)
  with destination.open('xb') as target,encrypted.open('rb') as source:shutil.copyfileobj(source,target)
 print(json.dumps({'encrypted_backup':str(destination),'sha256':digest(destination),'decryption_verified':not bool(args.recipient_file),**verified},ensure_ascii=False))

if __name__=='__main__':
 try:main()
 except KeyboardInterrupt:sys.exit('Cancelado; nenhum segredo foi exibido.')
 except Exception as error:sys.exit(str(error) if isinstance(error,(RuntimeError,ValueError)) else 'Falha no backup ('+type(error).__name__+'). A cópia não foi validada; nenhum detalhe remoto foi exibido.')

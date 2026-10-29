"""Optional Backblaze B2 copy of an already encrypted export.
Counts all file versions, keeps seven daily copies, and never deletes foreign files.
Full download verification is opt-in because B2 transfer has a separate allowance.
"""
import argparse,base64,datetime,hashlib,json,os,pathlib,re,sys,urllib.error,urllib.parse,urllib.request
PREFIX='batcaverna/'
MAX_BYTES=2_000_000_000
MAX_ARCHIVE_BYTES=512*1024*1024
KEEP=7
REQUIRED={'listBuckets','listFiles','readFiles','writeFiles','deleteFiles'}
FORBIDDEN={'writeKeys','deleteKeys','writeBuckets','deleteBuckets','bypassGovernance'}

def utcday():return datetime.datetime.now(datetime.timezone.utc).date().isoformat()
def safe_url(url):
 try:
  u=urllib.parse.urlsplit(url);port=u.port
 except ValueError:raise ValueError('Endpoint B2 inválido.') from None
 if u.scheme!='https' or u.username or u.password or port or not re.fullmatch(r'(?:(?:api[0-9]*|f[0-9]+)\.backblazeb2\.com|pod-[a-z0-9-]+\.backblaze\.com)',u.hostname or ''):raise ValueError('Endpoint B2 fora dos domínios esperados; credenciais não reenviadas.')
 if not u.path.startswith('/b2api/v4/'):raise ValueError('Caminho B2 inesperado.')
 return url
class NoRedirects(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):raise RuntimeError('Redirecionamento B2 recusado sem reenviar credenciais.')
class B2:
 def __init__(self,key_id,key,bucket_id,bucket_name,region,caps_confirmed=False):
  if not key_id or not key or any(c.isspace() for c in key_id+key):raise ValueError('Cadastre os dois secrets da chave de aplicação B2.')
  if not re.fullmatch(r'[a-f0-9]{6,64}',bucket_id or '') or not re.fullmatch(r'[A-Za-z0-9-]{6,63}',bucket_name or ''):raise ValueError('Configure o ID e o nome do bucket B2 dedicado.')
  if not re.fullmatch(r'(?:us-west|us-east|eu-central|ca-east)-[0-9]{3}',region or ''):raise ValueError('Configure a região B2 indicada no endpoint S3 da conta.')
  self.key_id=key_id;self.key=key;self.bucket_id=bucket_id;self.bucket_name=bucket_name;self.region=region;self.caps_confirmed=caps_confirmed
  self.token='';self.api='';self.download_url='';self.account='';self.opener=urllib.request.build_opener(NoRedirects())
 def request(self,url,method='POST',body=None,headers=None):
  safe_url(url)
  try:return self.opener.open(urllib.request.Request(url,data=body,method=method,headers=headers or {}),timeout=60)
  except (urllib.error.HTTPError,urllib.error.URLError,TimeoutError,ValueError,TypeError):raise RuntimeError('B2 recusou a operação ou está indisponível. Confira credenciais, limites e permissões; detalhes remotos omitidos.') from None
 def json(self,url,body=None,headers=None,method='POST'):
  h={'Content-Type':'application/json',**(headers or {'Authorization':self.token})}
  with self.request(url,method,None if body is None else json.dumps(body).encode(),h) as response:
   raw=response.read(2*1024*1024+1)
  if len(raw)>2*1024*1024:raise ValueError('Resposta B2 grande demais.')
  try:return json.loads(raw)
  except (ValueError,UnicodeError):raise ValueError('Resposta B2 inválida.') from None
 def api_call(self,operation,body):return self.json(self.api+'/b2api/v4/'+operation,body)
 def check(self):
  if not self.caps_confirmed:raise ValueError('Confirme os limites de gastos da conta B2 antes de ativar este destino.')
  basic=base64.b64encode((self.key_id+':'+self.key).encode()).decode()
  auth=self.json('https://api.backblazeb2.com/b2api/v4/b2_authorize_account',headers={'Authorization':'Basic '+basic},method='GET')
  storage=auth.get('apiInfo',{}).get('storageApi',{});allowed=storage.get('allowed',{});buckets=allowed.get('buckets')
  if not isinstance(buckets,list) or len(buckets)!=1 or buckets[0].get('id')!=self.bucket_id or buckets[0].get('name') not in (None,self.bucket_name) or allowed.get('namePrefix') not in (None,''):raise ValueError('Use uma chave restrita ao único bucket dedicado, sem restrição adicional de prefixo para permitir o inventário completo.')
  capabilities=set(allowed.get('capabilities',[]))
  if not REQUIRED.issubset(capabilities) or FORBIDDEN&capabilities:raise ValueError('A chave B2 precisa permitir ler, gravar, listar e apagar arquivos somente neste bucket, sem administrar buckets, chaves ou contornar retenção.')
  s3=urllib.parse.urlsplit(storage.get('s3ApiUrl',''))
  if s3.scheme!='https' or s3.netloc!='s3.'+self.region+'.backblazeb2.com':raise ValueError('A região real da conta B2 não corresponde à configurada.')
  self.api=storage.get('apiUrl','').rstrip('/');self.download_url=storage.get('downloadUrl','').rstrip('/')
  safe_url(self.api+'/b2api/v4/b2_list_buckets');safe_url(self.download_url+'/b2api/v4/b2_download_file_by_id')
  self.token=auth.get('authorizationToken','');self.account=auth.get('accountId','')
  if not self.token or not self.account:raise ValueError('A autorização B2 não retornou uma sessão válida.')
  result=self.api_call('b2_list_buckets',{'accountId':self.account,'bucketId':self.bucket_id})
  items=result.get('buckets',[])
  if len(items)!=1 or items[0].get('bucketId')!=self.bucket_id or items[0].get('bucketName')!=self.bucket_name or items[0].get('bucketType')!='allPrivate':raise ValueError('O destino B2 não é o bucket privado esperado.')
  files=self.inventory()
  if sum(self.size(f) for f in files)>MAX_BYTES:raise ValueError('O bucket B2 já excede o limite local de 2 GB; revise o armazenamento antes de ativar envios.')
  return {'private_bucket_checked':True,'region':self.region,'stored_bytes_all_versions':sum(self.size(f) for f in files),'budget_bytes':MAX_BYTES,'daily_copies':len(self.daily(files)), 'cost_caps_confirmed_by_owner':True}
 def inventory(self):
  records=[];cursor=None;seen=set()
  for page in range(20):
   body={'bucketId':self.bucket_id,'maxFileCount':1000}
   if cursor:body.update(startFileName=cursor[0],startFileId=cursor[1])
   data=self.api_call('b2_list_file_versions',body);rows=data.get('files')
   if not isinstance(rows,list):raise ValueError('Inventário B2 inválido.')
   for row in rows:
    if row.get('action') not in ('upload','hide'):raise ValueError('Há uploads incompletos ou objetos inesperados no bucket; confira o armazenamento antes de prosseguir.')
    file_id=row.get('fileId')
    if row.get('bucketId')!=self.bucket_id:raise ValueError('Inventário B2 retornou um bucket inesperado.')
    if not isinstance(file_id,str) or not file_id or file_id in seen:raise ValueError('Inventário B2 contém versões inválidas ou duplicadas.')
    seen.add(file_id);self.size(row);records.append(row)
   if data.get('nextFileName') is None:return records
   cursor=(data['nextFileName'],data.get('nextFileId'))
   if not cursor[1]:raise ValueError('Paginação B2 incompleta.')
  raise ValueError('Inventário B2 excede o limite de segurança; nenhum novo arquivo foi enviado.')
 @staticmethod
 def size(row):
  size=row.get('contentLength')
  if type(size) is not int or size<0:raise ValueError('Tamanho de versão B2 inválido.')
  return size
 @staticmethod
 def managed(row):
  if row.get('action')!='upload' or row.get('serverSideEncryption',{}).get('mode')!='SSE-B2' or row.get('serverSideEncryption',{}).get('algorithm')!='AES256':return False
  match=re.fullmatch(re.escape(PREFIX)+r'([0-9]{4}-[0-9]{2}-[0-9]{2})/([a-f0-9]{64})\.tar\.gz\.gpg',row.get('fileName',''))
  if not match:return False
  try:
   if datetime.date.fromisoformat(match[1])>datetime.date.fromisoformat(utcday()):return False
  except ValueError:return False
  info=row.get('fileInfo',{})
  return info.get('backup-format')=='gpg-public-v1' and info.get('backup-date')==match[1] and info.get('backup-sha256')==match[2] and info.get('backup-sha1')==row.get('contentSha1') and info.get('backup-bytes')==str(B2.size(row)) and bool(re.fullmatch('[a-f0-9]{40}',row.get('contentSha1',''))) and 32<B2.size(row)<=MAX_ARCHIVE_BYTES
 @staticmethod
 def daily(files):
  result={}
  for row in files:
   if not B2.managed(row):continue
   day=row['fileInfo']['backup-date'];old=result.get(day)
   if old is None or (row.get('uploadTimestamp',0),row['fileId'])>(old.get('uploadTimestamp',0),old['fileId']):result[day]=row
  return result
 def prune(self,files):
  days=self.daily(files);keep={days[day]['fileId'] for day in sorted(days,reverse=True)[:KEEP]}
  if not keep:return 0
  # A version is removed only if the retained, checksum-confirmed copies exist.
  removed=0
  for row in files:
   if self.managed(row) and row['fileId'] not in keep:
    deleted=self.api_call('b2_delete_file_version',{'fileId':row['fileId'],'fileName':row['fileName']})
    if deleted.get('fileId')!=row['fileId'] or deleted.get('fileName')!=row['fileName']:raise ValueError('A remoção de uma versão antiga não foi confirmada pelo B2.')
    removed+=1
  return removed
 def validate_file(self,row,sha256,sha1,size,name=None):
  if row.get('serverSideEncryption',{}).get('mode')!='SSE-B2' or row.get('serverSideEncryption',{}).get('algorithm')!='AES256':raise ValueError('A criptografia adicional do arquivo no B2 não foi confirmada.')
  if not self.managed(row) or row.get('bucketId')!=self.bucket_id or self.size(row)!=size or row['contentSha1']!=sha1 or row['fileInfo']['backup-sha256']!=sha256 or name is not None and row['fileName']!=name:raise ValueError('A versão B2 não corresponde ao pacote criptografado enviado.')
 def verify_download(self,row):
  sha=hashlib.sha256();count=0
  with self.request(self.download_url+'/b2api/v4/b2_download_file_by_id?'+urllib.parse.urlencode({'fileId':row['fileId']}),'GET',headers={'Authorization':self.token}) as response:
   while True:
    chunk=response.read(65536)
    if not chunk:break
    count+=len(chunk)
    if count>self.size(row):raise ValueError('Download B2 excedeu o tamanho esperado.')
    sha.update(chunk)
  if count!=self.size(row) or sha.hexdigest()!=row['fileInfo']['backup-sha256']:raise ValueError('O download B2 não corresponde ao hash do backup.')
 def upload(self,path,verify_download=False):
  path=pathlib.Path(path)
  if not path.name.endswith('.tar.gz.gpg') or not path.is_file() or not 32<path.stat().st_size<=MAX_ARCHIVE_BYTES:raise ValueError('Use somente o pacote .tar.gz.gpg do exportador, até 512 MiB.')
  with path.open('rb') as source:first=source.read(1)[0]
  if not first&128 or ((first&63) if first&64 else ((first>>2)&15))!=1:raise ValueError('O pacote não começa com um cabeçalho GPG de chave pública; envio recusado.')
  sha256=hashlib.sha256();sha1=hashlib.sha1()
  with path.open('rb') as source:
   for chunk in iter(lambda:source.read(1024*1024),b''):sha256.update(chunk);sha1.update(chunk)
  digest=sha256.hexdigest();short=sha1.hexdigest();size=path.stat().st_size;today=utcday();name=PREFIX+today+'/'+digest+'.tar.gz.gpg'
  files=self.inventory();days=self.daily(files)
  # One copy per UTC day, even if a manual rerun creates a different GPG envelope.
  existing=days.get(today)
  skipped=existing is not None
  if existing:
   row=self.api_call('b2_get_file_info',{'fileId':existing['fileId']});self.validate_file(row,existing['fileInfo']['backup-sha256'],existing['contentSha1'],self.size(existing),existing['fileName'])
  else:
   if sum(self.size(f) for f in files)+size>MAX_BYTES:raise ValueError('O bucket B2 atingiria o limite local de 2 GB. Nenhum upload novo foi iniciado; o backup do Drive permanece separado.')
   info=self.api_call('b2_get_upload_url',{'bucketId':self.bucket_id})
   if info.get('bucketId')!=self.bucket_id or not info.get('authorizationToken'):raise ValueError('Autorização de upload B2 inválida.')
   headers={'Authorization':info['authorizationToken'],'Content-Type':'application/octet-stream','Content-Length':str(size),'X-Bz-File-Name':urllib.parse.quote(name,safe=''),'X-Bz-Content-Sha1':short,'X-Bz-Info-backup-format':'gpg-public-v1','X-Bz-Info-backup-date':today,'X-Bz-Info-backup-sha256':digest,'X-Bz-Info-backup-sha1':short,'X-Bz-Info-backup-bytes':str(size),'X-Bz-Server-Side-Encryption':'AES256'}
   with path.open('rb') as source:row=self.json_upload(info['uploadUrl'],source,headers)
   self.validate_file(row,digest,short,size,name)
   row=self.api_call('b2_get_file_info',{'fileId':row['fileId']});self.validate_file(row,digest,short,size,name)
  if verify_download:self.verify_download(row)
  files=self.inventory();removed=self.prune(files);files=self.inventory()
  return {'region':self.region,'uploaded_bytes':self.size(row),'stored_bytes_all_versions':sum(self.size(f) for f in files),'daily_copies':len(self.daily(files)),'versions_removed':removed,'already_present_today':skipped,'upload_checksum_verified':True,'download_verified':verify_download,'decryption_verified':False,'sha256':row['fileInfo']['backup-sha256']}
 def json_upload(self,url,source,headers):
  with self.request(url,'POST',source,headers) as response:raw=response.read(2*1024*1024+1)
  if len(raw)>2*1024*1024:raise ValueError('Resposta de upload B2 inválida.')
  try:return json.loads(raw)
  except (ValueError,UnicodeError):raise ValueError('Resposta de upload B2 inválida.') from None

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--archive',type=pathlib.Path);parser.add_argument('--check-only',action='store_true');parser.add_argument('--verify-download',action='store_true');args=parser.parse_args()
 client=B2(os.environ.get('B2_BACKUP_KEY_ID',''),os.environ.get('B2_BACKUP_APPLICATION_KEY',''),os.environ.get('BACKUP_B2_BUCKET_ID',''),os.environ.get('BACKUP_B2_BUCKET_NAME',''),os.environ.get('BACKUP_B2_REGION',''),os.environ.get('BACKUP_B2_CAPS_CONFIRMED')=='true');checked=client.check()
 if args.check_only:print(json.dumps(checked));return
 if not args.archive:parser.error('Escolha --archive ou --check-only.')
 print(json.dumps(client.upload(args.archive,args.verify_download)))
if __name__=='__main__':
 try:main()
 except KeyboardInterrupt:sys.exit('Cancelado sem exibir credenciais.')
 except (ValueError,RuntimeError) as error:sys.exit(str(error))
 except Exception:sys.exit('Falha na cópia B2; detalhes remotos omitidos. Confira separadamente a cópia do Drive.')

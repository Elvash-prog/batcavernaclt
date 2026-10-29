"""Upload only GPG-encrypted exports to the configured private Sao Paulo bucket.
Uses the AWS CLI credential chain (GitHub OIDC in automation), never static keys.
Does not create resources, delete objects, or read plaintext backup contents.
"""
import argparse,base64,datetime,hashlib,json,os,pathlib,re,shutil,subprocess,sys,tempfile
REGION='sa-east-1'
class AwsFailure(RuntimeError):
 def __init__(self,operation,conflict=False):
  super().__init__('Falha na operação AWS '+operation+'. Detalhes remotos omitidos.');self.conflict=conflict
class Aws:
 def __init__(self,bucket,account):
  if not re.fullmatch(r'[0-9]{12}',account or ''):raise ValueError('Configure BACKUP_AWS_ACCOUNT_ID com os 12 dígitos da conta AWS.')
  if not re.fullmatch(r'batcaverna-backups-'+account+r'-sa-east-1',bucket or ''):raise ValueError('Use o bucket privado criado pelo template de backup em São Paulo.')
  self.bucket=bucket;self.account=account
 def run(self,operation,*arguments):
  cli=shutil.which('aws')
  if not cli:raise RuntimeError('AWS CLI indisponível.')
  service,command=operation.split(':')
  args=[cli,service,command,'--region',REGION,'--output','json','--no-cli-pager']
  if service=='s3api':args+=['--bucket',self.bucket,'--expected-bucket-owner',self.account]
  result=subprocess.run([*args,*arguments],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
  if result.returncode:raise AwsFailure(operation,b'PreconditionFailed' in result.stderr or b'(412)' in result.stderr)
  try:return json.loads(result.stdout or b'{}')
  except (ValueError,UnicodeError):raise RuntimeError('Resposta AWS inválida; operação não validada.') from None
 def check(self):
  if self.run('sts:get-caller-identity').get('Account')!=self.account:raise ValueError('A conexão AWS pertence a outra conta.')
  if self.run('s3api:get-bucket-location').get('LocationConstraint')!=REGION:raise ValueError('O bucket não está na região São Paulo (sa-east-1).')
  access=self.run('s3api:get-public-access-block').get('PublicAccessBlockConfiguration',{})
  if not all(access.get(k) is True for k in ['BlockPublicAcls','IgnorePublicAcls','BlockPublicPolicy','RestrictPublicBuckets']):raise ValueError('O bloqueio de acesso público precisa estar integralmente ativado.')
  ownership=self.run('s3api:get-bucket-ownership-controls').get('OwnershipControls',{}).get('Rules',[])
  if not any(v.get('ObjectOwnership')=='BucketOwnerEnforced' for v in ownership):raise ValueError('O bucket precisa recusar ACLs externas.')
  if self.run('s3api:get-bucket-versioning').get('Status')!='Enabled':raise ValueError('O histórico de versões está desativado.')
  lock=self.run('s3api:get-object-lock-configuration').get('ObjectLockConfiguration',{})
  retention=lock.get('Rule',{}).get('DefaultRetention',{})
  if lock.get('ObjectLockEnabled')!='Enabled' or retention.get('Mode')!='GOVERNANCE' or retention.get('Days')!=7:raise ValueError('O bucket precisa proteger as cópias por sete dias no modo Governance.')
  rules=self.run('s3api:get-bucket-encryption').get('ServerSideEncryptionConfiguration',{}).get('Rules',[])
  if not any(v.get('ApplyServerSideEncryptionByDefault',{}).get('SSEAlgorithm')=='AES256' for v in rules):raise ValueError('A criptografia padrão esperada do S3 não está ativada.')
  return {'region':REGION,'private_bucket_checked':True,'retention_days':7}
 def upload(self,path):
  path=pathlib.Path(path)
  if not path.name.endswith('.tar.gz.gpg') or not path.is_file() or not 32<path.stat().st_size<=5*1024**3:raise ValueError('Forneça somente o pacote .tar.gz.gpg produzido pelo exportador (até 5 GiB).')
  with path.open('rb') as f:
   first=f.read(1)[0]
  tag=(first&63) if first&64 else ((first>>2)&15)
  if not first&128 or tag!=1:raise ValueError('O arquivo não começa com um pacote GPG de chave pública. Nenhum envio foi iniciado.')
  digest=hashlib.sha256()
  with path.open('rb') as f:
   for chunk in iter(lambda:f.read(1024*1024),b''):digest.update(chunk)
  sha=digest.hexdigest();checksum=base64.b64encode(digest.digest()).decode()
  key='backups/'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y/%m/%d/')+sha+'.tar.gz.gpg'
  # A conditional creation cannot replace an existing version; retry verifies it.
  try:self.run('s3api:put-object','--key',key,'--body',str(path),'--server-side-encryption','AES256','--checksum-algorithm','SHA256','--checksum-sha256',checksum,'--metadata','sha256='+sha,'--if-none-match','*')
  except AwsFailure as error:
   if not error.conflict:raise
  head=self.run('s3api:head-object','--key',key)
  if not head.get('VersionId') or head.get('ContentLength')!=path.stat().st_size or head.get('Metadata',{}).get('sha256')!=sha or head.get('ServerSideEncryption')!='AES256':raise ValueError('O objeto recebido não corresponde ao pacote enviado.')
  version=head['VersionId'];lock=self.run('s3api:get-object-retention','--key',key,'--version-id',version).get('Retention',{})
  try:until=datetime.datetime.fromisoformat(lock.get('RetainUntilDate','').replace('Z','+00:00'))
  except ValueError:raise ValueError('Prazo de proteção do objeto inválido.') from None
  if lock.get('Mode')!='GOVERNANCE' or until<datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(days=7,minutes=-10):raise ValueError('A cópia não recebeu a proteção de sete dias esperada.')
  # Verify the precise version uploaded, not a mutable latest pointer.
  with tempfile.TemporaryDirectory(prefix='batcaverna-s3-verify-') as folder:
   target=pathlib.Path(folder)/'ciphertext.gpg'
   self.run('s3api:get-object','--key',key,'--version-id',version,str(target))
   restored=hashlib.sha256()
   with target.open('rb') as f:
    for chunk in iter(lambda:f.read(1024*1024),b''):restored.update(chunk)
   if target.stat().st_size!=path.stat().st_size or restored.hexdigest()!=sha:raise ValueError('A conferência do download S3 falhou; a cópia não foi validada.')
  return {'region':REGION,'object_key':key,'version_id':version,'sha256':sha,'download_verified':True,'decryption_verified':False}
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--archive',type=pathlib.Path);parser.add_argument('--check-only',action='store_true');args=parser.parse_args()
 client=Aws(os.environ.get('BACKUP_S3_BUCKET',''),os.environ.get('BACKUP_AWS_ACCOUNT_ID',''));checked=client.check()
 if args.check_only:print(json.dumps(checked));return
 if not args.archive:parser.error('Use --archive ou --check-only.')
 print(json.dumps(client.upload(args.archive)))
if __name__=='__main__':
 try:main()
 except KeyboardInterrupt:sys.exit('Cancelado; nenhum segredo exibido.')
 except (ValueError,RuntimeError) as error:sys.exit(str(error))
 except Exception:sys.exit('Falha no backup S3; a cópia não foi validada. Detalhes remotos omitidos.')

import datetime,hashlib,json,pathlib,sys,tempfile,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import s3_backup as backup
ACCOUNT='123456789012';BUCKET='batcaverna-backups-'+ACCOUNT+'-sa-east-1'
class Fake(backup.Aws):
 def __init__(self):super().__init__(BUCKET,ACCOUNT);self.calls=[];self.remote=b'';self.corrupt=False;self.expired=False;self.conflict=False;self.overrides={}
 def run(self,operation,*arguments):
  self.calls.append((operation,arguments))
  if operation in self.overrides:return self.overrides[operation]
  if operation=='sts:get-caller-identity':return {'Account':ACCOUNT}
  if operation=='s3api:get-bucket-location':return {'LocationConstraint':'sa-east-1'}
  if operation=='s3api:get-public-access-block':return {'PublicAccessBlockConfiguration':{k:True for k in ['BlockPublicAcls','IgnorePublicAcls','BlockPublicPolicy','RestrictPublicBuckets']}}
  if operation=='s3api:get-bucket-ownership-controls':return {'OwnershipControls':{'Rules':[{'ObjectOwnership':'BucketOwnerEnforced'}]}}
  if operation=='s3api:get-bucket-versioning':return {'Status':'Enabled'}
  if operation=='s3api:get-object-lock-configuration':return {'ObjectLockConfiguration':{'ObjectLockEnabled':'Enabled','Rule':{'DefaultRetention':{'Mode':'GOVERNANCE','Days':7}}}}
  if operation=='s3api:get-bucket-encryption':return {'ServerSideEncryptionConfiguration':{'Rules':[{'ApplyServerSideEncryptionByDefault':{'SSEAlgorithm':'AES256'}}]}}
  if operation=='s3api:put-object':
   if self.conflict:raise backup.AwsFailure(operation,True)
   self.remote=pathlib.Path(arguments[arguments.index('--body')+1]).read_bytes();return {}
  if operation=='s3api:head-object':return {'VersionId':'synthetic-version','ContentLength':len(self.remote),'Metadata':{'sha256':hashlib.sha256(self.remote).hexdigest()},'ServerSideEncryption':'AES256'}
  if operation=='s3api:get-object-retention':return {'Retention':{'Mode':'GOVERNANCE','RetainUntilDate':(datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(days=0 if self.expired else 7)).isoformat()}}
  if operation=='s3api:get-object':
   assert arguments[arguments.index('--version-id')+1]=='synthetic-version'
   pathlib.Path(arguments[-1]).write_bytes(self.remote+(b'bad' if self.corrupt else b''));return {}
  raise AssertionError(operation)
class S3Tests(unittest.TestCase):
 def test_wrong_account_region_or_public_bucket_prevents_upload(self):
  for operation,response in [('sts:get-caller-identity',{'Account':'999999999999'}),('s3api:get-bucket-location',{'LocationConstraint':'us-east-1'}),('s3api:get-public-access-block',{'PublicAccessBlockConfiguration':{}}),('s3api:get-bucket-versioning',{'Status':'Suspended'}),('s3api:get-object-lock-configuration',{}),('s3api:get-bucket-ownership-controls',{}),('s3api:get-bucket-encryption',{})]:
   with self.subTest(operation=operation):
    client=Fake();client.overrides[operation]=response
    with self.assertRaises(ValueError):client.check()
    self.assertFalse(any(op=='s3api:put-object' for op,args in client.calls))
 def test_upload_checks_exact_download_version_and_retention(self):
  with tempfile.TemporaryDirectory() as folder:
   path=pathlib.Path(folder)/'synthetic.tar.gz.gpg';path.write_bytes(b'\x85'+b'ciphertext-fixture'*8)
   client=Fake();self.assertTrue(client.check()['private_bucket_checked']);result=client.upload(path)
   self.assertTrue(result['download_verified']);self.assertFalse(result['decryption_verified'])
   put=next(args for op,args in client.calls if op=='s3api:put-object');self.assertEqual(put[put.index('--if-none-match')+1],'*')
   client.conflict=True;self.assertEqual(client.upload(path)['object_key'],result['object_key'])
   client.corrupt=True
   with self.assertRaises(ValueError):client.upload(path)
   client.corrupt=False;client.expired=True
   with self.assertRaises(ValueError):client.upload(path)
 def test_rejects_plaintext_and_invalid_target(self):
  with tempfile.TemporaryDirectory() as folder:
   path=pathlib.Path(folder)/'database.tar.gz.gpg';path.write_bytes(b'CREATE TABLE private_users (secret text);')
   client=Fake()
   with self.assertRaises(ValueError):client.upload(path)
   self.assertFalse(client.calls)
  for bucket in ['public-downloads','https://example.test/bucket','batcaverna-backups-999999999999-sa-east-1']:
   with self.assertRaises(ValueError):backup.Aws(bucket,ACCOUNT)
 def test_cloudformation_limits_github_role_to_main_and_keeps_bucket_private(self):
  data=json.loads(pathlib.Path(__file__).with_name('backup-s3-stack.json').read_text());resources=data['Resources'];bucket=resources['BackupBucket'];props=bucket['Properties'];self.assertEqual(bucket['DeletionPolicy'],'Retain');self.assertEqual(bucket['UpdateReplacePolicy'],'Retain');self.assertTrue(all(props['PublicAccessBlockConfiguration'].values()));self.assertTrue(props['ObjectLockEnabled']);self.assertNotIn('ReplicationConfiguration',props)
  role=resources['BackupRole']['Properties'];subject=role['AssumeRolePolicyDocument']['Statement'][0]['Condition']['StringEquals']['token.actions.githubusercontent.com:sub'];self.assertEqual(subject,'repo:Elvash-prog/batcavernaclt:ref:refs/heads/main')
  actions=[action for policy in role['Policies'] for statement in policy['PolicyDocument']['Statement'] for action in statement['Action']];self.assertIn('s3:GetObjectVersion',actions);self.assertNotIn('s3:DeleteObject',actions);self.assertNotIn('s3:BypassGovernanceRetention',actions);self.assertNotIn('*',actions)
 def test_cli_does_not_echo_credentials_or_remote_error_text(self):
  class Reply:returncode=1;stdout=b'';stderr=b'Synthetic secret and full remote payload'
  with patch('s3_backup.shutil.which',return_value='/usr/bin/aws'),patch('s3_backup.subprocess.run',return_value=Reply()) as run:
   with self.assertRaisesRegex(backup.AwsFailure,'Detalhes remotos omitidos') as error:backup.Aws(BUCKET,ACCOUNT).run('s3api:get-bucket-location')
   self.assertNotIn('Synthetic secret',str(error.exception));args=run.call_args.args[0];self.assertIn('--expected-bucket-owner',args);self.assertIn('sa-east-1',args)
if __name__=='__main__':unittest.main()

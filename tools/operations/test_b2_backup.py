import copy,datetime,hashlib,io,json,pathlib,sys,tempfile,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).parent))
import b2_backup as b2
BUCKET='abcdef123456abcdef123456';TODAY='2026-10-29'
def fixture(day,sequence=1,data=None):
 data=data or b'\x85'+bytes([sequence])*100;sha=hashlib.sha256(data).hexdigest();one=hashlib.sha1(data).hexdigest()
 return {'bucketId':BUCKET,'fileId':'id-'+day+'-'+str(sequence),'action':'upload','serverSideEncryption':{'mode':'SSE-B2','algorithm':'AES256'},'fileName':'batcaverna/'+day+'/'+sha+'.tar.gz.gpg','contentLength':len(data),'contentSha1':one,'uploadTimestamp':sequence,'fileInfo':{'backup-format':'gpg-public-v1','backup-date':day,'backup-sha256':sha,'backup-sha1':one,'backup-bytes':str(len(data))}}
class Fake(b2.B2):
 def __init__(self,files=None):
  super().__init__('test-key-id','synthetic-app-key',BUCKET,'batcaverna-private-backups','eu-central-003',True)
  self.files=copy.deepcopy(files or []);self.calls=[];self.payloads={};self.fail_upload=False;self.bad_upload=False;self.bad_download=False;self.fail_delete=False;self.overrides={};self.auth={'authorizationToken':'synthetic-token','accountId':'test-account','apiInfo':{'storageApi':{'apiUrl':'https://api001.backblazeb2.com','downloadUrl':'https://f001.backblazeb2.com','s3ApiUrl':'https://s3.eu-central-003.backblazeb2.com','allowed':{'buckets':[{'id':BUCKET,'name':self.bucket_name}],'capabilities':sorted(b2.REQUIRED),'namePrefix':None}}}}
 def json(self,*args,**kwargs):return copy.deepcopy(self.auth)
 def api_call(self,operation,body):
  self.calls.append((operation,body))
  if operation in self.overrides:return self.overrides[operation]
  if operation=='b2_list_buckets':return {'buckets':[{'bucketId':BUCKET,'bucketName':self.bucket_name,'bucketType':'allPrivate'}]}
  if operation=='b2_list_file_versions':return {'files':copy.deepcopy(self.files),'nextFileName':None,'nextFileId':None}
  if operation=='b2_get_file_info':return copy.deepcopy(next(f for f in self.files if f['fileId']==body['fileId']))
  if operation=='b2_get_upload_url':return {'bucketId':BUCKET,'authorizationToken':'synthetic-upload-token','uploadUrl':'https://pod-000-1000-00.backblaze.com/b2api/v4/b2_upload_file/test'}
  if operation=='b2_delete_file_version':
   if self.fail_delete:raise RuntimeError('Delete blocked')
   self.files=[f for f in self.files if f['fileId']!=body['fileId']];return body
  raise AssertionError(operation)
 def json_upload(self,url,source,headers):
  self.calls.append(('upload',headers))
  if self.fail_upload:raise RuntimeError('Upload failed')
  data=source.read();row=fixture(TODAY,99,data);self.payloads[row['fileId']]=data
  if self.bad_upload:row['contentSha1']='0'*40
  self.files.append(row);return row
 def request(self,url,method='POST',body=None,headers=None):
  self.calls.append(('download',url));file_id=b2.urllib.parse.parse_qs(b2.urllib.parse.urlsplit(url).query)['fileId'][0];return io.BytesIO(self.payloads[file_id]+(b'bad' if self.bad_download else b''))
class B2Tests(unittest.TestCase):
 def setUp(self):self.clock=patch('b2_backup.utcday',return_value=TODAY);self.clock.start();self.addCleanup(self.clock.stop)
 def archive(self,folder):
  p=pathlib.Path(folder)/'synthetic.tar.gz.gpg';p.write_bytes(b'\x85'+b'encrypted-fixture'*10);return p
 def test_authorization_rejects_master_wrong_region_and_public_bucket(self):
  for case in ['master','another-bucket','public','region','prefix','caps','missing-permission']:
   with self.subTest(case=case):
    client=Fake();storage=client.auth['apiInfo']['storageApi']
    if case=='master':storage['allowed']['buckets']=None
    if case=='another-bucket':storage['allowed']['buckets'][0]['id']='other'
    if case=='public':client.overrides['b2_list_buckets']={'buckets':[{'bucketId':BUCKET,'bucketName':client.bucket_name,'bucketType':'allPublic'}]}
    if case=='region':storage['s3ApiUrl']='https://s3.us-west-004.backblazeb2.com'
    if case=='prefix':storage['allowed']['namePrefix']='partial/'
    if case=='caps':client.caps_confirmed=False
    if case=='missing-permission':storage['allowed']['capabilities']=[]
    with self.assertRaises(ValueError):client.check()
    self.assertFalse(any(op=='upload' for op,body in client.calls))
 def test_optional_bucket_name_is_confirmed_by_private_bucket_lookup(self):
  client=Fake();client.auth['apiInfo']['storageApi']['allowed']['buckets'][0]['name']=None
  self.assertTrue(client.check()['private_bucket_checked'])
 def test_transport_errors_do_not_echo_authorization_tokens(self):
  from unittest.mock import Mock
  client=b2.B2('id','synthetic-key',BUCKET,'batcaverna-private-backups','eu-central-003',True)
  client.opener=Mock();client.opener.open.side_effect=ValueError('Invalid header: sensitive-token')
  with self.assertRaises(RuntimeError) as error:client.request('https://api001.backblazeb2.com/b2api/v4/test',headers={'Authorization':'sensitive-token'})
  self.assertNotIn('sensitive-token',str(error.exception))
 def test_rotation_preserves_seven_daily_copies_and_does_not_touch_foreign_files(self):
  old=[fixture('2026-10-'+str(day)) for day in range(20,29)];foreign={'bucketId':BUCKET,'fileId':'foreign','fileName':'owner-do-not-delete.txt','action':'upload','contentLength':8,'fileInfo':{}}
  client=Fake(old+[foreign]);client.check()
  with tempfile.TemporaryDirectory() as folder:result=client.upload(self.archive(folder))
  self.assertEqual(result['daily_copies'],7);self.assertEqual(result['versions_removed'],3);self.assertTrue(result['upload_checksum_verified']);self.assertFalse(result['download_verified']);self.assertFalse(any(op=='download' for op,body in client.calls));self.assertIn('foreign',[f['fileId'] for f in client.files])
  ops=[op for op,body in client.calls];self.assertLess(ops.index('upload'),ops.index('b2_delete_file_version'))
 def test_retry_same_day_does_not_accumulate_new_versions(self):
  client=Fake()
  with tempfile.TemporaryDirectory() as folder:
   path=self.archive(folder);client.upload(path);result=client.upload(path)
  self.assertTrue(result['already_present_today']);self.assertEqual(sum(op=='upload' for op,body in client.calls),1);self.assertEqual(result['daily_copies'],1)
 def test_failure_or_checksum_mismatch_never_prunes_old_copies(self):
  for case in ['upload','checksum']:
   client=Fake([fixture('2026-10-'+str(day)) for day in range(22,29)])
   client.fail_upload=case=='upload';client.bad_upload=case=='checksum'
   with tempfile.TemporaryDirectory() as folder:
    with self.assertRaises((ValueError,RuntimeError)):client.upload(self.archive(folder))
   self.assertFalse(any(op=='b2_delete_file_version' for op,body in client.calls))
 def test_budget_counts_hidden_older_versions_not_only_current_objects(self):
  old=fixture('2026-10-28');old['contentLength']=b2.MAX_BYTES
  client=Fake([old]);client.check()
  with tempfile.TemporaryDirectory() as folder:
   with self.assertRaisesRegex(ValueError,'2 GB'):client.upload(self.archive(folder))
  self.assertFalse(any(op=='upload' for op,body in client.calls))
 def test_download_verification_is_explicit_and_rejects_corruption(self):
  for corrupt in [False,True]:
   client=Fake();client.bad_download=corrupt
   with tempfile.TemporaryDirectory() as folder:
    if corrupt:
     with self.assertRaises(ValueError):client.upload(self.archive(folder),True)
    else:self.assertTrue(client.upload(self.archive(folder),True)['download_verified'])
   self.assertTrue(any(op=='download' for op,body in client.calls))
 def test_rejects_unsafe_endpoints_and_plaintext(self):
  for url in ['https://api001.backblazeb2.com.evil.test/b2api/v4/test','http://api.backblazeb2.com/b2api/v4/test','https://secret@api001.backblazeb2.com/b2api/v4/test','https://api001.backblazeb2.com/other']:
   with self.assertRaises(ValueError):b2.safe_url(url)
  with self.assertRaises(RuntimeError):b2.NoRedirects().redirect_request(None,None,302,None,None,None)
  with tempfile.TemporaryDirectory() as folder:
   p=pathlib.Path(folder)/'plain.tar.gz.gpg';p.write_bytes(b'CREATE TABLE private_data (sensitive text);');client=Fake()
   with self.assertRaises(ValueError):client.upload(p)
   self.assertFalse(client.calls)
 def test_prune_failure_keeps_the_new_copy_and_next_retry_can_finish(self):
  client=Fake([fixture('2026-10-'+str(day)) for day in range(20,29)]);client.fail_delete=True
  with tempfile.TemporaryDirectory() as folder:
   path=self.archive(folder)
   with self.assertRaises(RuntimeError):client.upload(path)
   self.assertIn(TODAY,client.daily(client.files));client.fail_delete=False
   result=client.upload(path)
  self.assertEqual(result['daily_copies'],7);self.assertEqual(sum(op=='upload' for op,body in client.calls),1)
 def test_pagination_cannot_hide_old_versions_from_the_space_budget(self):
  client=Fake();first=fixture('2026-10-28');second=fixture('2026-10-27');original=client.api_call
  def pages(operation,body):
   if operation!='b2_list_file_versions':return original(operation,body)
   if 'startFileName' not in body:return {'files':[first],'nextFileName':second['fileName'],'nextFileId':second['fileId']}
   self.assertEqual(body['startFileId'],second['fileId']);return {'files':[second],'nextFileName':None}
  client.api_call=pages;self.assertEqual(len(client.inventory()),2)
 def test_incomplete_inventory_or_wrong_bucket_stops_before_upload(self):
  client=Fake();client.overrides['b2_list_file_versions']={'files':[{**fixture('2026-10-28'),'bucketId':'wrong'}],'nextFileName':None}
  with self.assertRaises(ValueError):client.check()
  self.assertFalse(any(op=='upload' for op,body in client.calls))
if __name__=='__main__':unittest.main()

import unittest,tempfile,pathlib,json,tarfile,subprocess,os,shutil,urllib.request,urllib.response,email.message,io
import backup
class RecoveryTests(unittest.TestCase):
 def test_storage_redirects_never_forward_administrative_headers(self):
  class Transport(urllib.request.HTTPSHandler):
   def __init__(self,code,target):super().__init__();self.code=code;self.target=target;self.requests=[]
   def https_open(self,request):
    self.requests.append(request)
    headers=email.message.Message();headers['Location']=self.target
    response=urllib.response.addinfourl(io.BytesIO(b''),headers,request.full_url,self.code);response.msg='redirect';return response
  source='https://'+backup.PROJECT+'.supabase.co/storage/v1/bucket'
  for code in [301,302,303,307,308]:
   for target in ['https://other.example.invalid/collect','http://'+backup.PROJECT+'.supabase.co/collect',source+'/moved']:
    with self.subTest(code=code,target=target):
     transport=Transport(code,target);opener=urllib.request.build_opener(backup.RejectStorageRedirects(),transport)
     request=urllib.request.Request(source,headers={'Authorization':'Bearer synthetic-administrative-key','apikey':'synthetic-administrative-key'})
     with self.assertRaisesRegex(RuntimeError,'Redirecionamento inesperado')as error:opener.open(request)
     self.assertEqual(len(transport.requests),1)
     self.assertNotIn('synthetic-administrative-key',str(error.exception));self.assertNotIn(target,str(error.exception))
 def fixture(self,root):
  folder=root/'fixture';folder.mkdir()
  for name in ['roles.sql','schema.sql','data.sql','history_schema.sql','history_data.sql','managed_schema.sql']:(folder/name).write_text('-- synthetic fixture only\n')
  (folder/'storage-index.json').write_text(json.dumps({'buckets':[],'objects':[]}));backup.manifest(folder,0)
  return folder
 def pack(self,folder,target):
  with tarfile.open(target,'w:gz')as tar:
   for p in folder.iterdir():tar.add(p,arcname=p.name)
 def test_integrity_and_tampering(self):
  with tempfile.TemporaryDirectory()as t:
   root=pathlib.Path(t);folder=self.fixture(root);archive=root/'snapshot.tar.gz';self.pack(folder,archive);self.assertEqual(backup.verify(archive)['verified_files'],7)
   (folder/'data.sql').write_text('corruption');self.pack(folder,archive)
   with self.assertRaises(ValueError):backup.verify(archive)
 def test_missing_file_rejected(self):
  with tempfile.TemporaryDirectory()as t:
   root=pathlib.Path(t);folder=self.fixture(root);(folder/'data.sql').unlink();archive=root/'snapshot.tar.gz';self.pack(folder,archive)
   with self.assertRaises((KeyError,ValueError)):backup.verify(archive)
 def test_duplicate_manifest_entry_rejected(self):
  with tempfile.TemporaryDirectory()as t:
   root=pathlib.Path(t);folder=self.fixture(root);meta=json.loads((folder/'snapshot.json').read_text());meta['files'].append(meta['files'][0]);(folder/'snapshot.json').write_text(json.dumps(meta));archive=root/'snapshot.tar.gz';self.pack(folder,archive)
   with self.assertRaisesRegex(ValueError,'duplicada'):backup.verify(archive)
 def storage_fixture(self,folder):
  (folder/'objects').mkdir();target=folder/'objects'/'test.bin';target.write_bytes(b'synthetic media')
  item={'bucket':'private','name':'image.png','file':'objects/test.bin','sha256':backup.digest(target),'bytes':target.stat().st_size}
  return item
 def test_storage_inventory_must_match_saved_objects(self):
  for case in ['valid','duplicate_identity','shared_file','unlisted','sql_as_media']:
   with self.subTest(case=case),tempfile.TemporaryDirectory()as t:
    root=pathlib.Path(t);folder=self.fixture(root);item=self.storage_fixture(folder);items=[item]
    if case=='duplicate_identity':items.append(dict(item))
    if case=='shared_file':items.append({**item,'name':'other.png'})
    if case=='unlisted':items=[]
    if case=='sql_as_media':items=[{**item,'file':'data.sql','sha256':backup.digest(folder/'data.sql'),'bytes':(folder/'data.sql').stat().st_size}]
    (folder/'storage-index.json').write_text(json.dumps({'buckets':[],'objects':items}));backup.manifest(folder,len(items));archive=root/'snapshot.tar.gz';self.pack(folder,archive)
    if case=='valid':self.assertEqual(backup.verify(archive)['storage_objects'],1)
    else:
     with self.assertRaises(ValueError):backup.verify(archive)
 def test_special_archive_member_rejected(self):
  with tempfile.TemporaryDirectory()as t:
   root=pathlib.Path(t);folder=self.fixture(root);archive=root/'snapshot.tar.gz';self.pack(folder,archive)
   with tarfile.open(root/'unsafe.tar.gz','w:gz')as target,tarfile.open(archive,'r:gz')as source:
    for member in source:target.addfile(member,source.extractfile(member))
    special=tarfile.TarInfo('pipe');special.type=tarfile.FIFOTYPE;target.addfile(special)
   with self.assertRaisesRegex(ValueError,'Tipo de arquivo'):backup.verify(root/'unsafe.tar.gz')
 @unittest.skipUnless(shutil.which('gpg'),'GnuPG required')
 def test_public_key_backup_can_be_recovered_in_separate_keyring(self):
  with tempfile.TemporaryDirectory()as t:
   root=pathlib.Path(t);folder=self.fixture(root);archive=root/'snapshot.tar.gz';self.pack(folder,archive)
   owner=root/'owner';owner.mkdir(mode=0o700)
   common=['gpg','--homedir',str(owner),'--batch','--pinentry-mode','loopback','--passphrase','']
   subprocess.run(common+['--quick-generate-key','Synthetic backup fixture <fixture@example.invalid>','default','default','1d'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True)
   public=root/'public.asc'
   with public.open('wb')as output:
    subprocess.run(common+['--armor','--export','fixture@example.invalid'],stdout=output,stderr=subprocess.PIPE,check=True)
   encrypted=root/'snapshot.gpg';restored=root/'restored.tar.gz'
   backup.encrypt_public(archive,encrypted,public,root/'ci-public-only')
   subprocess.run(common+['--output',str(restored),'--decrypt',str(encrypted)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True)
   self.assertEqual(backup.verify(restored)['verified_files'],7)
   self.assertEqual(archive.read_bytes(),restored.read_bytes())
   listing=subprocess.run(['gpg','--homedir',str(root/'ci-public-only'),'--batch','--list-secret-keys','--with-colons'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True)
   self.assertNotIn(b'sec:',listing.stdout)
 def test_public_key_mode_rejects_private_key_material(self):
  with tempfile.TemporaryDirectory()as t:
   root=pathlib.Path(t);key=root/'private.asc';key.write_text('-----BEGIN PGP PRIVATE KEY BLOCK-----\nsynthetic\n-----END PGP PRIVATE KEY BLOCK-----')
   with self.assertRaisesRegex(ValueError,'somente a chave pública'):
    backup.encrypt_public(root/'unused.tar.gz',root/'unused.gpg',key,root/'ci')
   self.assertFalse((root/'ci').exists())
 @unittest.skipUnless(shutil.which('gpg'),'GnuPG required')
 def test_encrypted_fixture_can_be_recovered(self):
  with tempfile.TemporaryDirectory()as t:
   root=pathlib.Path(t);folder=self.fixture(root);archive=root/'snapshot.tar.gz';self.pack(folder,archive);home=root/'gpg';home.mkdir(mode=0o700);env={**os.environ,'GNUPGHOME':str(home)}
   encrypted=root/'snapshot.gpg';restored=root/'restored.tar.gz';common=['gpg','--batch','--yes','--no-symkey-cache','--pinentry-mode','loopback','--passphrase-fd','0']
   encrypted_result=subprocess.run(common+['--cipher-algo','AES256','--output',str(encrypted),'--symmetric',str(archive)],input=b'synthetic-test-passphrase\n',env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False)
   self.assertEqual(encrypted_result.returncode,0,encrypted_result.stderr.decode())
   decrypted_result=subprocess.run(common+['--output',str(restored),'--decrypt',str(encrypted)],input=b'synthetic-test-passphrase\n',env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False)
   self.assertEqual(decrypted_result.returncode,0,decrypted_result.stderr.decode())
   self.assertEqual(backup.verify(restored)['verified_files'],7)
if __name__=='__main__':unittest.main()

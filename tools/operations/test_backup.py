import unittest,tempfile,pathlib,json,tarfile,subprocess,os,shutil
import backup
class RecoveryTests(unittest.TestCase):
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

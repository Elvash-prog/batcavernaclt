import base64
import copy
import hashlib
import io
import json
import os
import pathlib
import subprocess
import tempfile
import unittest
import urllib.error
import uuid
from unittest.mock import patch

import restore_local_media as media


class Response(io.BytesIO):
    status = 200


class Opener:
    def __init__(self, body): self.body = body; self.requests = []
    def open(self, request, timeout):
        self.requests.append(request)
        if isinstance(self.body, Exception): raise self.body
        return Response(self.body)


class LocalMediaTests(unittest.TestCase):
    def fixture(self, folder):
        data = b'synthetic-media-only'
        (folder/'objects').mkdir()
        source = folder/'objects'/'fixture.bin'; source.write_bytes(data)
        bucket = {'id':'private','public':False}
        entry = {'bucket':'private','name':'owner/a b.txt','file':'objects/fixture.bin','bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
        (folder/'storage-index.json').write_text(json.dumps({'buckets':[bucket],'objects':[entry]}))
        state = {'buckets':[bucket], 'objects':[{'id':'synthetic-id','bucket_id':'private','name':entry['name'],'version':'ver-1','owner':'synthetic-owner','metadata':{'size':len(data),'mimetype':'text/plain'},'updated_at':'before'}]}
        original = state['objects'][0]
        fields = ['id','bucket_id','name','version','owner','metadata']
        values = [json.dumps(original[name],ensure_ascii=False) if name=='metadata' else original[name] for name in fields]
        escaped = [value.replace('\\','\\\\').replace('\t','\\t').replace('\n','\\n').replace('\r','\\r') for value in values]
        header = 'COPY "storage"."objects" (' + ', '.join('"'+name+'"' for name in fields) + ') FROM stdin;\n'
        (folder/'data.sql').write_text(header+'\t'.join(escaped)+'\n\\.\n',encoding='utf-8')
        return data, entry, state

    def test_inventory_checks_identity_size_hash_and_bucket_privacy(self):
        for case in ('valid','hash','metadata_size','privacy','missing','extra'):
            with self.subTest(case=case), tempfile.TemporaryDirectory() as temp:
                folder = pathlib.Path(temp); data, entry, state = self.fixture(folder)
                if case == 'hash': (folder/'objects'/'fixture.bin').write_bytes(b'x'*len(data))
                if case == 'metadata_size': state['objects'][0]['metadata']['size'] += 1
                if case == 'privacy': state['buckets'][0]['public'] = True
                if case == 'missing': state['objects'] = []
                if case == 'extra': state['objects'].append({**state['objects'][0],'name':'unexpected'})
                if case == 'valid':
                    items = media.inventory(folder, {'storage_objects':1}, state)
                    self.assertEqual(items[0]['version'], 'ver-1')
                    self.assertNotIn('source', media.public_item(items[0]))
                else:
                    with self.assertRaises(ValueError): media.inventory(folder, {'storage_objects':1}, state)

    def test_new_version_owner_or_metadata_is_refused_before_any_copy(self):
        for field,value in [('version','new-version'),('owner','other-owner'),('metadata',{})]:
            with self.subTest(field=field), tempfile.TemporaryDirectory() as temp:
                folder=pathlib.Path(temp); _,_,state=self.fixture(folder)
                state['objects'][0][field]=value
                with self.assertRaisesRegex(ValueError,'mudaram'):
                    media.inventory(folder,{'storage_objects':1},state)

    def test_copy_decoder_preserves_unicode_escapes_nulls_and_unicode_line_separators(self):
        self.assertIsNone(media.decode_copy(b'\\N'))
        self.assertEqual(media.decode_copy(b'a\\t\\\\b'), 'a\t\\b')
        self.assertEqual(media.decode_copy(b'\\303\\251'), 'é')
        self.assertEqual(media.decode_copy(b'\\xC3\\xA9'), 'é')
        with tempfile.TemporaryDirectory() as temp:
            folder=pathlib.Path(temp)
            name='a b.txt'
            header='COPY "storage"."objects" ("id", "bucket_id", "name", "version") FROM stdin;\n'
            (folder/'data.sql').write_text(header+'synthetic\tprivate\t'+name+'\t\\N\n\\.\n',encoding='utf-8')
            originals=media.original_objects(folder)
            self.assertEqual(originals[('private',name)]['version'],None)

    def test_fingerprint_detects_owner_version_metadata_and_privacy_changes(self):
        with tempfile.TemporaryDirectory() as temp:
            _, _, state = self.fixture(pathlib.Path(temp))
            for field, value in [('owner','different'),('version','different'),('metadata',{})]:
                changed = copy.deepcopy(state); changed['objects'][0][field] = value
                self.assertNotEqual(media.state_digest(state), media.state_digest(changed))
            changed = copy.deepcopy(state); changed['buckets'][0]['public'] = True
            self.assertNotEqual(media.state_digest(state), media.state_digest(changed))
            changed = copy.deepcopy(state); changed['objects'][0]['updated_at']='after'; changed['objects'][0]['last_accessed_at']='after'
            self.assertEqual(media.state_digest(state), media.state_digest(changed))

    def test_api_download_checks_bytes_and_hash_without_following_external_urls(self):
        data = b'synthetic'
        item = {'bucket':'private','name':'a b.txt','bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
        opener = Opener(data)
        self.assertEqual(media.verify_api([item], 'synthetic-key', opener), 1)
        self.assertEqual(opener.requests[0].full_url, media.API+'/storage/v1/object/authenticated/private/a%20b.txt')
        for wrong in [b'bad', b'x'*len(data), data+b'overflow']:
            with self.assertRaises(ValueError): media.verify_api([item], 'synthetic-key', Opener(wrong))

    def test_http_errors_never_echo_keys_names_or_response_bodies(self):
        canary = 'private-error-canary'
        error = urllib.error.HTTPError(media.API+'/'+canary, 403, canary, {}, io.BytesIO(canary.encode()))
        with self.assertRaises(RuntimeError) as caught:
            media.verify_api([{'bucket':'private','name':canary}], 'synthetic-key', Opener(error))
        self.assertNotIn(canary, str(caught.exception))
        self.assertIn('HTTP 403', str(caught.exception))

    def test_bucket_api_must_preserve_private_configuration(self):
        state = {'buckets':[{'id':'private','public':False}]}
        media.verify_buckets_api(state, 'synthetic-key', Opener(json.dumps(state['buckets']).encode()))
        with self.assertRaises(ValueError): media.verify_buckets_api(state, 'synthetic-key', Opener(b'[{"id":"private","public":true}]'))

    def test_default_preflight_does_not_write_or_request_privileged_keys(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = pathlib.Path(temp); _, _, state = self.fixture(folder)
            with patch.object(media.prepare, 'verify_folder', return_value={'storage_objects':1}), patch.object(media, 'inspect_local'), patch.object(media, 'read_state', return_value=state), patch.object(media, 'node_call', return_value={'ok':True,'existing':0}) as node, patch.object(media, 'service_key') as key, patch.object(media, 'verify_api') as api, patch('sys.argv',['restore_local_media.py','--backup',str(folder)]), patch('sys.stdout',new_callable=io.StringIO) as output:
                media.main()
            self.assertTrue(json.loads(output.getvalue())['validated_only'])
            self.assertEqual(node.call_args[0][0]['action'], 'preflight')
            node.assert_called_once(); key.assert_not_called(); api.assert_not_called()

    def test_inspection_refuses_wrong_image_external_network_and_host_bind_volume(self):
        valid = {'State':{'Running':True},'NetworkSettings':{'Networks':{media.prepare.NETWORK:{}}},'Config':{'Image':media.IMAGE,'Env':['STORAGE_BACKEND=file','FILE_STORAGE_BACKEND_PATH=/mnt','TENANT_ID=stub','GLOBAL_S3_BUCKET=stub','SERVICE_KEY=private-canary']},'Mounts':[{'Type':'volume','Destination':'/mnt'}]}
        for case in ('valid','image','network','mount'):
            info = copy.deepcopy(valid)
            if case == 'image': info['Config']['Image']='other'
            if case == 'network': info['NetworkSettings']['Networks']['bridge']={}
            if case == 'mount': info['Mounts'][0]['Type']='bind'
            with patch.object(media, 'local_command', return_value=json.dumps([info]).encode()):
                if case == 'valid': media.inspect_local()
                else:
                    with self.assertRaises(ValueError) as error: media.inspect_local()
                    self.assertNotIn('private-canary',str(error.exception))

    def test_database_snapshot_uses_only_select_and_dedicated_container(self):
        with patch.object(media,'local_command',return_value=b'{"objects":[],"buckets":[]}') as command:
            media.read_state()
        self.assertIn(media.prepare.CONTAINER, command.call_args[0][0])
        query=command.call_args[0][1].decode().strip()
        self.assertTrue(query.startswith('SELECT'))
        self.assertNotIn('UPDATE ',query); self.assertNotIn('INSERT ',query)


@unittest.skipUnless(os.environ.get('STORAGE_TEST_IMAGE'), 'exact Storage image integration is opt-in')
class NativeFileBackendTests(unittest.TestCase):
    def setUp(self):
        self.assertEqual(os.environ['STORAGE_TEST_IMAGE'],media.IMAGE)
        self.container='batcaverna-files-'+uuid.uuid4().hex[:12]
        self.run_command(['docker','run','-d','--name',self.container,'--network','none','--tmpfs','/mnt:rw,size=16777216',
                          '-e','STORAGE_BACKEND=file','-e','FILE_STORAGE_BACKEND_PATH=/mnt','-e','TENANT_ID=stub','-e','GLOBAL_S3_BUCKET=stub',
                          '-e','PGRST_JWT_SECRET=synthetic-backend-secret','-e','DATABASE_URL=postgres://synthetic.invalid/test',
                          '--entrypoint','node',media.IMAGE,'-e','setInterval(()=>{},1000)'])
        self.addCleanup(self.run_command,['docker','rm','-f',self.container])
        self.patch=patch.object(media,'STORAGE',self.container); self.patch.start(); self.addCleanup(self.patch.stop)

    def run_command(self,args,data=None):
        result=subprocess.run(args,input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        if result.returncode: raise AssertionError(result.stderr.decode())  # Synthetic fixtures only.
        return result.stdout

    def item(self, data=b'synthetic-media'):
        return {'bucket':'private','name':'owner/a b.txt','version':'ver-1','bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'mimetype':'text/plain','cacheControl':'max-age=42','contentEncoding':None,'data':base64.b64encode(data).decode()}

    def original_read(self,item,separator=False):
        code=r'''const {FileBackend}=require('/app/dist/storage/backend/file.js');
const input=JSON.parse(process.argv[1]);
(async()=>{const r=await new FileBackend().getObject('stub','stub/'+input.bucket+'/'+input.name,input.version);let b=[];for await(const c of r.body)b.push(c);console.log(JSON.stringify({sha256:require('node:crypto').createHash('sha256').update(Buffer.concat(b)).digest('hex'),mime:r.metadata.mimetype,cache:r.metadata.cacheControl}));})().catch(e=>{console.error(e.code||'READ_FAILED');process.exit(1)});'''
        return json.loads(self.run_command(['docker','exec','-e','TUS_USE_FILE_VERSION_SEPARATOR='+str(separator).lower(),self.container,'node','-e',code,json.dumps(item)]))

    def test_writer_round_trip_is_readable_by_the_original_backend_with_xattrs(self):
        item=self.item()
        self.assertEqual(media.node_call({'action':'preflight','objects':[item]})['existing'],0)
        self.assertTrue(media.node_call({'action':'write','object':item})['written'])
        result=self.original_read(item)
        self.assertEqual(result,{'sha256':item['sha256'],'mime':'text/plain','cache':'max-age=42'})
        self.assertEqual(media.node_call({'action':'preflight','objects':[item]})['existing'],1)
        self.assertFalse(media.node_call({'action':'write','object':item})['written'])

    def test_temporary_filename_collision_never_deletes_an_existing_file(self):
        temporary='/mnt/stub/stub/private/owner/a b.txt/.batcaverna-collision.tmp'
        code="const f=require('node:fs'); const p=process.argv[1]; f.mkdirSync(require('node:path').dirname(p),{recursive:true}); f.writeFileSync(p,'keep-existing');"
        self.run_command(['docker','exec',self.container,'node','-e',code,temporary])
        payload=json.dumps({'action':'write','object':self.item()}).encode()
        helper="require('node:crypto').randomUUID=()=> 'collision';\n"+media.NODE_HELPER
        result=subprocess.run(['docker','exec','-i',self.container,'node','-e',helper],input=payload,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        self.assertNotEqual(result.returncode,0)
        self.assertEqual(json.loads(result.stdout)['code'],'EEXIST')
        kept=self.run_command(['docker','exec',self.container,'node','-e',"process.stdout.write(require('node:fs').readFileSync(process.argv[1]));",temporary])
        self.assertEqual(kept,b'keep-existing')

    def test_version_separator_flag_matches_the_original_backend(self):
        item=self.item()
        payload=json.dumps({'action':'write','object':item}).encode()
        report=json.loads(self.run_command(['docker','exec','-i','-e','TUS_USE_FILE_VERSION_SEPARATOR=true',self.container,'node','-e',media.NODE_HELPER],payload))
        self.assertTrue(report['written'])
        self.assertEqual(self.original_read(item,True)['sha256'],item['sha256'])

    def test_bad_bytes_and_existing_different_files_are_never_published_or_overwritten(self):
        item=self.item(); bad={**item,'data':base64.b64encode(b'wrong').decode()}
        with self.assertRaisesRegex(RuntimeError,'INPUT_HASH_MISMATCH'): media.node_call({'action':'write','object':bad})
        self.assertEqual(media.node_call({'action':'preflight','objects':[item]})['existing'],0)
        media.node_call({'action':'write','object':item})
        other=self.item(b'another-content')
        with self.assertRaisesRegex(RuntimeError,'EXISTING_FILE_DIFFERS'): media.node_call({'action':'write','object':other})
        self.assertEqual(self.original_read(item)['sha256'],item['sha256'])

    def test_rejects_traversal_duplicates_symlinks_and_planned_file_directory_collisions(self):
        item=self.item()
        for changed in ({'name':'../escape'},{'name':'/absolute'},{'name':'a/./b'},{'version':'../escape'},{'bucket':'..'}):
            with self.subTest(changed=changed), self.assertRaisesRegex(RuntimeError,'UNSAFE_PATH'):
                media.node_call({'action':'preflight','objects':[{**item,**changed}]})
        with self.assertRaisesRegex(RuntimeError,'DUPLICATE_DESTINATION'): media.node_call({'action':'preflight','objects':[item,item]})
        collisions=[{**item,'name':name,'version':None} for name in ['a','a-foo','a/b']]
        with self.assertRaisesRegex(RuntimeError,'PATH_COLLISION'): media.node_call({'action':'preflight','objects':collisions})
        self.run_command(['docker','exec',self.container,'node','-e',"const f=require('node:fs'); f.mkdirSync('/mnt/stub/stub/private',{recursive:true}); f.symlinkSync('/tmp','/mnt/stub/stub/private/alias');"])
        with self.assertRaisesRegex(RuntimeError,'UNSAFE_LINK'): media.node_call({'action':'preflight','objects':[{**item,'name':'alias/a'}]})

if __name__=='__main__': unittest.main()

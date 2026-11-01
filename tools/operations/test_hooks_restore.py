"""Opt-in real PostgreSQL regression. No source data or network is required.

PG_CONTAINER must name a disposable test PostgreSQL with postgres access.
SUPABASE_CLI selects the CLI version used by private-backup.yml.
The CLI's actual --dry-run scripts run inside that container, including its
schema filters; mocking pg_dump would miss the original omission.
"""
import json, os, pathlib, re, shlex, subprocess, tempfile, unittest, uuid
from unittest.mock import patch
import backup

@unittest.skipUnless(os.environ.get('PG_CONTAINER'), 'disposable PG_CONTAINER required')
class HooksRestoreTests(unittest.TestCase):
 def test_export_restores_hooks_and_trigger_without_external_sql(self):
  container=os.environ['PG_CONTAINER'];cli=os.environ.get('SUPABASE_CLI','supabase')
  suffix=uuid.uuid4().hex[:12]
  source='hooks_source_'+suffix;target='hooks_restored_'+suffix;legacy='hooks_legacy_'+suffix
  created=[]
  def run(args,input=None):
   return subprocess.run(args,input=input,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True).stdout
  def sql(db,statement):
   return run(['docker','exec','-i',container,'psql','-X','-qAt','-U','postgres','-d',db,'-v','ON_ERROR_STOP=1','--single-transaction'],statement.encode()).decode().strip()
  try:
   for db in (source,target,legacy):
    run(['docker','exec',container,'createdb','-U','postgres',db]);created.append(db)
   sql(source,(backup.ROOT/'tests/operations/hooks-fixture.sql').read_text())
   with tempfile.TemporaryDirectory()as temp:
    folder=pathlib.Path(temp)/'snapshot';folder.mkdir()
    def dump(args):
     # Replace only the production connection selector and output destination.
     # --dry-run requires no access to the real project or its credentials.
     self.assertEqual(args[:4],['supabase','db','dump','--linked'])
     filename=pathlib.Path(args[5]);flags=args[6:]
     script=run([cli,'db','dump','--db-url',f'postgresql://postgres@127.0.0.1:5432/{source}','--dry-run',*flags])
     # CLI 2.122.0 dry-run renders a multi-schema pattern without
     # shell quotes (auth|storage). Quote that token, retaining its exact
     # pg_dump regex; otherwise the shell would execute `storage`.
     script=re.sub(r'(--schema=)([^\s]+)',lambda m:m[1]+shlex.quote(m[2]),script.decode()).encode()
     filename.write_bytes(run(['docker','exec','-i',container,'bash'],script))
    with patch.object(backup,'call',side_effect=dump):backup.export_database(folder)
    definitions=(folder/'functions_schema.sql').read_text()
    self.assertIn('"supabase_functions"."hooks"',definitions)
    self.assertIn('"supabase_functions"."http_request"()',definitions)
    # Restore exclusively packaged SQL; no fixture/reference SQL on destination.
    schema=(folder/'managed_schema.sql').read_text()+'\n'+(folder/'schema.sql').read_text()
    with self.assertRaises(subprocess.CalledProcessError):sql(legacy,schema)
    sql(target,(folder/'managed_schema.sql').read_text()+'\n'+definitions+'\n'+(folder/'schema.sql').read_text()+'\n'+(folder/'data.sql').read_text())
    self.assertEqual(sql(source,"SELECT pg_get_functiondef('supabase_functions.http_request()'::regprocedure)"),sql(target,"SELECT pg_get_functiondef('supabase_functions.http_request()'::regprocedure)"))
    self.assertEqual(sql(source,'TABLE supabase_functions.hooks'),sql(target,'TABLE supabase_functions.hooks'))
    self.assertEqual(sql(source,"SELECT proacl::text FROM pg_proc WHERE oid='supabase_functions.http_request()'::regprocedure"),sql(target,"SELECT proacl::text FROM pg_proc WHERE oid='supabase_functions.http_request()'::regprocedure"))
    sql(target,"INSERT INTO public.hook_probe VALUES(2,'restored trigger')")
    self.assertEqual(sql(target,'SELECT count(*) FROM supabase_functions.hooks'),'2')
    with self.assertRaises(subprocess.CalledProcessError):sql(target,"INSERT INTO supabase_functions.hooks(hook_table_id,hook_name,request_id) VALUES(1,'invalid',-1)")
    (folder/'storage-index.json').write_text(json.dumps({'buckets':[],'objects':[]}));backup.manifest(folder,0)
    archive=pathlib.Path(temp)/'snapshot.tar.gz'
    import tarfile
    with tarfile.open(archive,'w:gz')as tar:
     for path in folder.iterdir():tar.add(path,arcname=path.name)
    self.assertTrue(backup.verify(archive)['functions_schema_included'])
  finally:
   for db in created:run(['docker','exec',container,'dropdb','-U','postgres','--if-exists',db])

if __name__=='__main__':unittest.main()

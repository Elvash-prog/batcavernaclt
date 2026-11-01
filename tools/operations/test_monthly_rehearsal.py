"""Synthetic checks for the monthly coordinator; no production or credentials."""
import copy
import argparse
import contextlib
import shutil
import datetime as dt
import hashlib
import io
import json
import os
import pathlib
import subprocess
import tarfile
import tempfile
import unittest
from unittest.mock import patch

import monthly_rehearsal as monthly
import test_backup
import test_b2_backup
import test_verify_local_media_access as access_tests


class ArchiveTests(unittest.TestCase):
    def test_verified_archive_is_extracted_without_overwriting_and_all_files_rechecked(self):
        with tempfile.TemporaryDirectory() as temp:
            root=pathlib.Path(temp)
            fixture=test_backup.RecoveryTests().fixture(root)
            archive=root/'data.tar.gz'
            test_backup.RecoveryTests().pack(fixture,archive)
            output=root/'unpacked'
            result=monthly.extract_verified(archive,output,7)
            self.assertTrue(result['functions_schema_included'])
            self.assertEqual(monthly.prepare.verify_folder(output)['format'],2)
            with self.assertRaises(FileExistsError): monthly.extract_verified(archive,output,7)
            self.assertEqual((output/'data.sql').read_text(),'-- synthetic fixture only\n')

    def test_hostile_windows_names_links_collisions_and_bombs_never_create_the_destination(self):
        cases=['../outside','C:/escape','objects/a:stream','objects/CON.txt','objects/name.',
               'objects/name ','objects/a\\b','case','link','parent-file','huge']
        for case in cases:
            with self.subTest(case=case),tempfile.TemporaryDirectory() as temp:
                root=pathlib.Path(temp);archive=root/'malicious.tar.gz'
                with tarfile.open(archive,'w:gz') as writer:
                    if case=='case':
                        for name in ('data.sql','DATA.SQL'):
                            entry=tarfile.TarInfo(name);writer.addfile(entry,io.BytesIO())
                    elif case=='parent-file':
                        for name in ('objects','objects/a'):
                            writer.addfile(tarfile.TarInfo(name),io.BytesIO())
                    else:
                        entry=tarfile.TarInfo('payload' if case in ('link','huge') else case)
                        if case=='link':entry.type=tarfile.SYMTYPE;entry.linkname='../private'
                        if case=='huge': entry.size=monthly.MAX_MEMBER+1
                        # A large header with no payload is sufficient to reject
                        # before the tar reader tries to advance to another item.
                        if case=='huge':
                            # Python 3.14 refuses addfile without a fileobj for
                            # nonempty entries. Deliberately write only the
                            # header: the size guard must reject it before any
                            # attempt to read a 512 MiB payload.
                            writer.fileobj.write(entry.tobuf())
                            writer.offset += len(entry.tobuf())
                        else:
                            writer.addfile(entry,None)
                with self.assertRaises(monthly.Failed): monthly.extract_verified(archive,root/'output',7)
                self.assertFalse((root/'output').exists())

    def test_corruption_and_stale_snapshot_are_refused_before_extracting(self):
        for case in ('corrupt','stale'):
            with self.subTest(case=case),tempfile.TemporaryDirectory() as temp:
                root=pathlib.Path(temp);fixture=test_backup.RecoveryTests().fixture(root)
                if case=='corrupt': (fixture/'data.sql').write_text('tampered')
                else:
                    path=fixture/'snapshot.json';meta=json.loads(path.read_text())
                    meta['created_at']='2020-01-01T00:00:00+00:00';path.write_text(json.dumps(meta))
                archive=root/'data.tar.gz';test_backup.RecoveryTests().pack(fixture,archive)
                with self.assertRaises((monthly.Failed,ValueError)):monthly.extract_verified(archive,root/'out',7)
                self.assertFalse((root/'out').exists())

    def test_date_window_rejects_future_and_naive_dates(self):
        now=dt.datetime(2026,11,1,tzinfo=dt.timezone.utc)
        monthly.fresh_date('2026-10-31T19:00:00-03:00',7,now)
        for value in ('2026-12-01T00:00:00Z','2026-11-01','2020-01-01T00:00:00Z',None):
            with self.assertRaises(monthly.Failed):monthly.fresh_date(value,7,now)


class ReadOnlyB2Tests(unittest.TestCase):
    def client(self):
        fake=test_b2_backup.Fake()
        client=monthly.ReadOnlyB2(fake.key_id,fake.key,fake.bucket_id,fake.bucket_name,fake.region)
        auth=copy.deepcopy(fake.auth)
        auth['apiInfo']['storageApi']['allowed']['capabilities']=['listBuckets','listFiles','readFiles']
        client.json=lambda *args,**kw: copy.deepcopy(auth)
        client.api_call=lambda *args,**kw: fake.api_call(*args,**kw)
        return client,auth,fake

    def test_only_read_only_single_private_bucket_authorization_is_accepted(self):
        for case in ('valid','write','master','public','region','redirect-host'):
            with self.subTest(case=case):
                client,auth,fake=self.client()
                storage=auth['apiInfo']['storageApi']
                if case=='write':storage['allowed']['capabilities'].append('writeFiles')
                if case=='master':storage['allowed']['buckets']=None
                if case=='public':fake.overrides['b2_list_buckets']={'buckets':[{'bucketId':fake.bucket_id,'bucketName':fake.bucket_name,'bucketType':'allPublic'}]}
                if case=='region':storage['s3ApiUrl']='https://s3.us-east-005.backblazeb2.com'
                if case=='redirect-host':storage['downloadUrl']='https://collect.invalid'
                if case=='valid':client.authorize()
                else:
                    with self.assertRaises((monthly.Failed,ValueError)):client.authorize()
                self.assertFalse(any(op in {'upload','b2_delete_file_version'} for op,_ in fake.calls))

    def test_dispatcher_rejects_mutations_before_any_transport(self):
        client,_,_=self.client()
        for operation in ('b2_delete_file_version','b2_get_upload_url','b2_update_bucket'):
            with patch.object(monthly.b2.B2,'api_call',side_effect=AssertionError('mutation reached transport')):
                with self.assertRaises(monthly.Failed): monthly.ReadOnlyB2.api_call(client,operation,{})

    def test_latest_download_stream_is_checked_for_size_hash_and_date(self):
        today=dt.datetime.now(dt.timezone.utc).date().isoformat()
        data=b'synthetic encrypted bytes'*10
        row=test_b2_backup.fixture(today,data=data)
        for mode in ('valid','hash','size','stale'):
            with self.subTest(mode=mode),tempfile.TemporaryDirectory() as temp:
                client,_,_=self.client();client.authorize=lambda:None
                client.download_url='https://f001.backblazeb2.com';client.token='synthetic'
                record=copy.deepcopy(row)
                if mode=='stale': record=test_b2_backup.fixture('2020-01-01',data=data)
                client.inventory=lambda:[record]
                body=data if mode in ('valid','stale') else (b'x'+data[1:] if mode=='hash' else data+b'!')
                client.request=lambda *args,**kw:io.BytesIO(body)
                target=pathlib.Path(temp)/'download.gpg'
                if mode=='valid':
                    self.assertEqual(client.latest(target,7),hashlib.sha256(data).hexdigest())
                    self.assertEqual(target.read_bytes(),data)
                else:
                    with self.assertRaises(monthly.Failed):client.latest(target,7)
                    if mode=='stale':self.assertFalse(target.exists())


class CoordinatorTests(unittest.TestCase):
    def attempt(self):
        return monthly.Rehearsal(pathlib.Path('/synthetic-private'),'synthetic-cli','a'*32)

    def isolation(self,attempt):
        names={'supabase_'+s+'_'+attempt.project for s in monthly.SERVICES}
        net={'Internal':True,'Labels':{'batcaverna.rehearsal':attempt.run_id},'Containers':{name:{'Name':name} for name in names|{attempt.entry}}}
        infos=[{'Name':'/'+name,'State':{'Running':True},'NetworkSettings':{'Networks':{attempt.network:{}},'Ports':{'5432/tcp':None}},'Config':{'Image':monthly.PG_IMAGE}} for name in names]
        gateway={'Config':{'Image':monthly.HAPROXY},'NetworkSettings':{'Networks':{attempt.network:{},attempt.entry:{}},'Ports':{
            key:[{'HostIp':'127.0.0.1','HostPort':port}] for key,port in {'5432/tcp':'55322','8000/tcp':'55321','8025/tcp':'55324'}.items()}}}
        def command(args,*a,**kw):
            if args[:3]==['docker','network','inspect']:return json.dumps([net]).encode()
            if args==['docker','inspect',attempt.entry]:return json.dumps([gateway]).encode()
            if args[:2]==['docker','inspect']:return json.dumps(infos).encode()
            raise AssertionError(args)
        return net,infos,gateway,command

    def test_only_new_generated_services_on_internal_network_and_loopback_gateway_are_accepted(self):
        for case in ('valid','external-net','foreign-member','public-service','extra-network','gateway-public','db-image','gateway-image'):
            with self.subTest(case=case):
                attempt=self.attempt();net,infos,gateway,command=self.isolation(attempt)
                if case=='external-net':net['Internal']=False
                if case=='foreign-member':net['Containers']['foreign']={'Name':'batcaverna-supabase-restauracao'}
                if case=='public-service':infos[0]['NetworkSettings']['Ports']['5432/tcp']=[{'HostIp':'0.0.0.0','HostPort':'1'}]
                if case=='extra-network':infos[0]['NetworkSettings']['Networks']['internet']={}
                if case=='gateway-public':gateway['NetworkSettings']['Ports']['8000/tcp'][0]['HostIp']='0.0.0.0'
                if case=='db-image':
                    for info in infos:
                        if info['Name']=='/supabase_db_'+attempt.project:info['Config']['Image']='postgres:latest'
                if case=='gateway-image':gateway['Config']['Image']='haproxy:latest'
                attempt.command=command
                with attempt.target(),patch.object(monthly.media,'inspect_local'):
                    if case=='valid':attempt.assert_isolated()
                    else:
                        with self.assertRaises(monthly.Failed):attempt.assert_isolated()

    def test_helper_context_is_restored_on_failure_and_does_not_point_to_original_containers(self):
        previous=monthly.prepare.CONTAINER,monthly.prepare.NETWORK,monthly.media.STORAGE,monthly.media.API
        attempt=self.attempt()
        with self.assertRaises(RuntimeError):
            with attempt.target():
                self.assertEqual(monthly.prepare.CONTAINER,'supabase_db_'+attempt.project)
                self.assertNotIn(monthly.prepare.CONTAINER,{'batcaverna-supabase-restauracao','batcaverna-restauracao-20261030','supabase_db_batcaverna-ensaio-v2'})
                raise RuntimeError('synthetic')
        self.assertEqual(previous,(monthly.prepare.CONTAINER,monthly.prepare.NETWORK,monthly.media.STORAGE,monthly.media.API))

    def test_hash_mismatch_prevents_gpg_and_any_database_operations(self):
        with tempfile.TemporaryDirectory() as temp:
            archive=pathlib.Path(temp)/'backup.gpg';archive.write_bytes(b'synthetic')
            attempt=self.attempt()
            with patch.object(attempt,'command',side_effect=AssertionError('should not execute')):
                with self.assertRaises(monthly.Failed):attempt.decrypt(archive,'0'*64,pathlib.Path(temp))

    def test_failed_command_redacts_output_but_preserves_private_logs(self):
        with tempfile.TemporaryDirectory() as temp:
            attempt=monthly.Rehearsal(pathlib.Path(temp),'cli');attempt.root.mkdir()
            canary=b'private-email@example.invalid password=synthetic-secret'
            with patch.object(monthly.subprocess,'run',return_value=subprocess.CompletedProcess([],1,canary,canary)):
                with self.assertRaises(monthly.Failed) as raised:attempt.command(['synthetic'],private_log='stage')
            self.assertEqual(raised.exception.code,'LOCAL_COMMAND_FAILED')
            self.assertEqual((attempt.root/'stage.err.log').read_bytes(),canary)
            self.assertNotIn('synthetic-secret',json.dumps(attempt.report))

    def test_stop_never_resets_deletes_or_stops_old_trials_and_detects_daemon_failure(self):
        for daemon_down in (False,True):
            with self.subTest(daemon_down=daemon_down):
                attempt=self.attempt();attempt.start_attempted=attempt.gateway_created=True
                calls=[]
                def run(args,**kw):
                    calls.append(args)
                    name=args[-1]
                    if daemon_down:return subprocess.CompletedProcess(args,1,b'',b'Cannot connect to Docker daemon')
                    networks={attempt.network:{},attempt.entry:{}} if name==attempt.entry else {attempt.network:{}}
                    return subprocess.CompletedProcess(args,0,json.dumps([{'NetworkSettings':{'Networks':networks}}]).encode(),b'')
                attempt.command=lambda args,**kw:calls.append(args)
                with patch.object(monthly.subprocess,'run',side_effect=run):attempt.stop_own_services()
                self.assertEqual(attempt.report['services_stopped'],not daemon_down)
                for args in calls:
                    self.assertNotIn('rm',args);self.assertNotIn('reset',args)
                    self.assertTrue(args[-1].endswith(attempt.project) or args[-1]==attempt.entry)


class WorkflowTests(unittest.TestCase):
    def test_coordinator_stops_and_reports_each_stage_without_running_later_stages_or_leaking_errors(self):
        for fail_at in (None,'sql','media','access'):
            with self.subTest(fail_at=fail_at),tempfile.TemporaryDirectory() as temp:
                root=pathlib.Path(temp)
                args=argparse.Namespace(root=root,cli=root/'cli.exe',archive=root/'archive.gpg',sha256='a'*64,
                                        keyring=root/'keyring',b2_config=None,max_age_days=7)
                attempt=monthly.Rehearsal(root,args.cli)
                calls=[]
                def stage(name,result=None):
                    def call(*a,**kw):
                        calls.append(name)
                        if fail_at==name:raise RuntimeError('private-error-password-canary')
                        return result
                    return call
                def stop():
                    calls.append('stop');attempt.report['services_stopped']=True
                output=io.StringIO()
                with contextlib.ExitStack() as stack:
                    stack.enter_context(patch.object(monthly,'Rehearsal',return_value=attempt))
                    for name,result in (('preflight',None),('decrypt',root/'clear.tar.gz'),('bootstrap',None),
                                        ('restore_sql',None),('local_keys',('admin','public')),
                                        ('restore_media',([],{'objects':[],'buckets':[]}))):
                        mapped={'restore_sql':'sql','restore_media':'media'}.get(name,name)
                        stack.enter_context(patch.object(attempt,name,side_effect=stage(mapped,result)))
                    stack.enter_context(patch.object(attempt,'stop_own_services',side_effect=stop))
                    stack.enter_context(patch.object(monthly,'extract_verified',return_value={'format':2}))
                    stack.enter_context(patch.object(monthly.media,'read_state',return_value={'objects':[],'buckets':[]}))
                    stack.enter_context(patch.object(monthly,'hidden',return_value='private-credential-canary'))
                    stack.enter_context(patch.object(monthly.access,'run_test',side_effect=stage('access',{'status':'passed'})))
                    stack.enter_context(contextlib.redirect_stdout(output))
                    status=monthly.execute(args)
                report=json.loads((attempt.root/'relatorio.json').read_text())
                self.assertEqual(status,0 if fail_at is None else 1)
                self.assertEqual(report['status'],'passed' if fail_at is None else 'failed')
                self.assertEqual(calls[-1],'stop')
                self.assertFalse((root/'.ensaio-em-andamento').exists())
                if fail_at=='sql':self.assertNotIn('media',calls);self.assertNotIn('access',calls)
                if fail_at=='media':self.assertNotIn('access',calls)
                self.assertNotIn('private-error-password-canary',output.getvalue())
                self.assertNotIn('private-credential-canary',output.getvalue())

    @unittest.skipUnless(shutil.which('pwsh'),'PowerShell parser unavailable')
    def test_launcher_parses_in_powershell_without_executing_it(self):
        script=pathlib.Path(monthly.__file__).with_name('Start-RecoveryRehearsal.ps1')
        parser="param($p) $tokens=$null; $errors=$null; [System.Management.Automation.Language.Parser]::ParseFile($p,[ref]$tokens,[ref]$errors) | Out-Null; if ($errors.Count) { $errors | ForEach-Object { $_.Message }; exit 1 }"
        result=subprocess.run(['pwsh','-NoProfile','-NonInteractive','-Command','& {'+parser+'} '+"'"+str(script).replace("'","''")+"'"],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        self.assertEqual(result.returncode,0,result.stdout.decode()+result.stderr.decode())


@unittest.skipUnless(os.name=='nt','Windows DACL requires Windows')
class WindowsAccessTests(unittest.TestCase):
    def test_private_acl_is_repeatable_without_touching_owner_or_audit_sections(self):
        launcher=pathlib.Path(monthly.__file__).with_name('Start-RecoveryRehearsal.ps1')
        source=r"""
param($script,$directory)
$ErrorActionPreference='Stop'
$tokens=$null; $errors=$null
$ast=[System.Management.Automation.Language.Parser]::ParseFile($script,[ref]$tokens,[ref]$errors)
if ($errors.Count) { throw 'INVALID_POWERSHELL_SYNTAX' }
$fn=$ast.Find({ param($n) $n -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -eq 'Set-RehearsalPrivateAccess' },$true)
if (!$fn) { throw 'ACL_HELPER_MISSING' }
$body=$fn.Body.GetScriptBlock()
# Run twice against the same existing directory: the reported failure was on
# the second launcher invocation after CheckOnly had already created the ACL.
& $body $directory
& $body $directory
$item=New-Object System.IO.DirectoryInfo($directory)
$section=[System.Security.AccessControl.AccessControlSections]::Access
if ($PSVersionTable.PSEdition -eq 'Core') {
  $acl=[System.IO.FileSystemAclExtensions]::GetAccessControl($item,$section)
} else { $acl=$item.GetAccessControl($section) }
$rules=@($acl.GetAccessRules($true,$true,[System.Security.Principal.SecurityIdentifier]))
$ids=@([System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value,'S-1-5-18')
if (!$acl.AreAccessRulesProtected -or $rules.Count -ne 2) { throw 'ACL_NOT_PRIVATE' }
foreach ($rule in $rules) {
  if ($rule.IdentityReference.Value -notin $ids -or $rule.IsInherited -or
      $rule.AccessControlType -ne 'Allow' -or $rule.FileSystemRights -ne 'FullControl' -or
      [int]$rule.InheritanceFlags -ne 3) { throw 'ACL_RULE_UNEXPECTED' }
}
Write-Output 'PRIVATE_ACL_REPEATABLE'
"""
        for executable in ('powershell.exe','pwsh'):
            binary=shutil.which(executable)
            if not binary:continue
            with self.subTest(executable=executable),tempfile.TemporaryDirectory() as temp:
                quote=lambda text: "'"+str(text).replace("'","''")+"'"
                command='& {'+source+'} '+quote(launcher)+' '+quote(temp)
                result=subprocess.run([binary,'-NoProfile','-NonInteractive','-Command',command],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
                self.assertEqual(result.returncode,0,result.stdout.decode(errors='replace')+result.stderr.decode(errors='replace'))
                self.assertIn(b'PRIVATE_ACL_REPEATABLE',result.stdout)


class RetryTests(unittest.TestCase):
    def test_email_logins_are_enabled_while_global_signups_remain_disabled(self):
        import tomllib
        cfg=tomllib.loads(monthly.project_config('synthetic'))
        self.assertFalse(cfg['auth']['enable_signup'])
        self.assertTrue(cfg['auth']['email']['enable_signup'])

    def auth_info(self,attempt):
        return {'Name':'/supabase_auth_'+attempt.project,'Mounts':[],
                'HostConfig':{'RestartPolicy':{'Name':'unless-stopped'}},
                'Config':{'Image':'public.ecr.aws/supabase/gotrue:v2.185.0',
                          'Env':['GOTRUE_DISABLE_SIGNUP=true','GOTRUE_EXTERNAL_EMAIL_ENABLED=false','GOTRUE_JWT_SECRET=synthetic-private-secret'],
                          'ExposedPorts':{'9999/tcp':{}},'Entrypoint':['auth'],'Cmd':[],
                          'Labels':{'com.supabase.cli.project':attempt.project},
                          'Healthcheck':{'Test':['CMD','wget','--spider','http://127.0.0.1:9999/health'],'Interval':10000000000,'Timeout':2000000000,'Retries':3}}}

    def test_only_auth_is_recreated_and_old_container_and_global_signup_setting_are_preserved(self):
        with tempfile.TemporaryDirectory() as temp:
            attempt=monthly.Rehearsal(pathlib.Path(temp),'cli')
            attempt.root.mkdir();cfg=attempt.root/'ensaio'/'supabase';cfg.mkdir(parents=True)
            (cfg/'config.toml').write_text('[auth]\nenable_signup = false\n[auth.email]\nenable_signup = false\n')
            info=self.auth_info(attempt);calls=[];captured=[]
            def command(args,**kw):
                calls.append(args)
                if args[:2]==['docker','create']:
                    env=pathlib.Path(args[args.index('--env-file')+1]);captured.append(env.read_text())
                    self.assertNotIn('synthetic-private-secret',' '.join(args))
                return b''
            attempt.command=command
            monthly.enable_email_login(attempt,info)
            self.assertEqual([args[1] for args in calls],['rename','create'])
            self.assertTrue(calls[0][3].startswith(calls[0][2]+'-email-desativado-'))
            self.assertIn('GOTRUE_EXTERNAL_EMAIL_ENABLED=true',captured[0])
            self.assertIn('GOTRUE_DISABLE_SIGNUP=true',captured[0])
            self.assertIn('GOTRUE_JWT_SECRET=synthetic-private-secret',captured[0])
            self.assertFalse(list(attempt.root.glob('auth-env-*')))
            self.assertIn('[auth]\nenable_signup = false',(cfg/'config.toml').read_text())
            self.assertIn('[auth.email]\nenable_signup = true',(cfg/'config.toml').read_text())
            self.assertNotIn('synthetic-private-secret',json.dumps(attempt.report))

    def test_auth_with_external_mounts_or_enabled_signups_is_refused_before_any_mutation(self):
        for case in ('mount','signup','multiline'):
            with self.subTest(case=case),tempfile.TemporaryDirectory() as temp:
                attempt=monthly.Rehearsal(pathlib.Path(temp),'cli');info=self.auth_info(attempt)
                if case=='mount':info['Mounts']=[{'Source':'private'}]
                if case=='signup':info['Config']['Env'][0]='GOTRUE_DISABLE_SIGNUP=false'
                if case=='multiline':info['Config']['Env'].append('PRIVATE=canary\nunsafe')
                with patch.object(attempt,'command',side_effect=AssertionError('must not mutate')):
                    with self.assertRaises(monthly.Failed):monthly.enable_email_login(attempt,info)

    def test_access_retry_uses_read_only_validation_and_never_imports_or_copies_files(self):
        with tempfile.TemporaryDirectory() as temp:
            root=pathlib.Path(temp);attempt=monthly.Rehearsal(root,'cli','a'*32);attempt.root.mkdir()
            folder=attempt.root/'backup';folder.mkdir();(folder/'data.sql').write_text('COPY "auth"."users" ("id") FROM stdin;\n\\.\n')
            original={'run_id':attempt.run_id,'status':'failed','stage':'user_access','services_stopped':True,
                      'sql':{'status':'committed'},'media':{'admin_downloads_verified':1,'metadata_preserved':True},'package':{'storage_objects':1}}
            (attempt.root/'relatorio.json').write_text(json.dumps(original))
            args=argparse.Namespace(root=root,cli=root/'cli',retry_access=attempt.run_id)
            commands=[];attempt.command=lambda args,data=None,**kw:commands.append((args,data)) or b''
            def stop():attempt.report['services_stopped']=True
            with contextlib.ExitStack() as stack:
                for obj,name,kw in ((monthly,'Rehearsal',{'return_value':attempt}),
                                    (monthly,'resume_services',{}),(monthly.prepare,'verify_folder',{'return_value':{'created_at':dt.datetime.now(dt.timezone.utc).isoformat()}}),
                                    (attempt,'local_keys',{'return_value':('admin','public')}),
                                    (monthly.media,'read_state',{'return_value':{'objects':[],'buckets':[]}}),
                                    (monthly.media,'inventory',{'return_value':[]}),
                                    (monthly.media,'node_call',{}),(monthly.media,'verify_buckets_api',{}),(monthly.media,'verify_api',{}),
                                    (monthly,'hidden',{'return_value':'private-credential'}),
                                    (monthly.access,'run_test',{'return_value':{'status':'passed'}}),
                                    (attempt,'stop_own_services',{'side_effect':stop})):
                    stack.enter_context(patch.object(obj,name,**kw))
                imports=stack.enter_context(patch.object(attempt,'restore_sql',side_effect=AssertionError('no import')))
                copies=stack.enter_context(patch.object(attempt,'restore_media',side_effect=AssertionError('no copy')))
                with contextlib.redirect_stdout(io.StringIO()):self.assertEqual(monthly.retry_access(args),0)
                imports.assert_not_called();copies.assert_not_called()
            self.assertEqual(len(commands),1)
            sql=commands[0][1].decode()
            self.assertTrue(sql.startswith('BEGIN READ ONLY;'))
            self.assertNotIn('CREATE TEMP',sql);self.assertNotIn('INSERT INTO',sql)
            self.assertEqual(json.loads((attempt.root/'relatorio.json').read_text()),original)
            self.assertEqual(len(list(attempt.root.glob('retomada-*.json'))),1)
            self.assertFalse((root/'.ensaio-em-andamento').exists())


@unittest.skipUnless(os.environ.get('GOTRUE_TEST_IMAGE'),'disposable Docker Auth image required')
class NativeAuthRetryTests(unittest.TestCase):
    def test_recreation_changes_only_email_flag_keeps_prior_container_and_copies_no_database(self):
        image=os.environ['GOTRUE_TEST_IMAGE']
        with tempfile.TemporaryDirectory() as temp:
            attempt=monthly.Rehearsal(pathlib.Path(temp),'cli');attempt.root.mkdir()
            cfg=attempt.root/'ensaio'/'supabase';cfg.mkdir(parents=True)
            (cfg/'config.toml').write_text(monthly.project_config(attempt.project).replace('[auth.email]\nenable_signup = true','[auth.email]\nenable_signup = false'))
            name='supabase_auth_'+attempt.project
            attempt.command(['docker','network','create','--internal',attempt.network])
            try:
                attempt.command(['docker','create','--name',name,'--network',attempt.network,'--network-alias','auth',
                                 '--restart','unless-stopped','--expose','9999/tcp',
                                 '--env','GOTRUE_DISABLE_SIGNUP=true','--env','GOTRUE_EXTERNAL_EMAIL_ENABLED=false',
                                 '--env','GOTRUE_JWT_SECRET=synthetic-secret',
                                 '--health-cmd','wget --spider http://127.0.0.1:9999/health',image])
                before=json.loads(attempt.command(['docker','inspect',name]))[0]
                monthly.enable_email_login(attempt,before)
                after=json.loads(attempt.command(['docker','inspect',name]))[0]
                oldenv=dict(value.split('=',1) for value in before['Config']['Env'])
                newenv=dict(value.split('=',1) for value in after['Config']['Env'])
                expected={**oldenv,'GOTRUE_EXTERNAL_EMAIL_ENABLED':'true'}
                self.assertEqual(newenv,expected)
                self.assertEqual(after['Config']['Image'],before['Config']['Image'])
                self.assertEqual(after['Config']['Entrypoint'],before['Config']['Entrypoint'])
                self.assertEqual(after['Config']['Cmd'],before['Config']['Cmd'])
                self.assertEqual(set(after['NetworkSettings']['Networks']),{attempt.network})
                self.assertFalse(after['State']['Running'])
                self.assertFalse(after['Mounts'])
                names=attempt.command(['docker','ps','-a','--filter','name='+name,'--format','{{.Names}}']).decode().splitlines()
                self.assertEqual(len(names),2)
                self.assertTrue(any(item.startswith(name+'-email-desativado-') for item in names))
                self.assertFalse(list(attempt.root.glob('auth-env-*')))
            finally:
                # Only synthetic fixture containers generated by this test.
                names=attempt.command(['docker','ps','-a','--filter','name='+name,'--format','{{.Names}}']).decode().splitlines()
                for owned in names:
                    if owned==name or owned.startswith(name+'-email-desativado-'):
                        attempt.command(['docker','rm','-f',owned])
                attempt.command(['docker','network','rm',attempt.network])


class LifecycleClient(access_tests.FakeClient):
    def __init__(self,profile=True,blocked=True):
        super().__init__();self.profile=profile;self.blocked=blocked
    def json_request(self,method,route,token=None,body=None):
        if 'grant_type=password' in route:
            status,session=super().json_request(method,route,token,body)
            session['refresh_token']='synthetic-refresh-token';return status,session
        if route.startswith('/rest/v1/perfis'):
            return 200,[{'id':access_tests.UID if self.profile else access_tests.OTHER}]
        if 'grant_type=refresh_token' in route:
            return (400,{'error_code':'refresh_token_not_found'}) if self.blocked else (200,{'access_token':'unexpected-valid-token'})
        return super().json_request(method,route,token,body)


class LifecycleTests(unittest.TestCase):
    def test_monthly_auth_checks_profile_and_refresh_invalidation_and_cleans_up_unexpected_session(self):
        for profile,blocked in ((True,True),(False,True),(True,False)):
            with self.subTest(profile=profile,blocked=blocked):
                client=LifecycleClient(profile,blocked)
                report=monthly.access.run_test(access_tests.items(),{'buckets':[{'id':'private','public':False}]},'public','email','private-password',client,lambda c:{('private','allowed.txt')},lifecycle=True)
                self.assertEqual(report['status'],'passed' if profile and blocked else 'failed')
                self.assertEqual(report['logout_status'],204)
                self.assertNotIn('private-password',json.dumps(report))
                if not blocked:
                    self.assertIn(('POST','/auth/v1/logout?scope=local','unexpected-valid-token',None),client.calls)

    def test_new_loopback_port_is_allowed_but_custom_hosts_and_ports_are_blocked_before_credentials(self):
        class Opener:
            def open(self,request,timeout):
                self.url=request.full_url;return io.BytesIO()
        opener=Opener()
        client=monthly.access.LocalClient('public',opener,api=monthly.API)
        client.open('POST','/auth/v1/token',body={'password':'synthetic'})
        self.assertTrue(opener.url.startswith(monthly.API+'/'))
        for url in ('https://production.invalid','http://127.0.0.1:80','http://localhost:55321','http://0.0.0.0:55321'):
            with self.assertRaises(monthly.access.CheckFailed):monthly.access.LocalClient('public',opener,api=url).open('GET','/auth/v1/user')


if __name__=='__main__':unittest.main()

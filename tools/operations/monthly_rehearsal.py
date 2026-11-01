"""Assisted recovery of a fresh encrypted backup on disposable Windows services.

Never links to production, resets a database, deletes a container/volume, or
stores user credentials. Every attempt has a new project and private directory.
"""
import argparse
import base64
import contextlib
import datetime as dt
import getpass
import hashlib
import json
import os
import pathlib
import re
import shutil
import socket
import subprocess
import sys
import tarfile
import urllib.parse
import urllib.request
import uuid
import warnings

import apply_service_restore as apply
import b2_backup as b2
import backup
import prepare_service_restore as prepare
import restore_local_media as media
import verify_local_media_access as access

API = 'http://127.0.0.1:55321'
PG_IMAGE = 'public.ecr.aws/supabase/postgres:17.11.0.006'
HAPROXY = 'haproxy:3.2.0-alpine@sha256:2de6e08f57cd518c2f8e6d691e297477eff1113f7f6cc9ec314ea0d02b72195d'
EXCLUDE = 'realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'
SERVICES = ('db','storage','auth','rest','kong','inbucket')
PORTS = (55321,55322,55324)
MAX_EXPANDED = 4 * 1024**3
MAX_MEMBER = 512 * 1024**2


class Failed(Exception):
    def __init__(self, code): self.code = code


def hidden(prompt):
    with warnings.catch_warnings():
        warnings.simplefilter('error', getpass.GetPassWarning)
        return getpass.getpass(prompt)


def fresh_date(value, max_age_days, now=None):
    try:
        created = dt.datetime.fromisoformat(value.replace('Z','+00:00'))
        if created.tzinfo is None: raise ValueError()
        age = (now or dt.datetime.now(dt.timezone.utc)) - created
        if age < -dt.timedelta(minutes=10) or age > dt.timedelta(days=max_age_days): raise ValueError()
    except (ValueError,TypeError,AttributeError):
        raise Failed('BACKUP_DATE_OUTSIDE_WINDOW') from None


def safe_member(name):
    # Windows ADS, reserved devices, case folding and trailing dots/spaces matter
    # even when these tests run on Linux. Never use tar.extractall.
    if not isinstance(name,str) or not name or '\\' in name or name.startswith('/'):
        raise Failed('UNSAFE_ARCHIVE_PATH')
    parts = name.split('/')
    for part in parts:
        if not part or part in {'.','..'} or part[-1:] in {'.',' '} or re.search(r'[\x00-\x1f<>:"|?*]',part):
            raise Failed('UNSAFE_ARCHIVE_PATH')
        if re.fullmatch(r'(?i:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?',part):
            raise Failed('UNSAFE_ARCHIVE_PATH')
    return parts


def extract_verified(archive, destination, max_age_days):
    with tarfile.open(archive,'r:gz') as source:
        members, seen, total = [], set(), 0
        for entry in source:
            name = entry.name.removeprefix('./').rstrip('/') if entry.isdir() else entry.name.removeprefix('./')
            parts = safe_member(name)
            folded = '/'.join(parts).casefold()
            if folded in seen or not (entry.isfile() or entry.isdir()): raise Failed('UNSAFE_ARCHIVE_ENTRY')
            seen.add(folded)
            if entry.size < 0 or entry.size > MAX_MEMBER: raise Failed('ARCHIVE_SIZE_LIMIT')
            total += entry.size
            if total > MAX_EXPANDED or len(seen) > 100000: raise Failed('ARCHIVE_SIZE_LIMIT')
            members.append((entry,parts))
        # Check file/directory collisions before writing anything.
        files = {'/'.join(parts).casefold() for entry,parts in members if entry.isfile()}
        for _,parts in members:
            if any('/'.join(parts[:i]).casefold() in files for i in range(1,len(parts))):
                raise Failed('ARCHIVE_PATH_COLLISION')
        verified = backup.verify(archive)
        if verified['format'] != 2 or not verified['functions_schema_included']: raise Failed('FORMAT_2_REQUIRED')
        manifest_entry = next(entry for entry,parts in members if parts==['snapshot.json'])
        with source.extractfile(manifest_entry) as stream: manifest = json.load(stream)
        fresh_date(manifest['created_at'],max_age_days)
        destination.mkdir(mode=0o700)
        for entry,parts in members:
            path = destination.joinpath(*parts)
            if entry.isdir(): path.mkdir(parents=True,exist_ok=True,mode=0o700); continue
            path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
            with source.extractfile(entry) as reader, path.open('xb') as writer:
                shutil.copyfileobj(reader,writer,1048576)
            path.chmod(0o600)
    prepare.verify_folder(destination)
    return verified


class ReadOnlyB2(b2.B2):
    """No upload/prune path is reachable through this client's API dispatcher."""
    def api_call(self, operation, body):
        if operation not in {'b2_list_buckets','b2_list_file_versions','b2_get_file_info'}:
            raise Failed('B2_WRITE_FORBIDDEN')
        return super().api_call(operation,body)

    def authorize(self):
        encoded = base64.b64encode((self.key_id+':'+self.key).encode()).decode()
        auth = self.json('https://api.backblazeb2.com/b2api/v4/b2_authorize_account',
                         headers={'Authorization':'Basic '+encoded},method='GET')
        storage = auth.get('apiInfo',{}).get('storageApi',{})
        allowed = storage.get('allowed',{})
        buckets, caps = allowed.get('buckets'), set(allowed.get('capabilities',[]))
        required = {'listBuckets','listFiles','readFiles'}
        if not required.issubset(caps) or caps-required:
            raise Failed('B2_READ_ONLY_KEY_REQUIRED')
        if not isinstance(buckets,list) or len(buckets)!=1 or buckets[0].get('id')!=self.bucket_id or buckets[0].get('name') not in (None,self.bucket_name) or allowed.get('namePrefix') not in (None,''):
            raise Failed('B2_SINGLE_BUCKET_REQUIRED')
        if storage.get('s3ApiUrl') != 'https://s3.'+self.region+'.backblazeb2.com': raise Failed('B2_REGION_MISMATCH')
        self.api = storage.get('apiUrl','').rstrip('/')
        self.download_url = storage.get('downloadUrl','').rstrip('/')
        b2.safe_url(self.api+'/b2api/v4/b2_list_buckets')
        b2.safe_url(self.download_url+'/b2api/v4/b2_download_file_by_id')
        self.token,self.account = auth.get('authorizationToken',''),auth.get('accountId','')
        if not self.token or not self.account: raise Failed('B2_AUTH_FAILED')
        result = self.api_call('b2_list_buckets',{'accountId':self.account,'bucketId':self.bucket_id})
        found = result.get('buckets',[])
        if len(found)!=1 or found[0].get('bucketId')!=self.bucket_id or found[0].get('bucketName')!=self.bucket_name or found[0].get('bucketType')!='allPrivate':
            raise Failed('B2_PRIVATE_BUCKET_REQUIRED')

    def latest(self, destination, max_age_days):
        self.authorize()
        days = self.daily(self.inventory())
        if not days: raise Failed('B2_NO_MANAGED_BACKUP')
        row = days[max(days)]
        fresh_date(row['fileInfo']['backup-date']+'T00:00:00+00:00',max_age_days)
        digest,count = hashlib.sha256(),0
        url = self.download_url+'/b2api/v4/b2_download_file_by_id?'+urllib.parse.urlencode({'fileId':row['fileId']})
        with self.request(url,'GET',headers={'Authorization':self.token}) as response, destination.open('xb') as writer:
            for chunk in iter(lambda:response.read(1048576),b''):
                count += len(chunk)
                if count > self.size(row): raise Failed('B2_DOWNLOAD_SIZE')
                digest.update(chunk);writer.write(chunk)
        if count!=self.size(row) or digest.hexdigest()!=row['fileInfo']['backup-sha256']:
            raise Failed('B2_DOWNLOAD_HASH')
        return digest.hexdigest()


def project_config(project):
    return f'''project_id = "{project}"
[api]
port = 55321
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
[db]
port = 55322
shadow_port = 55320
major_version = 17
[db.migrations]
enabled = false
[db.seed]
enabled = false
[db.pooler]
enabled = false
[studio]
enabled = false
[realtime]
enabled = false
[local_smtp]
port = 55324
[storage]
enabled = true
file_size_limit = "500MiB"
[storage.analytics]
enabled = false
[storage.vector]
enabled = false
[auth]
site_url = "http://127.0.0.1:55321"
additional_redirect_urls = []
enable_signup = false
[auth.email]
enable_signup = false
'''


def gateway_config(project):
    config = '''global
    maxconn 64
defaults
    mode tcp
    timeout connect 5s
    timeout client 120s
    timeout server 120s
resolvers docker
    nameserver docker 127.0.0.11:53
    resolve_retries 3
    timeout resolve 1s
    timeout retry 1s
    hold valid 1s
    hold nx 1s
'''
    for label,port,target,service_port in (('db',5432,'db',5432),('api',8000,'kong',8000),('mail',8025,'inbucket',8025)):
        config += f'listen {label}\n    bind :{port}\n    server upstream supabase_{target}_{project}:{service_port} check resolvers docker init-addr last,libc,none\n'
    return config


class Rehearsal:
    def __init__(self, parent, cli, run_id=None):
        self.run_id = run_id or uuid.uuid4().hex
        if not re.fullmatch('[a-f0-9]{32}',self.run_id): raise Failed('INVALID_RUN_ID')
        self.root = parent / ('ensaio-'+self.run_id)
        self.project = 'batcaverna-mensal-'+self.run_id[:16]
        self.network,self.entry = self.project+'-interna',self.project+'-entrada'
        self.cli = str(cli)
        self.report = {'status':'failed','run_id':self.run_id,'stage':'preflight'}
        self.created_networks,self.start_attempted,self.gateway_created = [],False,False

    def command(self, args, data=None, private_log=None, timeout=180):
        result = subprocess.run(args,input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
                                timeout=timeout,env={**os.environ,'DO_NOT_TRACK':'1'})
        if private_log:
            apply.private_write(self.root/(private_log+'.out.log'),result.stdout)
            apply.private_write(self.root/(private_log+'.err.log'),result.stderr)
        if result.returncode: raise Failed('LOCAL_COMMAND_FAILED')
        return result.stdout

    def stage(self, name):
        self.report['stage']=name
        messages={'download':'Conferindo a copia de entrada...',
                  'decryption':'Descriptografando; o GPG pode pedir a frase secreta localmente...',
                  'package':'Conferindo e extraindo o pacote...',
                  'services':'Iniciando servicos novos e isolados. Aguarde...',
                  'sql':'Preparando e restaurando o SQL em transacao...',
                  'media':'Restaurando e verificando os bytes das midias...',
                  'user_access':'Conferindo login, perfil, midias e encerramento da sessao...'}
        print(messages[name],flush=True)

    def preflight(self):
        import sqlparse
        if sqlparse.__version__!='0.6.0': raise Failed('SQLPARSE_060_REQUIRED')
        if self.command([self.cli,'--version']).decode().strip()!='2.122.0': raise Failed('CLI_21220_REQUIRED')
        if self.command(['docker','info','--format','{{.OSType}}']).decode().strip()!='linux': raise Failed('DOCKER_LINUX_REQUIRED')
        self.command(['gpg','--version'])
        existing = self.command(['docker','ps','-a','--format','{{.Names}}']).decode().splitlines()
        if any(name==self.entry or name.endswith('_'+self.project) for name in existing): raise Failed('PROJECT_EXISTS')
        for port in PORTS:
            try:
                with socket.socket() as check:
                    if os.name=='nt': check.setsockopt(socket.SOL_SOCKET,socket.SO_EXCLUSIVEADDRUSE,1)
                    check.bind(('127.0.0.1',port))
            except OSError: raise Failed('REHEARSAL_PORT_OCCUPIED') from None

    def bootstrap(self):
        project_dir = self.root/'ensaio'/'supabase'
        project_dir.mkdir(parents=True,mode=0o700)
        (project_dir/'config.toml').write_text(project_config(self.project),encoding='utf-8')
        cfg = self.root/'encaminhamento.cfg'
        cfg.write_text(gateway_config(self.project),encoding='utf-8')
        for name,internal in ((self.network,True),(self.entry,False)):
            args = ['docker','network','create','--driver','bridge','--label','batcaverna.rehearsal='+self.run_id,
                    '--opt','com.docker.network.bridge.host_binding_ipv4=127.0.0.1']
            if internal: args += ['--internal']
            self.command([*args,name]);self.created_networks.append(name)
        # Create stopped first: attach the internal network before opening ports.
        self.command(['docker','create','--name',self.entry,'--network',self.entry,
                      '--label','batcaverna.rehearsal='+self.run_id,
                      '-p','127.0.0.1:55322:5432','-p','127.0.0.1:55321:8000','-p','127.0.0.1:55324:8025',
                      '--mount',f'type=bind,source={cfg},target=/usr/local/etc/haproxy/haproxy.cfg,readonly',HAPROXY])
        self.gateway_created=True
        self.command(['docker','network','connect',self.network,self.entry])
        self.command(['docker','start',self.entry])
        self.start_attempted=True
        self.command([self.cli,'start','--workdir',str(self.root/'ensaio'),'--network-id',self.network,'--exclude',EXCLUDE],
                     private_log='inicio',timeout=1800)
        self.assert_isolated()

    def assert_isolated(self):
        net = json.loads(self.command(['docker','network','inspect',self.network]))[0]
        if not net['Internal'] or net.get('Labels',{}).get('batcaverna.rehearsal')!=self.run_id:
            raise Failed('INTERNAL_NETWORK_REQUIRED')
        expected = {f'supabase_{service}_{self.project}' for service in SERVICES}
        names = {row['Name'] for row in net.get('Containers',{}).values()}
        if names != expected|{self.entry}: raise Failed('UNEXPECTED_NETWORK_MEMBERS')
        infos = json.loads(self.command(['docker','inspect',*sorted(expected)]))
        if len(infos)!=len(expected): raise Failed('SERVICES_MISSING')
        for info in infos:
            if not info['State']['Running'] or set(info['NetworkSettings']['Networks'])!={self.network}:
                raise Failed('SERVICE_NETWORK_UNSAFE')
            if any(info['NetworkSettings'].get('Ports',{}).values()): raise Failed('DATA_SERVICE_PORT_EXPOSED')
            if info['Config']['Image']==PG_IMAGE: continue
            if info['Name'].lstrip('/')=='supabase_db_'+self.project: raise Failed('POSTGRES_IMAGE_MISMATCH')
        gateway = json.loads(self.command(['docker','inspect',self.entry]))[0]
        if set(gateway['NetworkSettings']['Networks'])!={self.entry,self.network} or gateway['Config']['Image']!=HAPROXY:
            raise Failed('GATEWAY_UNSAFE')
        bindings = gateway['NetworkSettings'].get('Ports',{})
        wanted = {'5432/tcp':'55322','8000/tcp':'55321','8025/tcp':'55324'}
        if set(bindings)!=set(wanted): raise Failed('GATEWAY_PORT_UNSAFE')
        for port,bound in bindings.items():
            if bound != [{'HostIp':'127.0.0.1','HostPort':wanted[port]}]: raise Failed('GATEWAY_PORT_UNSAFE')
        media.inspect_local()

    @contextlib.contextmanager
    def target(self):
        # Scope existing tested helpers to this newly created isolated project.
        previous = prepare.CONTAINER,prepare.NETWORK,media.STORAGE,media.API
        prepare.CONTAINER,prepare.NETWORK = 'supabase_db_'+self.project,self.network
        media.STORAGE,media.API = 'supabase_storage_'+self.project,API
        try: yield
        finally: prepare.CONTAINER,prepare.NETWORK,media.STORAGE,media.API = previous

    def decrypt(self, archive, expected, keyring):
        if not re.fullmatch('[a-fA-F0-9]{64}',expected) or backup.digest(archive)!=expected.lower():
            raise Failed('ENCRYPTED_HASH_MISMATCH')
        if not keyring.is_dir(): raise Failed('KEYRING_NOT_FOUND')
        self.report['encrypted_sha256'] = expected.lower()
        target=self.root/'recuperado.tar.gz'
        # GPG's GUI pinentry requests the phrase locally; never pass it in argv.
        self.command(['gpg','--homedir',str(keyring),'--output',str(target),'--decrypt',str(archive)],
                     private_log='descriptografia',timeout=600)
        return target

    def restore_sql(self, folder):
        self.assert_isolated()
        manifest=prepare.verify_folder(folder)
        sql={name:(folder/name).read_text(encoding='utf-8-sig') for name in ('schema.sql','managed_schema.sql','functions_schema.sql','data.sql')}
        files,summary=prepare.prepare(sql,prepare.catalog())
        plan=self.root/'plano';plan.mkdir(mode=0o700)
        for name,text in files.items():
            (plan/name).write_text(text,encoding='utf-8',newline='\n')
        summary['files']={name:backup.digest(plan/name) for name in files}
        (plan/'plan.json').write_text(json.dumps(summary),encoding='utf-8')
        files,_,counts=apply.validate_plan(folder,plan)
        execution=plan/'execucao';execution.mkdir(mode=0o700)
        result=apply.run_restore(apply.transaction_sql(files,counts),execution)
        if result['status']!='committed' or result.get('tables_checked')!=len(counts) or result.get('rows_checked')!=sum(counts.values()):
            raise Failed('SQL_COMMIT_NOT_CONFIRMED')
        self.report['sql']=result
        self.report['backup_created_at']=manifest['created_at']
        # PostgREST started before the app schema existed.
        self.command(['docker','exec','-i',prepare.CONTAINER,'psql','-X','-q','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],
                     b"NOTIFY pgrst, 'reload schema';\n")

    def local_keys(self):
        config=json.loads(self.command([self.cli,'status','--workdir',str(self.root/'ensaio'),'-o','json']))
        admin,public=config.get('SERVICE_ROLE_KEY'),config.get('ANON_KEY')
        if not isinstance(admin,str) or not isinstance(public,str): raise Failed('LOCAL_KEYS_MISSING')
        access.validate_public_key(public)
        return admin,public

    def restore_media(self,folder,admin):
        self.assert_isolated()
        before=media.read_state()
        items=media.inventory(folder,prepare.verify_folder(folder),before)
        media.node_call({'action':'preflight','objects':[media.public_item(item) for item in items]})
        media.verify_buckets_api(before,admin)
        written=0
        for ordinal,item in enumerate(items,1):
            payload=media.public_item(item)
            payload['data']=base64.b64encode(item['source'].read_bytes()).decode()
            written+=int(media.node_call({'action':'write','object':payload})['written'])
            if ordinal%10==0 or ordinal==len(items):
                print('Midias conferidas: '+str(ordinal)+'/'+str(len(items)),flush=True)
        verified=media.verify_api(items,admin)
        if media.state_digest(before)!=media.state_digest(media.read_state()): raise Failed('MEDIA_METADATA_CHANGED')
        self.report['media']={'objects':len(items),'files_written':written,'admin_downloads_verified':verified,'metadata_preserved':True}
        return items,before

    def stop_own_services(self):
        """Stop only generated names, never delete volumes/networks or old trials."""
        names=[self.entry] if self.gateway_created else []
        if self.start_attempted:
            names += ['supabase_'+s+'_'+self.project for s in reversed(SERVICES)]
        failed=0
        for name in names:
            try:
                result=subprocess.run(['docker','inspect',name],stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=30)
                if result.returncode:
                    if b'No such' not in result.stderr: failed+=1
                    continue  # CLI may already have rolled back.
                info=json.loads(result.stdout)[0]
                networks=set(info['NetworkSettings']['Networks'])
                expected={self.network,self.entry} if name==self.entry else {self.network}
                if networks!=expected: failed+=1;continue
                self.command(['docker','stop','--time','10',name],timeout=60)
            except Exception: failed+=1
        self.report['services_stopped']=failed==0
        if failed: self.report['status']='failed';self.report['stop_error']=True


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive',type=pathlib.Path)
    parser.add_argument('--sha256')
    parser.add_argument('--b2-config',type=pathlib.Path)
    parser.add_argument('--keyring',type=pathlib.Path,required=True)
    parser.add_argument('--root',type=pathlib.Path,required=True)
    parser.add_argument('--cli',type=pathlib.Path,required=True)
    parser.add_argument('--max-age-days',type=int,default=7,choices=range(1,61),metavar='1..60')
    parser.add_argument('--check-only',action='store_true')
    args=parser.parse_args()
    if os.name!='nt': parser.error('O comando assistido e destinado ao Windows com Docker Desktop Linux.')
    # The PowerShell entry point grants a private Windows ACL to this parent.
    if not args.root.is_dir(): parser.error('Use o iniciador PowerShell para preparar a pasta privada.')
    if args.check_only:
        Rehearsal(args.root.resolve(),args.cli.resolve()).preflight()
        print(json.dumps({'status':'prerequisites_verified','cli_version':'2.122.0','docker_mode':'linux',
                          'ports_available':list(PORTS),'restore_started':False}))
        return 0
    if bool(args.archive)==bool(args.b2_config) or args.archive and not args.sha256:
        parser.error('Escolha --archive com --sha256, ou --b2-config.')
    return execute(args)


def execute(args):
    lock=args.root/'.ensaio-em-andamento'
    try: handle=lock.open('x',encoding='utf-8')
    except FileExistsError: sys.exit('Outro ensaio pode estar em andamento. Nao apague a trava sem conferir o processo.')
    attempt=Rehearsal(args.root.resolve(),args.cli.resolve())
    try:
        handle.write(str(os.getpid()));handle.close()
        attempt.root.mkdir(mode=0o700)
        print('Preparando ensaio novo. Os ambientes anteriores serao preservados.',flush=True)
        attempt.preflight()
        attempt.stage('download')
        archive,expected=args.archive,args.sha256
        if args.b2_config:
            cfg=json.loads(args.b2_config.read_text(encoding='utf-8-sig'))
            if set(cfg)!={'bucket_id','bucket_name','region'}: raise Failed('B2_CONFIG_INVALID')
            key_id=hidden('ID da chave B2 somente leitura (oculto): ')
            key=hidden('Chave de aplicacao B2 somente leitura (oculta): ')
            client=ReadOnlyB2(key_id,key,cfg['bucket_id'],cfg['bucket_name'],cfg['region'])
            client.opener=urllib.request.build_opener(urllib.request.ProxyHandler({}),b2.NoRedirects())
            archive=attempt.root/'backup.tar.gz.gpg'
            expected=client.latest(archive,args.max_age_days)
            client=key_id=key=None
        attempt.stage('decryption')
        clear=attempt.decrypt(archive.resolve(),expected,args.keyring.resolve())
        attempt.stage('package')
        folder=attempt.root/'backup'
        attempt.report['package']=extract_verified(clear,folder,args.max_age_days)
        attempt.stage('services')
        with attempt.target():
            attempt.bootstrap()
            attempt.stage('sql')
            attempt.restore_sql(folder)
            admin,public=attempt.local_keys()
            attempt.stage('media')
            items,state=attempt.restore_media(folder,admin)
            admin=None
            attempt.stage('user_access')
            print('Informe sua conta BatCaverna somente neste terminal. As entradas ficam ocultas.',flush=True)
            email=hidden('E-mail (oculto): ').strip()
            password=hidden('Senha da conta (oculta): ')
            result=access.run_test(items,state,public,email,password,client=access.LocalClient(public,api=API),lifecycle=True)
            email=password=None
            if media.state_digest(state)!=media.state_digest(media.read_state()): raise Failed('MEDIA_METADATA_CHANGED')
            attempt.report['access']=result
            if result['status']!='passed': raise Failed('USER_ACCESS_NOT_PASSED')
            attempt.report.update(status='passed',stage='complete')
    except KeyboardInterrupt:
        attempt.report.update(status='failed',failure='CANCELLED')
    except Exception as error:
        attempt.report.update(status='failed',failure=error.code if isinstance(error,Failed) else 'LOCAL_STAGE_FAILED')
    finally:
        attempt.stop_own_services()
        attempt.report['finished_at']=dt.datetime.now(dt.timezone.utc).isoformat()
        try:
            apply.private_write(attempt.root/'relatorio.json',json.dumps(attempt.report,indent=2).encode())
            print(json.dumps(attempt.report),flush=True)
        finally:
            handle.close();lock.unlink()
    return 0 if attempt.report['status']=='passed' else 1


if __name__=='__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit('Cancelado. Preserve o ambiente local; confira a trava antes de iniciar outro ensaio.')
    except Exception:
        sys.exit('Falha local. Preserve os arquivos privados; nenhum detalhe pessoal foi exibido.')

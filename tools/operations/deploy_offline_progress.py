"""Apply exactly the reviewed offline-progress migration. Never print DB credentials."""
import json, os, pathlib, subprocess, tempfile, urllib.request
version = '20261029160000'
name = 'offline_progress'
project = 'luoqlhgfmixvfqbfcdoc'
password = os.environ.get('SUPABASE_DB_PASSWORD', '')
token = os.environ.get('SUPABASE_ACCESS_TOKEN', '')
if not password or not token:
    raise SystemExit('Configured Supabase connection is incomplete.')
result = subprocess.run(['supabase','link','--project-ref',project],capture_output=True,text=True)
if result.returncode:
    raise SystemExit('Could not link the configured Supabase project.')
url = pathlib.Path('supabase/.temp/pooler-url').read_text().strip()
sql = pathlib.Path(f'supabase/migrations/{version}_{name}.sql').read_text()
history = sql.replace("'", "''")
query = 'begin;\n' + sql + f"\ndo $history$ begin if to_regclass('supabase_migrations.schema_migrations') is not null then insert into supabase_migrations.schema_migrations(version,name,statements) values('{version}','{name}',ARRAY['{history}']) on conflict(version) do nothing;end if;end $history$;\ncommit;"
with tempfile.NamedTemporaryFile(mode='w',suffix='.sql') as script:
    script.write(query);script.flush()
    result = subprocess.run(['psql','-X','--dbname',url,'--set','ON_ERROR_STOP=1','--quiet','--file',script.name],env={**os.environ,'PGPASSWORD':password,'PGSSLMODE':'require','PGAPPNAME':'batcaverna-offline-progresss'},capture_output=True,text=True)
    if result.returncode:
        raise SystemExit('Provider migration failed: '+result.stderr.replace(password,'[redacted]').replace(url,'[connection]')[-1200:])
print('Reviewed offline progress migration applied.')

"""Apply only the reviewed migration through the configured project DB connection."""
import os, pathlib, subprocess, tempfile
sql=pathlib.Path('supabase/migrations/20261026090000_explicit_executable_playtime.sql').read_text()
password=os.environ.get('SUPABASE_DB_PASSWORD','')
if not password or not os.environ.get('SUPABASE_ACCESS_TOKEN'):
 raise SystemExit('The configured Supabase project connection is incomplete.')
linked=subprocess.run(['supabase','link','--project-ref','luoqlhgfmixvfqbfcdoc'],capture_output=True,text=True)
if linked.returncode: raise SystemExit('Unable to link the configured Supabase project; check the project connection credentials.')
# CLI-generated connection selector; never print the URI or credentials.
url=pathlib.Path('supabase/.temp/pooler-url').read_text().strip()
query="begin read write;\n"+sql+"\ndo $history$ begin if to_regclass('supabase_migrations.schema_migrations') is not null then insert into supabase_migrations.schema_migrations(version,name,statements) values('20261026090000','explicit_executable_playtime',ARRAY['"+sql.replace("'","''")+"']) on conflict(version) do nothing; end if; end $history$;\ncommit;"
with tempfile.NamedTemporaryFile(mode='w',suffix='.sql') as script:
 script.write(query);script.flush()
 result=subprocess.run(['psql','-X','--dbname',url,'--set','ON_ERROR_STOP=1','--quiet','--file',script.name],env={**os.environ,'PGPASSWORD':password,'PGSSLMODE':'require','PGAPPNAME':'batcaverna-playtime-migration'},capture_output=True,text=True)
 if result.returncode:
  detail=result.stderr.replace(password,'[redacted]').replace(url,'[connection]')[-1500:]
  raise SystemExit('Database migration failed: '+detail)
print('Executable playtime migration applied successfully through the configured database connection.')

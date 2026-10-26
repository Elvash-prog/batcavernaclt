"""Apply only the reviewed executable-time migration using the management API."""
import json, os, pathlib, urllib.request, urllib.error
sql=pathlib.Path('supabase/migrations/20261026090000_explicit_executable_playtime.sql').read_text()
token=os.environ.get('SUPABASE_ACCESS_TOKEN','')
if not token: raise SystemExit('SUPABASE_ACCESS_TOKEN is not configured for this workflow.')
query="begin;\n"+sql+"\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('20261026090000','explicit_executable_playtime',ARRAY["+"'"+sql.replace("'","''")+"'"+"]) on conflict(version) do nothing;\ncommit;"
req=urllib.request.Request('https://api.supabase.com/v1/projects/luoqlhgfmixvfqbfcdoc/database/query',data=json.dumps({'query':query}).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},method='POST')
try:
 with urllib.request.urlopen(req,timeout=90) as response:
  if response.status!=201 and response.status!=200: raise SystemExit('Database update did not complete.')
except urllib.error.HTTPError as error: raise SystemExit(f'Database update failed: HTTP {error.code}') from None
print('Executable playtime migration applied successfully.')

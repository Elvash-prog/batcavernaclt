"""Apply only the reviewed executable-time migration using the management API."""
import json, os, pathlib, urllib.request, urllib.error
sql=pathlib.Path('supabase/migrations/20261026090000_explicit_executable_playtime.sql').read_text()
token=os.environ.get('SUPABASE_ACCESS_TOKEN','')
if not token: raise SystemExit('SUPABASE_ACCESS_TOKEN is not configured for this workflow.')
query="begin read write;\n"+sql+"\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('20261026090000','explicit_executable_playtime',ARRAY["+"'"+sql.replace("'","''")+"'"+"]) on conflict(version) do nothing;\ncommit;"
req=urllib.request.Request('https://api.supabase.com/v1/projects/luoqlhgfmixvfqbfcdoc/database/query',data=json.dumps({'query':query,'read_only':False}).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},method='POST')
try:
 with urllib.request.urlopen(req,timeout=90) as response:
  if response.status!=201 and response.status!=200: raise SystemExit('Database update did not complete.')
except urllib.error.HTTPError as error:
 detail=error.read().decode('utf-8','replace').replace(token,'[redacted]')[:1500]
 diagnostic=urllib.request.Request('https://api.supabase.com/v1/projects/luoqlhgfmixvfqbfcdoc/database/query',data=json.dumps({'query':"select current_setting('default_transaction_read_only') as default_read_only,current_setting('transaction_read_only') as transaction_read_only,pg_is_in_recovery() as replica",'read_only':False}).encode(),headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},method='POST')
 try:
  with urllib.request.urlopen(diagnostic,timeout=30) as response: print('Database transaction diagnostics: '+response.read().decode().replace(token,'[redacted]')[:1000])
 except urllib.error.HTTPError as diagnostic_error: print(f'Diagnostics unavailable: HTTP {diagnostic_error.code}')
 raise SystemExit(f'Database update failed: HTTP {error.code}: {detail}') from None
print('Executable playtime migration applied successfully.')

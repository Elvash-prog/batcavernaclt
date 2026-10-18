"""Audit resolved dependency versions through OSV. Sends public package coordinates only."""
import argparse,collections,datetime,json,pathlib,sys,tomllib,urllib.request,urllib.parse
ROOT=pathlib.Path(__file__).resolve().parents[2]

def cargo_inventory(lock,metadata=None):
 rows=lock['package']
 if metadata is not None:
  graph={p['id']:p for p in metadata['resolve']['nodes']}
  pending=[metadata['resolve']['root']];reachable=set()
  while pending:
   ident=pending.pop()
   if ident in reachable:continue
   reachable.add(ident);pending.extend(dep['pkg']for dep in graph[ident]['deps'])
  rows=[p for p in metadata['packages']if p['id']in reachable]
 return {('crates.io',p['name'],p['version'])for p in rows if (p.get('source')or'').startswith('registry+')}

def inventory(maven=None,cargo_metadata=None):
 packages=set()
 packages.update(cargo_inventory(tomllib.loads((ROOT/'desktop/src-tauri/Cargo.lock').read_text()),json.loads(pathlib.Path(cargo_metadata).read_text())if cargo_metadata else None))
 lock=json.loads((ROOT/'desktop/package-lock.json').read_text())
 for path,p in lock['packages'].items():
  if path and 'version' in p:packages.add(('npm',p.get('name') or path.rsplit('node_modules/',1)[-1],p['version']))
 deno=ROOT/'supabase/functions/deno.lock'
 if not deno.is_file():raise RuntimeError('Resolve and commit the Edge deno.lock before auditing')
 for key in json.loads(deno.read_text()).get('npm',{}):
  name,version=key.rsplit('@',1);packages.add(('npm',name,version))
 if maven:
  rows=json.loads(pathlib.Path(maven).read_text())
  if not rows:raise RuntimeError('Android dependency resolution was empty')
  for p in rows:packages.add(('Maven',p['name'],p['version']))
 return sorted(packages)

def request(path,body=None):
 data=None if body is None else json.dumps(body).encode()
 with urllib.request.urlopen(urllib.request.Request('https://api.osv.dev/v1/'+path,data=data,headers={'content-type':'application/json','user-agent':'BatCaverna-security-audit/1'}),timeout=30)as response:return json.load(response)

def audit(packages,transport=request):
 hits={}
 for offset in range(0,len(packages),100):
  batch=packages[offset:offset+100];pending=[({'package':{'ecosystem':e,'name':n},'version':v},p)for p in batch for e,n,v in [p]]
  while pending:
   result=transport('querybatch',{'queries':[q for q,_ in pending]})['results']
   if len(result)!=len(pending):raise RuntimeError('Incomplete OSV response')
   more=[]
   for(q,p),r in zip(pending,result):
    if r.get('error'):raise RuntimeError('OSV package query failed')
    for finding in r.get('vulns',[]):hits.setdefault(finding['id'],set()).add(p)
    if r.get('next_page_token'):more.append(({**q,'page_token':r['next_page_token']},p))
   pending=more
 findings=[]
 for ident,affected in sorted(hits.items()):
  detail=transport('vulns/'+urllib.parse.quote(ident,safe=''))
  if detail.get('withdrawn'):continue
  findings.append({'id':ident,'url':'https://osv.dev/vulnerability/'+ident,'summary':detail.get('summary',''),'severity':detail.get('severity',[]),'affected':[{'ecosystem':e,'name':n,'version':v}for e,n,v in sorted(affected)],'record':detail})
 return findings

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--maven');parser.add_argument('--cargo-metadata');parser.add_argument('--output',default='dependency-audit.json');args=parser.parse_args()
 result={'created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'incomplete'}
 try:
  packages=inventory(args.maven,args.cargo_metadata);result.update(packages=len(packages),ecosystems=dict(collections.Counter(p[0]for p in packages)),android_resolved=bool(args.maven),cargo_target='windows-resolved'if args.cargo_metadata else 'all-lock-targets',findings=audit(packages),status='complete')
 except Exception as error:
  result['error']=type(error).__name__;pathlib.Path(args.output).write_text(json.dumps(result,indent=2));print('Dependency audit incomplete; network or resolution failure',file=sys.stderr);return 2
 pathlib.Path(args.output).write_text(json.dumps(result,indent=2))
 print(json.dumps({k:v for k,v in result.items()if k!='findings'}));print(json.dumps([{'id':v['id'],'summary':v['summary'],'affected':v['affected']}for v in result['findings']]))
 return 1 if result['findings'] else 0

if __name__=='__main__':sys.exit(main())

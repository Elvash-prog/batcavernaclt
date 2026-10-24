import {instrument,metricRecorder} from '../_shared/operational-metrics.js';
import {igdbProbe} from './igdb.js';
import {createHandler} from './router.js';
import {backendKeys} from '../_shared/api-keys.js';
const env: Record<string,any>={};
for(const name of ['SUPABASE_URL','IGDB_CLIENT_ID','IGDB_CLIENT_SECRET','TMDB_KEY','SIGHTENGINE_API_USER','SIGHTENGINE_API_SECRET'])env[name]=Deno.env.get(name)||'';
const keys=backendKeys(name=>Deno.env.get(name));
env.SUPABASE_ANON_KEY=keys.publicKey;env.SUPABASE_SERVICE_ROLE_KEY=keys.secretKey;
// Shared Postgres limiter already used by bright-api; no per-instance-only protection.
env.USER_RATE_LIMITER={async limit({key}:{key:string}){
 const uid=key.slice(key.lastIndexOf(':')+1);
 const response=await fetch(env.SUPABASE_URL+'/rest/v1/rpc/clt_bright_api_limit',{
  method:'POST',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,'content-type':'application/json'},
  body:JSON.stringify({p_user_id:uid,p_cost:1}),signal:AbortSignal.timeout(6000),redirect:'error'
 });
 if(!response.ok)throw new Error('CONFIG');return {success:await response.json()===true};
}};
// One connectivity probe per isolate, shared with the token/query cache; no secrets in health.
env.IGDB_READY=igdbProbe(env);
Deno.serve(instrument(createHandler(env),{record:metricRecorder(env),background:(task:Promise<unknown>)=>{const runtime=(globalThis as any).EdgeRuntime;if(runtime?.waitUntil)runtime.waitUntil(task);else void task.catch(()=>{});}}));

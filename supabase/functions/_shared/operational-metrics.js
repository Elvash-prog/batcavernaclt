// Fixed labels and numerical aggregates only. No request body, search text or identity.
import {securityReporter} from './security-events.js';
export function metricRoute(request){const path=new URL(request.url).pathname;if(path.includes('/api/catalog/igdb/')||path.includes('/api/catalog/rawg/'))return 'igdb';if(path.includes('/api/catalog/tmdb/'))return 'tmdb';if(path.includes('/api/media/'))return 'media';if(path.includes('/api/steam-cover/'))return 'steam_cover';if(path.endsWith('/api/steam-free'))return 'steam_free';return 'other';}
export function instrument(handler,{record,background=task=>{void task.catch(()=>{});},service='native-api',clock=()=>performance.now(),reportSecurity=securityReporter()}){
 return async request=>{
  const started=clock();let response;
  try{response=await handler(request);}catch{response=new Response(JSON.stringify({error:'Serviço indisponível. Tente novamente mais tarde.'}),{status:500,headers:{'content-type':'application/json','cache-control':'no-store'}});}
  if(request.method!=='OPTIONS'&&!new URL(request.url).pathname.endsWith('/health')){
   const elapsed=Math.max(0,Math.min(120000,Math.round(clock()-started)));
   const metric={p_service:service,p_route:service==='bright-api'?'games':metricRoute(request),p_status:response.status,p_elapsed:elapsed};
   try{reportSecurity(metric);}catch{}
   // Anonymous failures must not amplify traffic into database writes.
   if(response.status>=200&&response.status<300)try{background(Promise.resolve().then(()=>record(metric)).catch(()=>{}));}catch{}
  }
  return response;
 };
}
export function metricRecorder(env){return async metric=>{if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)return;await fetch(env.SUPABASE_URL+'/rest/v1/rpc/clt_record_operational_metric',{method:'POST',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'content-type':'application/json'},body:JSON.stringify(metric),signal:AbortSignal.timeout(3000),redirect:'error'});};}

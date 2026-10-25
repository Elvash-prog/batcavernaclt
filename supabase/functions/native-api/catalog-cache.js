// Public IGDB data only: authentication and per-user rate limits run before this layer.
export const catalogTtl=body=>body.startsWith('translation:en:pt-BR:v1:')?604800:/where id = \d+;/.test(body)?604800:/search "/.test(body)?21600:3600;
async function digest(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('igdb:v2:'+value));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function rpc(env,name,data){
 const r=await fetch(env.SUPABASE_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,'content-type':'application/json'},body:JSON.stringify(data),redirect:'error',signal:AbortSignal.timeout(6000)});
 if(!r.ok)throw Error('CATALOG_CACHE');return r.json();
}
export async function persistentCatalogQuery(env,body,load){
 if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)return load();
 const key=await digest(body),lease=crypto.randomUUID();let claimed;
 try{
  claimed=await rpc(env,'clt_catalog_cache_claim',{p_key:key,p_lease:lease});
  for(let n=0;claimed.state==='wait'&&n<12;n++){
   await new Promise(resolve=>setTimeout(resolve,300));
   claimed=await rpc(env,'clt_catalog_cache_claim',{p_key:key,p_lease:lease});
  }
  if(claimed.state==='hit'&&Array.isArray(claimed.payload))return claimed.payload;
  if(claimed.state==='wait'){const e=Error('CATALOG_BUSY');e.status=429;throw e;}
 }catch(error){if(error.message==='CATALOG_BUSY')throw error;return load();}
 async function release(){
  // Release a failed owner's lease without caching an error or a fabricated empty response.
  try{await fetch(env.SUPABASE_URL+'/rest/v1/clt_catalog_cache?cache_key=eq.'+key+'&lease_id=eq.'+lease,{method:'PATCH',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,'content-type':'application/json'},body:JSON.stringify({lease_until:new Date(0).toISOString()}),signal:AbortSignal.timeout(3000)});}catch{}
 }
 try{
  const data=await load();
  try{const stored=await rpc(env,'clt_catalog_cache_store',{p_key:key,p_lease:lease,p_payload:data,p_ttl:catalogTtl(body)});if(!stored)await release();}catch{await release();}
  return data;
 }catch(error){
  await release();
  throw error;
 }
}

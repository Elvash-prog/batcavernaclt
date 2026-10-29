// Shared upstream budgets and public metadata cache. Never persist account progress here.
export class ProviderError extends Error {
 constructor(status=503,retryAfter=0){super(status===429?'O serviço atingiu o limite de consultas. Aguarde para tentar novamente.':'Serviço de jogos indisponível. Tente novamente.');this.status=status;this.retryAfter=retryAfter;}
}
export function retrySeconds(header,now=Date.now()){
 if(!header||!header.trim())return 60;const number=Number(header);if(Number.isFinite(number))return number>=0?Math.min(2147483640,Math.max(1,Math.ceil(number))):60;
 const date=Date.parse(header);return Number.isFinite(date)?Math.max(1,Math.ceil((date-now)/1000)):60;
}
export function createProviderRequests({url,key,fetcher=(...args)=>fetch(...args),clock=()=>Date.now(),sleep=ms=>new Promise(r=>setTimeout(r,ms))}){
 const memory=new Map(),inflight=new Map();
 async function rpc(name,body){let response;try{response=await fetcher(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(6000),redirect:'error'});}catch{throw new ProviderError();}if(!response.ok)throw new ProviderError();return response.json();}
 async function request(provider,endpoint,{headers={},signal,read=async r=>r.json()}={}){
  for(let attempt=0;attempt<2;attempt++){
   const permit=await rpc('clt_provider_reserve',{p_provider:provider});if(!permit.allowed)throw new ProviderError(429,permit.retry_after||60);
   let response;try{response=await fetcher(endpoint,{headers,signal:signal?AbortSignal.any([signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000),redirect:'error'});}catch{if(signal?.aborted||attempt)throw new ProviderError(502);await sleep(500+Math.floor(Math.random()*250));continue;}
   if(response.status===429){const seconds=retrySeconds(response.headers.get('retry-after'),clock());await rpc('clt_provider_pause',{p_provider:provider,p_seconds:seconds});throw new ProviderError(429,seconds);}
   if(response.status>=500&&!attempt){await sleep(500+Math.floor(Math.random()*250));continue;}
   if(!response.ok)throw new ProviderError(502);return read(response);
  }
  throw new ProviderError(502);
 }
 async function cached(identity,ttl,load,{publicMetadata=false}={}){
  const local=memory.get(identity);if(local&&local.until>clock())return local.value;
  if(inflight.has(identity))return inflight.get(identity);
  const task=(async()=>{
   let lease,hash;
   if(publicMetadata){hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity)))].map(x=>x.toString(16).padStart(2,'0')).join('');lease=crypto.randomUUID();
    let claim=await rpc('clt_provider_cache_claim',{p_key:hash,p_lease:lease});
    for(let n=0;claim.state==='wait'&&n<10;n++){await sleep(200);claim=await rpc('clt_provider_cache_claim',{p_key:hash,p_lease:lease});}
    if(claim.state==='hit'){memory.set(identity,{value:claim.payload,until:clock()+Math.min(ttl*1000,30000)});return claim.payload;}
    if(claim.state!=='fetch')throw new ProviderError(429,2);
   }
   try{const value=await load();if(publicMetadata)await rpc('clt_provider_cache_store',{p_key:hash,p_lease:lease,p_payload:value,p_ttl:ttl});memory.set(identity,{value,until:clock()+ttl*1000});if(memory.size>256)memory.delete(memory.keys().next().value);return value;}
   catch(error){if(publicMetadata)await rpc('clt_provider_cache_release',{p_key:hash,p_lease:lease}).catch(()=>{});throw error;}
  })();inflight.set(identity,task);try{return await task;}finally{inflight.delete(identity);}
 }
 return {request,cached};
}

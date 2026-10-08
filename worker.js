import images from './image-assets.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
async function catalog(request,env,url){
  if(request.method!=='GET')return json({error:'Método não permitido'},405);
  const match=url.pathname.match(/^\/api\/catalog\/(rawg|tmdb)\/(.+)$/);
  if(!match)return json({error:'Rota inválida'},404);
  const [,provider,path]=match;
  const allowed=provider==='rawg'?/^games(?:\/[0-9]+)?$/:/^(?:(?:search|discover)\/(?:movie|tv)|(?:movie|tv)\/[0-9]+(?:\/watch\/providers)?)$/;
  if(!allowed.test(path))return json({error:'Rota inválida'},404);
  const key=provider==='rawg'?env.RAWG_KEY:env.TMDB_KEY;
  if(!env.SUPABASE_URL||!env.SUPABASE_ANON_KEY||!key)return json({error:'Integração não configurada'},503);
  const auth=request.headers.get('Authorization')||'';
  if(!/^Bearer \S+$/.test(auth))return json({error:'Entre na conta para pesquisar'},401);
  try{
    const user=await fetch(new URL('/auth/v1/user',env.SUPABASE_URL),{headers:{Authorization:auth,apikey:env.SUPABASE_ANON_KEY},redirect:'error',signal:AbortSignal.timeout(10000)});
    if(!user.ok)return json({error:'Sessão inválida. Entre novamente.'},401);
    const upstream=new URL(path,provider==='rawg'?'https://api.rawg.io/api/':'https://api.themoviedb.org/3/');
    const params=new Set(['search','query','page','page_size','ordering','language','sort_by','vote_count.gte','with_genres','without_genres','with_original_language','with_keywords','without_keywords']);
    for(const [k,v] of url.searchParams){if(params.has(k)&&v.length<=500)upstream.searchParams.set(k,v);}
    if(provider==='rawg'){
      upstream.searchParams.set('key',key);
      upstream.searchParams.set('page_size',String(Math.min(40,Math.max(1,Number(upstream.searchParams.get('page_size'))||20))));
    }else{upstream.searchParams.set('api_key',key);upstream.searchParams.set('include_adult','false');}
    const response=await fetch(upstream,{redirect:'error',signal:AbortSignal.timeout(15000)});
    if(!response.ok)return json({error:'Catálogo indisponível. Tente novamente.'},response.status===429?429:502);
    const data=await response.json();
    // RAWG inclui URLs de paginação com a chave; o cliente não precisa delas.
    if(provider==='rawg'&&data&&typeof data==='object'){delete data.next;delete data.previous;}
    return json(data);
  }catch(_){return json({error:'Não foi possível consultar o catálogo'},502);}
}
export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==='/config.js'){
      const config={SUPABASE_URL:env.SUPABASE_URL||'',SUPABASE_ANON_KEY:env.SUPABASE_ANON_KEY||'',RAWG_ENABLED:!!env.RAWG_KEY,TMDB_ENABLED:!!env.TMDB_KEY};
      return new Response('window.BC_CONFIG='+JSON.stringify(config)+';',{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
    }
    if(url.pathname.startsWith('/api/catalog/'))return catalog(request,env,url);
    if(Object.prototype.hasOwnProperty.call(images,url.pathname)){
      const bytes=Uint8Array.from(atob(images[url.pathname]),c=>c.charCodeAt(0));
      return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=86400'}});
    }
    if(url.pathname==='/'||!url.pathname.includes('.'))return env.ASSETS.fetch(new Request(new URL('/index.html',request.url),request));
    return env.ASSETS.fetch(request);
  }
};

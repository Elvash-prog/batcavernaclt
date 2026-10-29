import {translateDescription} from './translation.js';
import {igdbCatalog} from './igdb.js';
import {filterCatalog,authenticate} from './handlers.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...(status===429?{'Retry-After':'60'}:{})}});
async function catalog(request,env,url){
  if(request.method!=='GET')return json({error:'Método não permitido'},405);
  const match=url.pathname.match(/^\/api\/catalog\/(igdb|rawg|tmdb)\/(.+)$/);
  if(!match)return json({error:'Rota inválida'},404);
  const [,provider,path]=match;
  const allowed=provider!=='tmdb'?/^games(?:\/[0-9]+)?$/:/^(?:(?:search\/(?:movie|tv|multi)|discover\/(?:movie|tv))|(?:movie|tv)\/[0-9]+(?:\/watch\/providers)?)$/;
  if(!allowed.test(path))return json({error:'Rota inválida'},404);
  // Legacy /rawg routes remain aliases for installed clients; no RAWG API is called.
  if(provider!=='tmdb'){try{await authenticate(request,env);return await igdbCatalog(env,url,path,provider==='rawg')}catch(e){return json({error:e.message==='RATE_LIMIT'?'Aguarde um instante.':e.message==='UNAUTHORIZED'?'Sessão inválida.':'Serviço temporariamente indisponível.'},e.message==='RATE_LIMIT'?429:e.message==='UNAUTHORIZED'?401:503)}}
  const key=String(env.TMDB_KEY||'').trim().replace(/^Bearer\s+/i,'');
  if(!env.SUPABASE_URL||!env.SUPABASE_ANON_KEY||!key)return json({error:'Integração não configurada'},503);
  const auth=request.headers.get('Authorization')||'';
  if(!/^Bearer \S+$/.test(auth))return json({error:'Entre na conta para pesquisar'},401);
  let etapa='auth';
  try{
    await authenticate(request,env);
    etapa='catalog';
    const upstream=new URL(path,'https://api.themoviedb.org/3/');
    const params=new Set(['search','query','page','page_size','ordering','language','sort_by','vote_count.gte','with_genres','without_genres','with_original_language','with_keywords','without_keywords']);
    for(const [k,v] of url.searchParams){if(params.has(k)&&v.length<=500)upstream.searchParams.set(k,v);}
    if(!key.includes('.'))upstream.searchParams.set('api_key',key);upstream.searchParams.set('include_adult','false');upstream.searchParams.set('language','pt-BR');
    const headers={Accept:'application/json'};if(provider==='tmdb'&&key.includes('.'))headers.Authorization='Bearer '+key;
    let response=await fetch(upstream,{headers,redirect:'manual',signal:AbortSignal.timeout(15000)});
    if([500,502,503,504].includes(response.status))response=await fetch(upstream,{headers,redirect:'manual',signal:AbortSignal.timeout(15000)});
    if(response.status>=300&&response.status<400)return json({error:'O catálogo redirecionou a consulta. Tente novamente.',code:'CATALOG_REDIRECT'},502);
    if(!response.ok){
      const invalid=response.status===401||response.status===403;
      return json({error:invalid?'O catálogo '+'de filmes e séries'+' recusou a chave de acesso.':response.status===429?'O catálogo atingiu o limite de consultas. Tente novamente em instantes.':'O catálogo está indisponível. Tente novamente.',code:invalid?'CATALOG_AUTH_FAILED':response.status===429?'CATALOG_RATE_LIMIT':'CATALOG_UNAVAILABLE'},invalid?503:response.status===429?429:502);
    }
    etapa='response';
    const data=await response.json();
    // Localized provider descriptions take precedence. Fetch English only if pt-BR is missing.
    if(/^(movie|tv)\/\d+$/.test(path)&&!data.overview){
      try{const english=new URL(upstream);english.searchParams.set('language','en-US');const fallback=await fetch(english,{headers,redirect:'error',signal:AbortSignal.timeout(8000)});if(fallback.ok){const source=await fallback.json();if(source.adult!==true&&source.overview){const translated=await translateDescription(env,source.overview);data.overview=translated.text;data.description_language=translated.translated?'pt-BR':'en';}}}catch{}
    }

    const filtered=filterCatalog(data);return filtered instanceof Response?filtered:json(filtered);
  }catch(e){
    if(e.message==='CONFIG')return json({error:'Serviço temporariamente indisponível.'},503);
    if(e.message==='UNAUTHORIZED')return json({error:'Sessão inválida. Entre novamente.'},401);if(e.message==='RATE_LIMIT')return json({error:'Aguarde um minuto antes de pesquisar novamente.'},429);const timeout=e&&['TimeoutError','AbortError'].includes(e.name);
    return json({error:timeout?'A consulta demorou demais. Tente novamente.':etapa==='auth'?'Não foi possível validar a conexão da conta.':etapa==='response'?'O catálogo retornou uma resposta inválida.':'Não foi possível conectar ao catálogo. Tente novamente.',code:timeout?'CATALOG_TIMEOUT':etapa==='auth'?'AUTH_CONNECTION_FAILED':etapa==='response'?'CATALOG_INVALID_RESPONSE':'CATALOG_CONNECTION_FAILED'},502);
  }
}
async function steamFree(request,env){
 if(request.method!=='GET')return json({error:'Método não permitido'},405);
 const r=await fetch(env.SUPABASE_URL+'/functions/v1/bright-api',{method:'POST',headers:{Authorization:request.headers.get('Authorization'),apikey:env.SUPABASE_ANON_KEY,'content-type':'application/json'},body:JSON.stringify({op:'gratis'}),redirect:'error',signal:AbortSignal.timeout(35000)});
 if(!r.ok){const headers={'content-type':'application/json','cache-control':'no-store'};if(r.status===429)headers['retry-after']=r.headers.get('retry-after')||'60';return new Response(JSON.stringify({error:r.status===429?'Aguarde antes de atualizar as ofertas.':'Ofertas indisponíveis.'}),{status:r.status===429?429:503,headers});}
 const data=await r.json();if(data.steamError)return json({error:'Ofertas Steam temporariamente indisponíveis.'},503);return json({steam:data.steam||[],updatedAt:new Date().toISOString()});
}
async function steamCover(request,env,id){
 if(request.method!=='GET')return json({error:'Método não permitido'},405);
 if(!/^[1-9][0-9]{0,9}$/.test(id))return json({error:'Jogo inválido'},400);
 const r=await fetch(env.SUPABASE_URL+'/functions/v1/bright-api',{method:'POST',headers:{Authorization:request.headers.get('Authorization'),apikey:env.SUPABASE_ANON_KEY,'content-type':'application/json'},body:JSON.stringify({op:'steamInfo',appids:[Number(id)]}),redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!r.ok)return new Response(JSON.stringify({error:'Capa temporariamente indisponível.'}),{status:r.status===429?429:503,headers:{'content-type':'application/json',...(r.status===429?{'retry-after':r.headers.get('retry-after')||'60'}:{})}});
 const result=await r.json();return json({capa:result.lista?.[0]?.capa||''});
}

export {catalog,steamFree,steamCover};

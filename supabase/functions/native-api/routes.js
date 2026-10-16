import {filterCatalog,authenticate} from './handlers.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
async function catalog(request,env,url){
  if(request.method!=='GET')return json({error:'Método não permitido'},405);
  const match=url.pathname.match(/^\/api\/catalog\/(rawg|tmdb)\/(.+)$/);
  if(!match)return json({error:'Rota inválida'},404);
  const [,provider,path]=match;
  const allowed=provider==='rawg'?/^games(?:\/[0-9]+)?$/:/^(?:(?:search\/(?:movie|tv|multi)|discover\/(?:movie|tv))|(?:movie|tv)\/[0-9]+(?:\/watch\/providers)?)$/;
  if(!allowed.test(path))return json({error:'Rota inválida'},404);
  const key=String((provider==='rawg'?env.RAWG_KEY:env.TMDB_KEY)||'').trim().replace(/^Bearer\s+/i,'');
  if(!env.SUPABASE_URL||!env.SUPABASE_ANON_KEY||!key)return json({error:'Integração não configurada'},503);
  const auth=request.headers.get('Authorization')||'';
  if(!/^Bearer \S+$/.test(auth))return json({error:'Entre na conta para pesquisar'},401);
  let etapa='auth';
  try{
    await authenticate(request,env);
    etapa='catalog';
    const upstream=new URL(path,provider==='rawg'?'https://api.rawg.io/api/':'https://api.themoviedb.org/3/');
    const params=new Set(['search','query','page','page_size','ordering','language','sort_by','vote_count.gte','with_genres','without_genres','with_original_language','with_keywords','without_keywords']);
    for(const [k,v] of url.searchParams){if(params.has(k)&&v.length<=500)upstream.searchParams.set(k,v);}
    if(provider==='rawg'){
      upstream.searchParams.set('key',key);
      upstream.searchParams.set('page_size',String(Math.min(40,Math.max(1,Number(upstream.searchParams.get('page_size'))||20))));
    }else{if(!key.includes('.'))upstream.searchParams.set('api_key',key);upstream.searchParams.set('include_adult','false');}
    const headers={Accept:'application/json'};if(provider==='tmdb'&&key.includes('.'))headers.Authorization='Bearer '+key;
    let response=await fetch(upstream,{headers,redirect:'manual',signal:AbortSignal.timeout(15000)});
    if([500,502,503,504].includes(response.status))response=await fetch(upstream,{headers,redirect:'manual',signal:AbortSignal.timeout(15000)});
    if(response.status>=300&&response.status<400)return json({error:'O catálogo redirecionou a consulta. Tente novamente.',code:'CATALOG_REDIRECT'},502);
    if(!response.ok){
      const invalid=response.status===401||response.status===403;
      return json({error:invalid?'O catálogo '+(provider==='rawg'?'de jogos':'de filmes e séries')+' recusou a chave de acesso.':response.status===429?'O catálogo atingiu o limite de consultas. Tente novamente em instantes.':'O catálogo está indisponível. Tente novamente.',code:invalid?'CATALOG_AUTH_FAILED':response.status===429?'CATALOG_RATE_LIMIT':'CATALOG_UNAVAILABLE'},invalid?503:response.status===429?429:502);
    }
    etapa='response';
    const data=await response.json();
    // RAWG inclui URLs de paginação com a chave; o cliente não precisa delas.
    if(provider==='rawg'&&data&&typeof data==='object'){delete data.next;delete data.previous;}
    const filtered=filterCatalog(data);return filtered instanceof Response?filtered:json(filtered);
  }catch(e){
    if(e.message==='UNAUTHORIZED')return json({error:'Sessão inválida. Entre novamente.'},401);if(e.message==='RATE_LIMIT')return json({error:'Aguarde um minuto antes de pesquisar novamente.'},429);const timeout=e&&['TimeoutError','AbortError'].includes(e.name);
    return json({error:timeout?'A consulta demorou demais. Tente novamente.':etapa==='auth'?'Não foi possível validar a conexão da conta.':etapa==='response'?'O catálogo retornou uma resposta inválida.':'Não foi possível conectar ao catálogo. Tente novamente.',code:timeout?'CATALOG_TIMEOUT':etapa==='auth'?'AUTH_CONNECTION_FAILED':etapa==='response'?'CATALOG_INVALID_RESPONSE':'CATALOG_CONNECTION_FAILED'},502);
  }
}
function steamFreeRows(html){
  const games=[],seen=new Set();
  for(const match of html.matchAll(/<a\b[^>]*\bclass="[^"]*\bsearch_result_row\b[^"]*"[^>]*>[\s\S]*?<\/a>/g)){
    const row=match[0],id=(row.match(/data-ds-appid="(\d+)"/)||[])[1];
    const title=(row.match(/<span\b[^>]*class="title"[^>]*>([\s\S]*?)<\/span>/)||[])[1];
    if(!id||!title||seen.has(id)||!(/data-discount="100"/.test(row)&&/data-price-final="0"/.test(row)))continue;
    const tags=(row.match(/data-ds-tagids="([^"]*)"/)||[])[1]||'';
    if(/\b(?:5611|6650|12095)\b/.test(tags))continue;
    seen.add(id);
    const nome=title.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
    if(/\b(?:hentai|porn(?:o|ography|ographic)?|nsfw|erotic|sexual content|adult only|sex simulator|nudity)\b/i.test(nome))continue;
    games.push({appid:Number(id),nome,capa:'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/'+id+'/header.jpg',url:'https://store.steampowered.com/app/'+id+'/',agora:true,tipo:/\bdlc\b/i.test(row)?'DLC':'Jogo'});
  }
  return games;
}
async function steamFree(request,ctx){
  if(request.method!=='GET')return json({error:'Método não permitido'},405);
  const cacheKey=new Request(new URL('/api/steam-free',request.url));
  const cache=globalThis.caches&&caches.default;
  if(cache){const hit=await cache.match(cacheKey);if(hit)return hit;}
  try{
    const categories=[['998','Jogo'],['21','DLC']],games=[],seen=new Set();
    for(const [category,type] of categories){const url='https://store.steampowered.com/search/results/?query&start=0&count=100&maxprice=free&specials=1&category1='+category+'&cc=br&l=brazilian&infinite=1';const res=await fetch(url,{redirect:'manual',headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});if(!res.ok||res.status>=300)throw new Error('upstream');const data=await res.json();if(!data.success||typeof data.results_html!=='string')throw new Error('invalid');const rows=steamFreeRows(data.results_html);if(Number(data.total_count)>0&&!rows.length&&!data.results_html.includes('search_result_row'))throw new Error('markup');for(const row of rows)if(!seen.has(row.appid)){seen.add(row.appid);games.push({...row,tipo:type})}}
    const response=new Response(JSON.stringify({steam:games,updatedAt:new Date().toISOString()}),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=300'}});
    if(cache&&ctx)ctx.waitUntil(cache.put(cacheKey,response.clone()));
    return response;
  }catch(e){return json({error:'Não foi possível atualizar as ofertas da Steam. Tente novamente.'},502);}
}
async function steamCover(request,ctx,id){
  if(request.method!=='GET')return json({error:'Método não permitido'},405);
  if(!/^\d{1,10}$/.test(id))return json({error:'Jogo inválido'},400);
  const key=new Request(new URL('/api/steam-cover/'+id,request.url)),cache=globalThis.caches&&caches.default;
  if(cache){const hit=await cache.match(key);if(hit)return hit;}
  try{
    const r=await fetch('https://store.steampowered.com/api/appdetails?appids='+id+'&filters=basic&l=brazilian',{redirect:'manual',signal:AbortSignal.timeout(10000)});
    if(!r.ok||r.status>=300)throw new Error('steam');
    const d=await r.json(),app=d[id],cover=app&&app.success&&app.data&&(app.data.header_image||app.data.capsule_image);
    if(!cover||!/^https:\/\/[^/]*steamstatic\.com\//i.test(cover))return json({capa:''},200);
    const res=new Response(JSON.stringify({capa:cover}),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=86400'}});
    if(cache&&ctx)ctx.waitUntil(cache.put(key,res.clone()));return res;
  }catch(e){return json({error:'Capa indisponível na Steam'},502);}
}

export {catalog,steamFree,steamCover};

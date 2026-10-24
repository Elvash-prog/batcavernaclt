// All Twitch credentials and application tokens remain inside the Edge Function.
import {translateDescription} from './translation.js';
import {adultContent} from './handlers.js';
import {persistentCatalogQuery} from './catalog-cache.js';
const clients=new WeakMap();
const FIELDS='id,name,slug,summary,storyline,first_release_date,cover.image_id,artworks.image_id,screenshots.image_id,genres.name,platforms.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,total_rating,total_rating_count,themes.name,age_ratings.rating_category.rating,age_ratings.rating_content_descriptions.description,alternative_names.name,websites.url';
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export function igdbImage(id,size='cover_big'){
 return /^[A-Za-z0-9_-]{1,150}$/.test(id||'')?`https://images.igdb.com/igdb/image/upload/t_${size}/${id}.jpg`:'';
}
export function blockedGame(g){
 const ratings=g.age_ratings||[];
 if((g.themes||[]).some(t=>t.id===42||/erotic/i.test(t.name||'')))return true;
 if(ratings.some(r=>/\bAO\b|adults?\s*only/i.test(r.rating_category?.rating||'')))return true;
 const descriptions=ratings.flatMap(r=>r.rating_content_descriptions||[]).map(d=>d.description||'').join(' ');
 if(/sexual content|strong sexual|nudity|nude|sex simulation|pornograph|hentai|erotic/i.test(descriptions))return true;
 return adultContent({...g,tags:[...(g.themes||[]),...(g.alternative_names||[])]});
}
export function normalizeGame(g){
 const poster=igdbImage(g.cover?.image_id),landscape=igdbImage(g.artworks?.[0]?.image_id||g.screenshots?.[0]?.image_id,'screenshot_huge');
 const images=[...(g.artworks||[]),...(g.screenshots||[])].map(x=>igdbImage(x.image_id,'screenshot_huge')).filter(Boolean);
 const companies=g.involved_companies||[];
 const rating=Number(g.total_rating),count=Number(g.total_rating_count)||0;
 return {id:g.id,igdb_id:g.id,source:'igdb',name:g.name,slug:g.slug||'',adult:false,
  released:Number.isFinite(g.first_release_date)?new Date(g.first_release_date*1000).toISOString().slice(0,10):'',
  description_raw:[g.summary,g.storyline].filter(Boolean).join('\n\n'),overview:g.summary||'',
  background_image:landscape||poster,background_image_additional:images[1]||poster,cover_image:poster||landscape,
  screenshots:images,short_screenshots:images.map(image=>({image})),
  genres:(g.genres||[]).map(x=>({id:x.id,name:x.name})),
  platforms:(g.platforms||[]).map(x=>({platform:{id:x.id,name:x.name}})),
  developers:companies.filter(x=>x.developer).map(x=>({name:x.company?.name||''})),
  publishers:companies.filter(x=>x.publisher).map(x=>({name:x.company?.name||''})),
  rating:count>0&&Number.isFinite(rating)?Math.max(0,Math.min(5,rating/20)):null,rating_top:5,ratings_count:count,
  stores:(g.websites||[]).filter(x=>/^https?:\/\/store\.steampowered\.com\/app\/\d+/i.test(x.url||'')).map(()=>({store:{name:'Steam'}})),
  // Native clients currently open store links only; do not offer unsupported video links.
  videos:[],
  alternative_names:(g.alternative_names||[]).map(x=>x.name)};
}
export function titleKey(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[™®©]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim()}
export function gameSearchScore(game,query){const q=titleKey(query),words=q.split(' ').filter(Boolean);if(!words.length)return 0;return Math.max(0,...[game.name,...(game.alternative_names||[]).map(x=>x.name)].map((name,index)=>{const key=titleKey(name),tokens=key.split(' ');if(key===q)return index?990:1000;if(!words.every(w=>tokens.some(t=>/^\d+$/.test(w)?t===w:t.startsWith(w))))return 0;return (key.startsWith(q)?800:500)-Math.abs(tokens.length-words.length)}))}
class IgdbError extends Error {constructor(status){super('IGDB');this.status=status;}}
function client(env){
 if(clients.has(env))return clients.get(env);
 let access='',expires=0,refresh=null,queue=Promise.resolve(),last=0;
 const cache=new Map();
 async function token(){
  if(access&&expires>Date.now()+60000)return access;
  if(!refresh)refresh=(async()=>{
   const body=new URLSearchParams({client_id:env.IGDB_CLIENT_ID,client_secret:env.IGDB_CLIENT_SECRET,grant_type:'client_credentials'});
   const r=await fetch('https://id.twitch.tv/oauth2/token',{method:'POST',body,redirect:'error',signal:AbortSignal.timeout(12000)});
   if(!r.ok)throw new IgdbError(503);
   const d=await r.json();if(!/^[A-Za-z0-9_-]{10,2048}$/.test(d.access_token||''))throw new IgdbError(503);
   access=d.access_token;expires=Date.now()+Math.max(0,Number(d.expires_in)||0)*1000;return access;
  })().finally(()=>{refresh=null});
  return refresh;
 }
 async function post(body){
  for(let attempt=0;attempt<3;attempt++){
   const bearer=await token();
   // Serialize this isolate to stay below 4 requests/s; 429 also handles other isolates.
   const previous=queue;let release;queue=new Promise(resolve=>{release=resolve});await previous;
   let r;
   try{const delay=300-(Date.now()-last);if(delay>0)await new Promise(resolve=>setTimeout(resolve,delay));last=Date.now();
    r=await fetch('https://api.igdb.com/v4/games',{method:'POST',headers:{'Client-ID':env.IGDB_CLIENT_ID,Authorization:'Bearer '+bearer,'Content-Type':'text/plain',Accept:'application/json'},body,redirect:'error',signal:AbortSignal.timeout(15000)});
   }finally{release()}
   if(r.status===401&&attempt===0){access='';expires=0;continue;}
   if(r.status===429&&attempt<2){await new Promise(resolve=>setTimeout(resolve,Math.min(2000,Math.max(1000,Number(r.headers.get('retry-after'))*1000||1000))));continue;}
   if(!r.ok)throw new IgdbError(r.status===429?429:502);
   const data=await r.json();if(!Array.isArray(data))throw new IgdbError(502);return data;
  }
  throw new IgdbError(503);
 }
 async function query(body){
  const existing=cache.get(body);if(existing&&existing.until>Date.now())return existing.task;
  const task=persistentCatalogQuery(env,body,()=>post(body)).catch(error=>{if(cache.get(body)?.task===task)cache.delete(body);throw error});
  cache.set(body,{task,until:Date.now()+15*60000});if(cache.size>200)cache.delete(cache.keys().next().value);return task;
 }
 const value={query};clients.set(env,value);return value;
}
export async function igdbProbe(env){
 if(!env.IGDB_CLIENT_ID||!env.IGDB_CLIENT_SECRET)return false;
 try{const games=await client(env).query(`fields ${FIELDS}; search "Horizon Zero Dawn"; where (themes = null | themes != (42)); limit 20;`);return games.some(g=>!blockedGame(g)&&gameSearchScore(g,"Horizon Zero Dawn")===1000);}catch{return false}
}
export async function igdbCatalog(env,url,path,legacy=false){
 if(!env.IGDB_CLIENT_ID||!env.IGDB_CLIENT_SECRET)return response({error:'IGDB ainda não configurado.'},503);
 const externalId=path.split('/')[1];
 // Legacy clients may retain RAWG search results in memory. Never interpret those IDs as IGDB IDs.
 const legacyOffset=1000000000;
 if(externalId&&legacy&&Number(externalId)<legacyOffset)return response({error:'O catálogo mudou para IGDB. Faça a busca novamente.',code:'CATALOG_SEARCH_AGAIN'},409);
 const id=externalId?(legacy?String(Number(externalId)-legacyOffset):externalId):'',search=(url.searchParams.get('search')||url.searchParams.get('query')||'').trim();
 if(search.length>180)return response({error:'Pesquisa muito longa.'},400);
 const page=Math.min(100,Math.max(1,Number(url.searchParams.get('page'))||1)),size=Math.min(40,Math.max(1,Number(url.searchParams.get('page_size'))||40));
 if(!Number.isInteger(page)||!Number.isInteger(size))return response({error:'Página inválida.'},400);
 const normalize=g=>{const item=normalizeGame(g);if(legacy)item.id+=legacyOffset;return item};
 const fields=`fields ${FIELDS}; `;
 const body=id?fields+`where id = ${Number(id)}; limit 1;`:fields+(search?`search ${JSON.stringify(search.replace(/[\u0000-\u001f]/g,' '))}; `:'sort total_rating_count desc; ')+`where (themes = null | themes != (42))${search?'':' & cover != null & total_rating_count >= 5'}; limit ${size+1}; offset ${(page-1)*size};`;
 try{
  const raw=await client(env).query(body),visible=raw.filter(g=>!blockedGame(g));
  if(id){const selected=visible.find(g=>Number(g.id)===Number(id));if(!selected)return response({error:'Jogo não encontrado ou conteúdo não permitido.'},404);const item=normalize(selected),localized=await translateDescription(env,item.description_raw);item.description_raw=localized.text;item.overview=localized.text;item.description_language=localized.translated?'pt-BR':'original';return response(item);}
  const hasMore=raw.length>size,results=raw.slice(0,size).filter(g=>!blockedGame(g)&&(!search||gameSearchScore(g,search)>0)).sort((a,b)=>search?gameSearchScore(b,search)-gameSearchScore(a,search):0).map(normalize);
  return response({source:'igdb',results,count:(page-1)*size+raw.slice(0,size).length+(hasMore?1:0),total_pages:page+(hasMore?1:0),has_more:hasMore});
 }catch(e){return response({error:e.status===429?'O IGDB atingiu o limite de consultas. Aguarde um instante.':'Não foi possível consultar o IGDB. Tente novamente.',code:e.status===429?'CATALOG_RATE_LIMIT':'CATALOG_UNAVAILABLE'},e.status||502);}
}

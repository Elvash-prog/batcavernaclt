import {authenticate,mediaUpload,mediaVideoReview,mediaPrepare} from './handlers.js';
import {catalog,steamFree,steamCover} from './routes.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff',...(status===429?{'retry-after':'60'}:{})}});
export function createHandler(env){
 return async request=>{
  try{
   if(request.headers.get('Origin'))return json({error:'Acesso web descontinuado. Use o desktop ou o APK.'},403);
   const incoming=new URL(request.url),prefix='/functions/v1/native-api';
   const path=incoming.pathname.startsWith(prefix+'/')?incoming.pathname.slice(prefix.length):incoming.pathname.startsWith('/native-api/')?incoming.pathname.slice('/native-api'.length):incoming.pathname;
   if(request.method==='GET'&&path==='/health')return json({service:'native-api',version:2,catalogProvider:'igdb',configured:{igdb:!!(env.IGDB_CLIENT_ID&&env.IGDB_CLIENT_SECRET),igdbConnected:env.IGDB_READY?await env.IGDB_READY:null,tmdb:!!env.TMDB_KEY,moderation:!!(env.SIGHTENGINE_API_USER&&env.SIGHTENGINE_API_SECRET),supabase:!!(env.SUPABASE_URL&&env.SUPABASE_ANON_KEY&&env.SUPABASE_SERVICE_ROLE_KEY)}});
   if(!['GET','POST'].includes(request.method))return json({error:'Método não permitido.'},405);
   if(incoming.href.length>4096)return json({error:'Consulta muito longa.'},414);
   // Rebase only for local dispatch. No redirect and no request to the former host.
   const url=new URL(request.url);url.pathname=path;const local=new Request(url,request);
   if(path==='/api/media/upload')return await mediaUpload(local,env);
   if(path==='/api/media/video-review')return await mediaVideoReview(local,env);
   if(path==='/api/media/prepare')return await mediaPrepare(local,env);
   if(path.startsWith('/api/catalog/'))return await catalog(local,env,url);
   if(path==='/api/steam-free'){await authenticate(local,env);return await steamFree(local,env);}
   if(path.startsWith('/api/steam-cover/')){await authenticate(local,env);return await steamCover(local,env,path.slice('/api/steam-cover/'.length));}
   return json({error:'Rota não encontrada.'},404);
  }catch(e){return json({error:e?.message==='UNAUTHORIZED'?'Sessão inválida. Entre novamente.':e?.message==='RATE_LIMIT'?'Muitas solicitações. Aguarde um minuto.':'Não foi possível concluir a solicitação.'},e?.message==='UNAUTHORIZED'?401:e?.message==='RATE_LIMIT'?429:503);}
 };
}

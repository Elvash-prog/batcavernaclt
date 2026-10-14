const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const SAFE_BUCKETS=new Set(['avatars','group-avatars','feed-media','chat-media','group-chat-media']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function adultContent(item){
 if(!item||typeof item!=='object')return false;
 if(item.adult===true||item.isAdult===true)return true;
 const rating=String(item.esrb_rating?.name||'');
 const tags=(item.tags||[]).map(t=>typeof t==='string'?t:(t.name||t.slug||'')).join(' ');
 const genres=(item.genres||[]).map(t=>typeof t==='string'?t:(t.name||t.slug||'')).join(' ');
 return /adults?\s*only/i.test(rating)||/\b(?:hentai|porn(?:ography|ografia|ografico|ográfico)?|nsfw|erotic[ao]?|er[oó]tic[ao]|sexual content|sex simulator|adult game|nudity|nude|ecchi)\b/i.test([item.name,item.title,item.nome,item.slug,tags,genres].join(' '));
}
export function filterCatalog(data){if(Array.isArray(data?.results))data.results=data.results.filter(x=>!adultContent(x));else if(adultContent(data))return response({error:'Este conteúdo não é permitido no catálogo.'},403);return data;}
export function safePublicKey(value){const key=String(value||'');if(/^sb_secret_/i.test(key))return '';if(key.split('.').length===3){try{const v=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(v.role==='service_role'||v.role==='supabase_admin')return ''}catch{return ''}}return key;}
export function secureResponse(original,nonce,env){
 const headers=new Headers(original.headers),host=new URL(env.SUPABASE_URL||'https://invalid.supabase.co').hostname;
 const directives=["default-src 'self'",`script-src 'self' https://cdn.jsdelivr.net 'nonce-${nonce}'`,"script-src-attr 'none'","style-src 'self' 'unsafe-inline' https://fonts.googleapis.com","font-src 'self' https://fonts.gstatic.com data:","img-src 'self' https: data: blob:","media-src 'self' https: blob:",`connect-src 'self' https://${host} wss://${host} https://${host.replace('.supabase.co','.storage.supabase.co')} https://graphql.anilist.co https://cdn.jsdelivr.net`,"worker-src 'self' blob:","object-src 'none'","base-uri 'none'","form-action 'self'","frame-ancestors 'none'","upgrade-insecure-requests"];
 headers.set('Content-Security-Policy',directives.join('; '));headers.set('X-Content-Type-Options','nosniff');headers.set('X-Frame-Options','DENY');headers.set('Referrer-Policy','no-referrer');headers.set('Strict-Transport-Security','max-age=31536000');headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(), usb=()');
 if((headers.get('Content-Type')||'').includes('text/html')){headers.set('Cache-Control','no-store');headers.delete('ETag');headers.delete('Last-Modified')}
 let out=new Response(original.body,{status:original.status,statusText:original.statusText,headers});
 if((headers.get('Content-Type')||'').includes('text/html')&&typeof HTMLRewriter!=='undefined')out=new HTMLRewriter().on('script',{element(el){el.setAttribute('nonce',nonce)}}).transform(out);
 return out;
}
export async function guardRequest(request,env){
 const url=new URL(request.url),origin=request.headers.get('Origin'),fetchSite=request.headers.get('Sec-Fetch-Site');
 if(url.href.length>4096)return response({error:'Consulta muito longa.'},414);
 if(url.pathname.startsWith('/api/')&&(origin&&origin!==url.origin||fetchSite==='cross-site'))return response({error:'Origem não permitida.'},403);
 if(url.pathname.startsWith('/api/')&&env.API_RATE_LIMITER){const ip=request.headers.get('CF-Connecting-IP')||'unknown';const r=await env.API_RATE_LIMITER.limit({key:'bc139:ip:'+ip});if(!r.success)return new Response(JSON.stringify({error:'Muitas solicitações. Tente novamente em um minuto.'}),{status:429,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Retry-After':'60'}})}
 return null;
}
export async function authenticate(request,env){
 const auth=request.headers.get('Authorization')||'';if(!/^Bearer [A-Za-z0-9._-]{20,4096}$/.test(auth))throw new Error('UNAUTHORIZED');
 const key=safePublicKey(env.SUPABASE_ANON_KEY);if(!key)throw new Error('CONFIG');
 const r=await fetch(new URL('/auth/v1/user',env.SUPABASE_URL),{headers:{Authorization:auth,apikey:key},redirect:'manual',signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error(r.status===401||r.status===403?'UNAUTHORIZED':'CONFIG');const data=await r.json();if(!UUID.test(data.id||''))throw new Error('UNAUTHORIZED');
 if(env.USER_RATE_LIMITER){const limit=await env.USER_RATE_LIMITER.limit({key:'bc139:user:'+data.id});if(!limit.success)throw new Error('RATE_LIMIT')}
 return {id:data.id,auth};
}
async function service(env,path,body,method='POST'){
 const r=await fetch(new URL(path,env.SUPABASE_URL),{method,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json',Prefer:'return=representation,resolution=merge-duplicates'},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual',signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new Error('DATABASE');return r.status===204?null:r.json();
}
export async function secureLogin(request,env){
 if(request.method!=='POST')return response({error:'Método não permitido.'},405);
 if(!env.SUPABASE_SERVICE_ROLE_KEY)return response({error:'Login protegido ainda não configurado.'},503);
 try{
  if(env.LOGIN_RATE_LIMITER){const l=await env.LOGIN_RATE_LIMITER.limit({key:'bc139:login:'+request.headers.get('CF-Connecting-IP')});if(!l.success)return response({error:'Aguarde um minuto antes de tentar novamente.'},429)}
  const text=await limitedText(request,2048),data=JSON.parse(text),entry=String(data.username||'').trim().toLowerCase(),password=String(data.password||'');
  if(!entry||entry.length>254||!password||password.length>256)return response({error:'Usuário ou senha inválidos.'},401);
  let email=entry;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry)){
   if(!/^[a-z0-9_.-]{1,40}$/.test(entry))return response({error:'Usuário ou senha inválidos.'},401);
   const resolved=await service(env,'/rest/v1/rpc/email_login_por_usuario',{p_usuario:entry});email=typeof resolved==='string'?resolved:'nao-cadastrado@invalid.example';
  }
  const r=await fetch(new URL('/auth/v1/token?grant_type=password',env.SUPABASE_URL),{method:'POST',headers:{apikey:safePublicKey(env.SUPABASE_ANON_KEY),'Content-Type':'application/json'},body:JSON.stringify({email,password}),redirect:'manual',signal:AbortSignal.timeout(15000)});
  if(!r.ok)return response({error:'Usuário ou senha inválidos.'},401);const s=await r.json();return response({access_token:s.access_token,refresh_token:s.refresh_token});
 }catch{return response({error:'Não foi possível entrar. Tente novamente.'},503)}
}
async function limitedText(request,max){const reader=request.body?.getReader();if(!reader)return '';const chunks=[];let size=0;try{while(true){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>max)throw new Error('SIZE');chunks.push(r.value)}const all=new Uint8Array(size);let pos=0;for(const c of chunks){all.set(c,pos);pos+=c.length}return new TextDecoder().decode(all)}finally{await reader.cancel().catch(()=>{})}}
export function validTarget(bucket,path){return SAFE_BUCKETS.has(bucket)&&/^[0-9a-f-]{36}\/[A-Za-z0-9_-]{1,150}\.(?:png|jpe?g|webp|mp4|webm)$/i.test(path)&&UUID.test(path.split('/')[0]);}
async function allowTarget(env,user,bucket,path){
 if(!validTarget(bucket,path))throw new Error('TARGET');const owner=path.split('/')[0];
 if(bucket==='group-avatars'){
  const rows=await service(env,'/rest/v1/clt_chat_group_members?select=user_id&group_id=eq.'+owner+'&user_id=eq.'+user.id+'&admin=eq.true',undefined,'GET');if(!rows?.length)throw new Error('UNAUTHORIZED');
 }else if(owner!==user.id)throw new Error('UNAUTHORIZED');
}
export function imageType(bytes){if(bytes.length>=12&&bytes[0]===0x89&&new TextDecoder().decode(bytes.slice(1,4))==='PNG'&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10)return 'image/png';if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';if(new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP')return 'image/webp';return '';}
export function safeNudity(n){const fields=['sexual_activity','sexual_display','erotica','very_suggestive'];return n&&fields.every(k=>typeof n[k]==='number'&&Number.isFinite(n[k])&&n[k]>=0&&n[k]<=1&&n[k]<0.25);}
async function moderate(env,fileOrUrl,video=false){
 const body=new FormData();body.set('models','nudity-2.1');body.set('api_user',env.SIGHTENGINE_API_USER);body.set('api_secret',env.SIGHTENGINE_API_SECRET);if(video)body.set('interval','0.5');
 if(typeof fileOrUrl==='string')body.set(video?'stream_url':'url',fileOrUrl);else body.set('media',fileOrUrl,'upload.'+(fileOrUrl.type==='image/png'?'png':fileOrUrl.type==='image/jpeg'?'jpg':'webp'));
 const r=await fetch('https://api.sightengine.com/1.0/'+(video?'video/check-sync.json':'check.json'),{method:'POST',body,redirect:'manual',signal:AbortSignal.timeout(video?90000:30000)});
 if(!r.ok)throw new Error('MODERATION_UNAVAILABLE');const data=await r.json();if(data.status!=='success')throw new Error('MODERATION_UNAVAILABLE');
 if(video){if(!Array.isArray(data.data?.frames)||!data.data.frames.length)throw new Error('MODERATION_UNAVAILABLE');if(!data.data.frames.every(f=>safeNudity(f.nudity)))throw new Error('ADULT_CONTENT')}
 else if(!safeNudity(data.nudity))throw new Error('ADULT_CONTENT');
}
function moderationReady(env){return !!(env.SUPABASE_SERVICE_ROLE_KEY&&env.SIGHTENGINE_API_USER&&env.SIGHTENGINE_API_SECRET);}
async function record(env,bucket,path,owner,status){return service(env,'/rest/v1/clt_media_reviews?on_conflict=bucket,path',{bucket,path,owner_id:owner,status,checked_at:new Date().toISOString()},'POST');}
async function uploadApproved(env,bucket,path,blob,type,owner){
 const r=await fetch(new URL('/storage/v1/object/'+bucket+'/'+path,env.SUPABASE_URL),{method:'POST',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':type,'x-upsert':'false','Cache-Control':'max-age=300'},body:blob,redirect:'manual',signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error('UPLOAD');await record(env,bucket,path,owner,'approved');
}
function mediaError(e){const code=e.message;return response({error:code==='UNAUTHORIZED'?'Sua sessão ou permissão não permite esta operação.':code==='ADULT_CONTENT'?'O arquivo foi bloqueado por conter nudez ou conteúdo sexual.':code==='RATE_LIMIT'?'Muitas solicitações. Aguarde um minuto.':code==='TARGET'?'Destino de upload inválido.':code==='SIZE'?'O arquivo ultrapassa o limite permitido.':code==='FORMAT'?'Formato de arquivo inválido.':'A análise ou o armazenamento não foi concluído. O arquivo não foi liberado.'},code==='UNAUTHORIZED'?401:code==='RATE_LIMIT'?429:code==='ADULT_CONTENT'||code==='TARGET'||code==='FORMAT'?422:code==='SIZE'?413:503);}
export async function mediaUpload(request,env){
 if(request.method!=='POST')return response({error:'Método não permitido.'},405);if(!moderationReady(env))return response({error:'Envios de arquivos aguardam a ativação da moderação automática pelo administrador.'},503);
 try{
  const user=await authenticate(request,env),url=new URL(request.url),bucket=url.searchParams.get('bucket')||'',path=url.searchParams.get('path')||'';await allowTarget(env,user,bucket,path);
  const declared=Number(request.headers.get('Content-Length')||0);if(declared>10*1024*1024)throw new Error('SIZE');
  const reader=request.body.getReader(),chunks=[];let count=0;try{while(true){const r=await reader.read();if(r.done)break;count+=r.value.byteLength;if(count>10*1024*1024)throw new Error('SIZE');chunks.push(r.value)}}finally{await reader.cancel().catch(()=>{})}
  const blob=new Blob(chunks),bytes=new Uint8Array(await blob.slice(0,64).arrayBuffer()),type=imageType(bytes);if(!type||!count||!(type==='image/png'?/\.png$/i:type==='image/jpeg'?/\.jpe?g$/i:/\.webp$/i).test(path))throw new Error('FORMAT');if((bucket==='chat-media'||bucket==='group-chat-media')&&count>5*1024*1024)throw new Error('SIZE');
  const typed=new Blob([blob],{type});await moderate(env,typed);await uploadApproved(env,bucket,path,typed,type,user.id);return response({data:{path},error:null});
 }catch(e){return mediaError(e)}
}
async function signedServiceUrl(env,bucket,path,expiresIn=600){const d=await service(env,'/storage/v1/object/sign/'+bucket+'/'+path,{expiresIn});if(!d.signedURL)throw new Error('UPLOAD');const u=new URL('/storage/v1'+d.signedURL,env.SUPABASE_URL);if(u.origin!==new URL(env.SUPABASE_URL).origin)throw new Error('TARGET');return u.href;}
export async function mediaVideoReview(request,env){
 if(request.method!=='POST')return response({error:'Método não permitido.'},405);if(!moderationReady(env))return response({error:'Ative a moderação automática antes de enviar vídeos.'},503);
 try{
  const user=await authenticate(request,env),body=JSON.parse(await limitedText(request,1024)),path=String(body.path||'');await allowTarget(env,user,'feed-media',path);if(!/\.(mp4|webm)$/i.test(path))throw new Error('FORMAT');
  const signed=await signedServiceUrl(env,'clt-quarantine',path),head=await fetch(signed,{headers:{Range:'bytes=0-63'},redirect:'manual',signal:AbortSignal.timeout(10000)});if(!head.ok)throw new Error('UPLOAD');const reader=head.body.getReader(),first=await reader.read();await reader.cancel();const bytes=first.value||new Uint8Array(),mp4=new TextDecoder().decode(bytes.slice(4,8))==='ftyp',webm=bytes[0]===26&&bytes[1]===69&&bytes[2]===223&&bytes[3]===163;
  if(!mp4&&!webm)throw new Error('FORMAT');const total=Number((head.headers.get('Content-Range')||'').split('/')[1]||head.headers.get('Content-Length'));if(!Number.isFinite(total)||total<=0||total>200*1024*1024)throw new Error('SIZE');
  // Lock the quarantine path before analysis: the SQL denies reinsertion/updates of locked files.
  const lock=await service(env,'/rest/v1/rpc/clt_lock_quarantine',{p_path:path,p_owner:user.id});if(lock!==true)throw new Error('UPLOAD');
  await moderate(env,signed,true);const source=await fetch(signed,{redirect:'manual',signal:AbortSignal.timeout(15000)});if(!source.ok)throw new Error('UPLOAD');await uploadApproved(env,'feed-media',path,source.body,mp4?'video/mp4':'video/webm',user.id);return response({data:{path},error:null});
 }catch(e){return mediaError(e)}
}
// Only the current directory avatar is visible to other authenticated accounts.
// Banners, previous photos and message attachments keep their existing ACL.
async function currentDirectoryAvatar(env,userId,path){
 const owner=path.split('/')[0];
 const [profiles,blocks]=await Promise.all([
  service(env,'/rest/v1/perfis?select=avatar_url&id=eq.'+owner+'&limit=1',undefined,'GET'),
  service(env,'/rest/v1/bloqueios_clt?select=bloqueador_id&or=(and(bloqueador_id.eq.'+userId+',bloqueado_id.eq.'+owner+'),and(bloqueador_id.eq.'+owner+',bloqueado_id.eq.'+userId+'))&limit=1',undefined,'GET')
 ]);
 if(!profiles?.[0]?.avatar_url||blocks?.length)return false;
 try{
  const url=new URL(profiles[0].avatar_url),base=new URL(env.SUPABASE_URL);
  return url.origin===base.origin&&decodeURIComponent(url.pathname)==='/storage/v1/object/public/avatars/'+path;
 }catch{return false}
}
export async function mediaPrepare(request,env){
 if(request.method!=='POST')return response({error:'Método não permitido.'},405);if(!moderationReady(env))return response({error:'Moderação não configurada.'},503);
 try{
  const user=await authenticate(request,env),b=JSON.parse(await limitedText(request,1024)),bucket=String(b.bucket||''),path=String(b.path||'');if(!validTarget(bucket,path))throw new Error('TARGET');
  const allowed=await service(env,'/rest/v1/rpc/clt_can_view_media',{p_user:user.id,p_bucket:bucket,p_path:path});
  const directoryAvatar=allowed!==true&&bucket==='avatars'&&await currentDirectoryAvatar(env,user.id,path);
  if(allowed!==true&&!directoryAvatar)throw new Error('UNAUTHORIZED');
  const rows=await service(env,'/rest/v1/clt_media_reviews?select=status&bucket=eq.'+bucket+'&path=eq.'+encodeURIComponent(path),undefined,'GET');if(rows?.[0]?.status==='rejected')throw new Error('ADULT_CONTENT');
  if(rows?.[0]?.status!=='approved'){const signed=await signedServiceUrl(env,bucket,path);await moderate(env,signed,/\.(mp4|webm)$/i.test(path));var owner=path.split('/')[0];if(bucket==='group-avatars'){var groups=await service(env,'/rest/v1/clt_chat_groups?select=criado_por&id=eq.'+owner,undefined,'GET');owner=groups[0]?.criado_por;if(!owner)throw new Error('TARGET')}await record(env,bucket,path,owner,'approved')}
  return response(directoryAvatar?{approved:true,signedUrl:await signedServiceUrl(env,bucket,path,300)}:{approved:true});
 }catch(e){return mediaError(e)}
}

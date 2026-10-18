// Upload moderado para os aplicativos nativos. Deploy como media-upload.
import {readLimitedJson,BodyLimitError} from '../_shared/request-security.js';
// Secrets adicionais: SIGHTENGINE_API_USER e SIGHTENGINE_API_SECRET.
const SB=Deno.env.get('SUPABASE_URL')||'',ANON=Deno.env.get('SUPABASE_ANON_KEY')||'',SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const SUSER=Deno.env.get('SIGHTENGINE_API_USER')||'',SSECRET=Deno.env.get('SIGHTENGINE_API_SECRET')||'';
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const allowed:{[key:string]:string}={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'};
async function user(req:Request){const auth=req.headers.get('authorization')||'';const r=await fetch(SB+'/auth/v1/user',{headers:{apikey:ANON,authorization:auth}});if(!r.ok)throw new Error('AUTH');return await r.json()}
function safe(n:any){return n&&['sexual_activity','sexual_display','erotica','very_suggestive'].every(k=>typeof n[k]==='number'&&n[k]<.25)}
async function moderateImage(blob:Blob){const f=new FormData();f.set('models','nudity-2.1');f.set('api_user',SUSER);f.set('api_secret',SSECRET);f.set('media',blob,'upload');const r=await fetch('https://api.sightengine.com/1.0/check.json',{method:'POST',body:f});const d=await r.json();if(!r.ok||d.status!=='success')throw new Error('MODERATION');if(!safe(d.nudity))throw new Error('ADULT')}
async function moderateVideo(url:string){const f=new FormData();f.set('models','nudity-2.1');f.set('api_user',SUSER);f.set('api_secret',SSECRET);f.set('stream_url',url);f.set('interval','0.5');const r=await fetch('https://api.sightengine.com/1.0/video/check-sync.json',{method:'POST',body:f,signal:AbortSignal.timeout(90000)});const d=await r.json();if(!r.ok||d.status!=='success'||!Array.isArray(d.data?.frames)||!d.data.frames.length)throw new Error('MODERATION');if(!d.data.frames.every((x:any)=>safe(x.nudity)))throw new Error('ADULT')}
async function storage(path:string,blob:Blob,mime:string){const r=await fetch(SB+'/storage/v1/object/feed-media/'+path,{method:'POST',headers:{apikey:SERVICE,authorization:'Bearer '+SERVICE,'content-type':mime,'x-upsert':'false'},body:blob});if(!r.ok)throw new Error('UPLOAD')}
async function quarantine(path:string,blob:Blob,mime:string){const headers={apikey:SERVICE,authorization:'Bearer '+SERVICE,'content-type':mime,'x-upsert':'false'};let r=await fetch(SB+'/storage/v1/object/clt-quarantine/'+path,{method:'POST',headers,body:blob});if(!r.ok)throw new Error('UPLOAD');r=await fetch(SB+'/storage/v1/object/sign/clt-quarantine/'+path,{method:'POST',headers:{apikey:SERVICE,authorization:'Bearer '+SERVICE,'content-type':'application/json'},body:JSON.stringify({expiresIn:300})});const d=await r.json();if(!r.ok||!d.signedURL)throw new Error('UPLOAD');return SB+'/storage/v1'+d.signedURL}
async function removeQuarantine(path:string){await fetch(SB+'/storage/v1/object/clt-quarantine/'+path,{method:'DELETE',headers:{apikey:SERVICE,authorization:'Bearer '+SERVICE}}).catch(()=>null)}
async function review(path:string,owner:string){const r=await fetch(SB+'/rest/v1/clt_media_reviews?on_conflict=bucket,path',{method:'POST',headers:{apikey:SERVICE,authorization:'Bearer '+SERVICE,'content-type':'application/json',prefer:'resolution=merge-duplicates'},body:JSON.stringify({bucket:'feed-media',path,owner_id:owner,status:'approved',checked_at:new Date().toISOString()})});if(!r.ok)throw new Error('DATABASE')}
Deno.serve(async req=>{try{
 if(req.method!=='POST')return json({error:'Método não permitido.'},405);if(!SB||!ANON||!SERVICE||!SUSER||!SSECRET)return json({error:'A moderação de mídia ainda não foi ativada.'},503);
 if(Number(req.headers.get('content-length')||0)>18_000_000)return json({error:'Arquivo maior que 12 MB.'},413);
 const u=await user(req);if(u.is_anonymous===true)return json({error:'Sua sessão não permite esta operação.'},401);
 const body=await readLimitedJson(req,18_000_000);if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'Arquivo inválido.'},422);
 const mime=String(body.mime||''),ext=allowed[mime],raw=String(body.base64||'');if(!ext||raw.length>17_000_000||!/^[A-Za-z0-9+/=]+$/.test(raw))return json({error:'Arquivo inválido.'},422);
 const bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));if(!bytes.length||bytes.length>12*1024*1024)return json({error:'Arquivo maior que 12 MB.'},413);
 const png=bytes[0]===137&&bytes[1]===80, jpg=bytes[0]===255&&bytes[1]===216, webp=new TextDecoder().decode(bytes.slice(0,4))==='RIFF',mp4=new TextDecoder().decode(bytes.slice(4,8))==='ftyp',webm=bytes[0]===26&&bytes[1]===69;
 if((mime==='image/png'&&!png)||(mime==='image/jpeg'&&!jpg)||(mime==='image/webp'&&!webp)||(mime==='video/mp4'&&!mp4)||(mime==='video/webm'&&!webm))return json({error:'O conteúdo não corresponde ao formato informado.'},422);
 const blob=new Blob([bytes],{type:mime});const path=u.id+'/desktop-'+Date.now()+'-'+crypto.randomUUID().slice(0,8)+'.'+ext;
 if(mime.startsWith('video/')){let signed='';try{signed=await quarantine(path,blob,mime);await moderateVideo(signed)}finally{await removeQuarantine(path)}}else await moderateImage(blob);
 await storage(path,blob,mime);await review(path,u.id);
 return json({url:SB+'/storage/v1/object/public/feed-media/'+path});
 }catch(e){if(e instanceof BodyLimitError)return json({error:'Arquivo maior que o permitido.'},413);const m=String((e as Error).message);return json({error:m==='AUTH'?'Sua sessão expirou.':m==='ADULT'?'A imagem foi bloqueada pela moderação.':'Não foi possível analisar ou enviar a mídia.'},m==='AUTH'?401:m==='ADULT'?422:503)}});


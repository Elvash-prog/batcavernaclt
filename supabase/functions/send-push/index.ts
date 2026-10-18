import webpush from 'npm:web-push@3.6.7';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
import {readLimitedJson,BodyLimitError,secretMatches,allowedPushEndpoint} from '../_shared/request-security.js';

const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!,Deno.env.get('VAPID_PUBLIC_KEY')!,Deno.env.get('VAPID_PRIVATE_KEY')!);
Deno.serve(async req=>{
 if(req.method!=='POST')return reply({ok:false},405);
 const secret=Deno.env.get('PUSH_WEBHOOK_SECRET');
 if(!secret)return reply({ok:false,error:'Push unavailable'},503);
 if(!await secretMatches(secret,req.headers.get('x-webhook-secret')||''))return reply({ok:false},401);
 try{
  const payload=await readLimitedJson(req,65536),id=String(payload?.record?.id||payload?.new_record?.id||payload?.id||'');
  if(!/^[A-Za-z0-9_-]{1,100}$/.test(id))return reply({ok:false},400);
  // The request cannot choose notification text or recipient.
  const {data:records,error:readError}=await supabase.from('notificacoes').select('id,destinatario_id,mensagem,tipo,read').eq('id',id).limit(1);
  if(readError)throw new Error('DATABASE');const record=records?.[0];
  if(!record||record.read)return reply({ok:true,skipped:true});
  const {data:subscriptions,error}=await supabase.from('push_subscriptions').select('endpoint,subscription').eq('user_id',record.destinatario_id);
  if(error)throw new Error('DATABASE');let sent=0,removed=0,skipped=0;
  for(const row of subscriptions||[]){
   if(!allowedPushEndpoint(row.endpoint)||!row.subscription||row.subscription.endpoint!==row.endpoint){skipped++;continue;}
   try{await webpush.sendNotification(row.subscription,JSON.stringify({title:'BatCaverna dos CLTs',body:String(record.mensagem||'Você tem uma nova notificação.').slice(0,1000),url:'/',tag:'batcaverna-'+String(record.tipo||'notificacao').slice(0,80)}),{timeout:15000});sent++;}
   catch(error){if(error?.statusCode===404||error?.statusCode===410){await supabase.from('push_subscriptions').delete().eq('user_id',record.destinatario_id).eq('endpoint',row.endpoint);removed++;}}
  }
  return reply({ok:true,sent,removed,skipped});
 }catch(error){return reply({ok:false,error:'Push unavailable'},error instanceof BodyLimitError?413:error instanceof SyntaxError?400:503);}
});

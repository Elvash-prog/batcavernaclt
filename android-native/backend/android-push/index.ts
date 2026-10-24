import {backendKeys} from '../../../supabase/functions/_shared/api-keys.js';
// Supabase Edge Function: android-push. Deploy with JWT verification disabled,
// because the Database Webhook authenticates through a separate server secret.
const env = (key: string) => { const value = Deno.env.get(key); if (!value) throw new Error(`Missing ${key}`); return value; };
const base = env("SUPABASE_URL"), admin = backendKeys(name=>Deno.env.get(name)).secretKey;
const encode = (value: Uint8Array) => btoa(String.fromCharCode(...value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const json64 = (v: unknown) => encode(new TextEncoder().encode(JSON.stringify(v)));
let oauth: {token: string, expires: number} | undefined;
async function firebaseToken(account: {private_key: string,client_email: string}): Promise<string> {
 if (oauth && oauth.expires > Date.now()+60000) return oauth.token;
 const now = Math.floor(Date.now()/1000);
 const body = `${json64({alg:"RS256",typ:"JWT"})}.${json64({iss:account.client_email,scope:"https://www.googleapis.com/auth/firebase.messaging",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600})}`;
 const pem = account.private_key.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
 const key = await crypto.subtle.importKey("pkcs8",Uint8Array.from(atob(pem), c=>c.charCodeAt(0)),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
 const signature=encode(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(body))));
 const r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:`${body}.${signature}`}),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new Error("OAuth unavailable");const data=await r.json();if(typeof data.access_token!=="string")throw new Error("Invalid OAuth response");oauth={token:data.access_token,expires:Date.now()+Math.min(3600,Number(data.expires_in)||3600)*1000};return oauth.token;
}
async function sameSecret(provided: string): Promise<boolean> {const hash=async(s:string)=>new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)));const a=await hash(provided),b=await hash(env("ANDROID_PUSH_WEBHOOK_SECRET"));let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];return difference===0;}
async function rest(path:string,method="GET"){const r=await fetch(base+"/rest/v1/"+path,{method,headers:{apikey:admin},signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error("Database unavailable");return method==="DELETE"?[]:await r.json();}
Deno.serve(async(request:Request)=>{
 try{
  if(request.method!=="POST"||!await sameSecret(request.headers.get("x-android-push-secret")||""))return new Response("Unauthorized",{status:401});
  if(!admin)return new Response("Push unavailable",{status:503});
  const raw=await request.text();if(raw.length>65536)return new Response("Too large",{status:413});const event=JSON.parse(raw);
  if(event.type!=="INSERT"||event.table!=="notificacoes"||event.schema!=="public")return new Response("Ignored");
  const id=String(event.record?.id||"");if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))return new Response("Invalid event",{status:400});
  // Re-read the authoritative row. The webhook body cannot choose a recipient.
  const rows=await rest(`notificacoes?select=id,destinatario_id,mensagem,read&id=eq.${encodeURIComponent(id)}&limit=1`);
  const notice=rows[0];if(!notice||notice.read)return new Response("Ignored");
  const user=String(notice.destinatario_id);if(!/^[a-f0-9-]{36}$/i.test(user))return new Response("Invalid recipient",{status:400});
  const devices=await rest(`clt_android_push_tokens?select=token&user_id=eq.${user}&order=updated_at.desc&limit=100`);
  const account=JSON.parse(env("FIREBASE_SERVICE_ACCOUNT"));const token=await firebaseToken(account);
  let failed=false;
  // Only data messages: Android checks opt-in and active user before showing text.
  for(const device of devices){const response=await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"content-type":"application/json"},body:JSON.stringify({message:{token:device.token,data:{id:String(notice.id),user_id:user,message:String(notice.mensagem||"Nova atividade na BatCaverna").slice(0,1000)},android:{priority:"HIGH",ttl:"86400s",collapse_key:String(notice.id)}}}),signal:AbortSignal.timeout(15000)});if(!response.ok){const error=await response.json().catch(()=>({}));const dead=error.error?.details?.some((d:{errorCode?:string})=>d.errorCode==="UNREGISTERED");if(dead)await rest(`clt_android_push_tokens?user_id=eq.${user}&token=eq.${encodeURIComponent(device.token)}`,"DELETE");else failed=true;}}
  return new Response(failed?"Some deliveries failed":"Accepted",{status:failed?503:200});
 }catch{ return new Response("Push unavailable",{status:503}); }
});

// Named keys are injected by Supabase. Never fall back to the exposed Legacy key.
function namedKey(read,name,keyName,prefix){
 try{
  const raw=read(name);if(typeof raw!=='string'||raw.length>65536)return '';
  const keys=JSON.parse(raw);if(!keys||Array.isArray(keys)||typeof keys!=='object')return '';
  const key=Object.hasOwn(keys,keyName)?keys[keyName]:null;
  return typeof key==='string'&&key.startsWith(prefix)&&key.length>prefix.length&&key.length<=4096&&!/\s/.test(key)?key:'';
 }catch{return '';}
}
export function backendKeys(read){return {
 publicKey:namedKey(read,'SUPABASE_PUBLISHABLE_KEYS','default','sb_publishable_'),
 secretKey:namedKey(read,'SUPABASE_SECRET_KEYS','batcaverna_backend','sb_secret_')
};}
// supabase-js adds Authorization automatically. Opaque API keys belong only in apikey.
// Preserve real user JWTs; only remove a Bearer that repeats the opaque API key.
export async function keyOnlyFetch(input,init={}){
 const headers=new Headers(input instanceof Request?input.headers:undefined);
 new Headers(init.headers).forEach((value,name)=>headers.set(name,value));
 const authorization=headers.get('authorization')||'';
 if(/^Bearer sb_(?:secret|publishable)_/i.test(authorization))headers.delete('authorization');
 return fetch(input,{...init,headers});
}

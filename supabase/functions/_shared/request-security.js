export class BodyLimitError extends Error { constructor(){super('BODY_LIMIT');} }
export async function readLimitedJson(request,maxBytes){
 const declared=Number(request.headers.get('content-length'));
 if(Number.isFinite(declared)&&declared>maxBytes)throw new BodyLimitError();
 const reader=request.body?.getReader();if(!reader)throw new SyntaxError('JSON required');
 let size=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes)throw new BodyLimitError();chunks.push(value);}}
 finally{await reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export async function secretMatches(expected,provided){
 if(!expected||!provided||provided.length>4096)return false;
 const digest=async value=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
 const a=await digest(expected),b=await digest(provided);let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];return difference===0;
}
export function allowedPushEndpoint(value){
 try{const u=new URL(value),h=u.hostname;
 return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&(
 h==='fcm.googleapis.com'||h==='updates.push.services.mozilla.com'||h==='web.push.apple.com'||h.endsWith('.notify.windows.com'));
 }catch{return false;}
}

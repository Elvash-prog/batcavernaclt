// Hashes are pseudonymous security counters, not anonymous usage metrics.
export async function loginRateKeys(request,username,secret){
 const hint=(request.headers.get('x-forwarded-for')||'').split(',')[0].trim();
 const source=/^[0-9a-f:.]{3,64}$/i.test(hint)?hint.toLowerCase():'unknown';
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const account=username.trim().toLowerCase();
 return Promise.all(['account:'+account,'source:'+source,'pair:'+account+'\0'+source,'global'].map(hash));
}
export async function checkLoginRate(request,username,base,secret,transport=fetch){
 const p_keys=await loginRateKeys(request,username,secret);
 const response=await transport(base+'/rest/v1/rpc/clt_login_rate_limit',{method:'POST',headers:{apikey:secret,'content-type':'application/json'},body:JSON.stringify({p_keys}),redirect:'error',signal:AbortSignal.timeout(4000)});
 if(!response.ok)throw new Error('LOGIN_RATE_UNAVAILABLE');
 const allowed=await response.json();if(typeof allowed!=='boolean')throw new Error('LOGIN_RATE_UNAVAILABLE');
 return allowed;
}

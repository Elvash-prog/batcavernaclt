// Disposable JSON snapshots stay in memory and belong to one authenticated session.
(function(root){
 root.createScreenCache=function({owner,now=Date.now,maxEntries=16,maxBytes=6*1024*1024}){
  const entries=new Map();let account='',epoch=0,bytes=0;
  const abort=()=>{const e=new Error('Leitura de outra sessão descartada.');e.name='AbortError';return e;};
  const drop=key=>{const entry=entries.get(key);if(entry){bytes-=entry.bytes||0;entries.delete(key);}};
  const clear=()=>{entries.clear();bytes=0;account=owner()||'';epoch++;};
  const session=()=>{if(account!==(owner()||''))clear();return {account,epoch};};
  function read(scope,input,ttl,load,{fresh=false}={}){
   const current=session(),key=scope+'|'+JSON.stringify(input??null),existing=entries.get(key);
   if(!current.account)return Promise.resolve().then(load);
   if(!fresh&&existing?.value!==undefined&&existing.expires>now()){entries.delete(key);entries.set(key,existing);return Promise.resolve(JSON.parse(existing.value));}
   if(existing?.pending)return existing.pending.then(value=>JSON.parse(value));
   const retained=existing?.expires>now()?{value:existing.value,expires:existing.expires,bytes:existing.bytes}:{};
   drop(key);const entry={scope,bytes:0,...retained,pending:null};bytes+=entry.bytes;entries.set(key,entry);
   entry.pending=Promise.resolve().then(load).then(value=>{
    if(current.account!==(owner()||'')||current.epoch!==epoch)throw abort();
    const json=JSON.stringify(value??null),size=json.length*2;
    if(entries.get(key)===entry){entry.pending=null;if(size<=maxBytes){bytes-=entry.bytes;entry.value=json;entry.bytes=size;entry.expires=now()+ttl;bytes+=size;while(entries.size>maxEntries||bytes>maxBytes){const oldest=[...entries].find(([,item])=>!item.pending)?.[0];if(oldest===undefined)break;drop(oldest);}}else drop(key);}
    return json;
   }).catch(error=>{if(entries.get(key)===entry)drop(key);throw error;});
   return entry.pending.then(value=>JSON.parse(value));
  }
  return {read,clear,invalidate(scopes){for(const [key,entry] of entries)if(!scopes||scopes.includes(entry.scope))drop(key);},info(){return {entries:entries.size,bytes};}};
 };
})(globalThis);

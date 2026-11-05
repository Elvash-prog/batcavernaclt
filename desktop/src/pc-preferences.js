'use strict';
// Only disposable image hints may be evicted; account settings and drafts are preserved.
function writeLocalPreference(storage,key,value){
 try{storage.setItem(key,value);return true;}catch(error){if(!/quota/i.test(String(error?.name)+' '+String(error?.message)))return false;}
 try{const keys=[];for(let i=0;i<storage.length;i++){const name=storage.key(i);if(name==='bc-login-background'||name?.startsWith('bc-cover-choices-v2:'))keys.push(name);}for(const name of keys)storage.removeItem(name);storage.setItem(key,value);return true;}catch{return false;}
}
function createPcPreferences({storage,request}){
 const records=new Map();
 const clean=value=>({enabled:value?.enabled!==false,trackTime:value?.trackTime!==false,mappings:Array.isArray(value?.mappings)?value.mappings.filter(m=>m&&typeof m.name==='string'&&m.name.trim()&&m.name.length<=180&&typeof m.process==='string').map(m=>({name:m.name,process:m.process.trim().replace(/^"|"$/g,'').split(/[\\/]/).pop(),...(m.automatic===true?{automatic:true}:{})})).filter(m=>m.process&&m.process.length<=160&&!/[\u0000-\u001f]/.test(m.process)).slice(0,200):[]});
 const clone=value=>JSON.parse(JSON.stringify(value));
 function record(owner){if(!records.has(owner))records.set(owner,{value:null,loading:null,queue:Promise.resolve(),error:''});return records.get(owner);}
 async function persist(owner,r){const snapshot=clone(r.value);const task=r.queue.catch(()=>{}).then(async()=>{try{await request({owner,preferences:snapshot});r.error='';writeLocalPreference(storage,'bc-pc-games:'+owner,JSON.stringify(snapshot));return true;}catch{r.error='Não foi possível salvar as associações neste PC. A detecção continua nesta sessão; tente salvar novamente.';return false;}});r.queue=task;return task;}
 async function load(owner){if(!owner)return clean({enabled:false,trackTime:false});const r=record(owner);if(r.value)return clone(r.value);if(!r.loading)r.loading=(async()=>{let legacy=null;try{const text=storage.getItem('bc-pc-games:'+owner);if(text)legacy=clean(JSON.parse(text));}catch{}try{const saved=await request({owner});r.value=clean(saved??legacy??{});if(saved==null&&legacy)await persist(owner,r);}catch{r.value=legacy||clean({enabled:false,trackTime:false});r.error='Não foi possível ler as associações salvas neste PC. Os dados anteriores foram preservados.';}return clone(r.value);})();return clone(await r.loading);}
 return {load,async update(owner,patch){await load(owner);const r=record(owner);r.value=clean({...r.value,...patch});return persist(owner,r);},error(owner){return records.get(owner)?.error||'';}};
}

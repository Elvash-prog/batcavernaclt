// Account scoped local recovery, small atomic cloud patches, and serialized writes.
(function(root){
 const keys=['preset','bg','panel','accent','text','width','cardWidth','scale','cardFormat','background','compact','noAnimations'];
 const merge=(base,patch)=>{const next={...base};for(const [k,v] of Object.entries(patch))if(keys.includes(k)){if(v===null)delete next[k];else next[k]=v;}return next;};
 root.createLayoutSync=function({storage,request,changed=()=>{}}){
  let owner='',epoch=0,theme={},pending={},flight=null,sending=null,timer=null,status='';
  const key=()=> 'bc-desktop-theme-v3:'+owner,queueKey=()=>key()+':pending';
  const read=k=>{try{const v=JSON.parse(storage.getItem(k)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch{return {};}};
  const emit=s=>{status=s;changed({...theme},status);};
  const persist=()=>{storage.setItem(key(),JSON.stringify(theme));storage.setItem(queueKey(),JSON.stringify(sending?.owner===owner?{...sending.patch,...pending}:pending));};
  async function flush(){
   clearTimeout(timer);if(flight)return flight;if(!owner||!Object.keys(pending).length)return;
   const account=owner,version=epoch,patch={...pending};pending={};sending={owner:account,patch};persist();emit('Sincronizando aparência…');
   flight=(async()=>{try{const result=await request({owner:account,patch});if(epoch!==version)return;theme=merge(result.layout||{},pending);sending=null;persist();emit(Object.keys(pending).length?'Sincronização pendente':'Aparência salva na sua conta');}
    catch{if(epoch===version){pending={...patch,...pending};sending=null;persist();emit('Salvo neste PC. Sincronização pendente.');}}
    finally{flight=null;sending=null;if(owner&&Object.keys(pending).length)timer=setTimeout(()=>void flush(),30000);}})();return flight;
  }
  return {get:()=>({...theme}),status:()=>status,flush,
   async open(account){clearTimeout(timer);const version=++epoch;owner=account;theme=read(key());pending=read(queueKey());
    if(!storage.getItem('bc-theme-legacy-owner')){storage.setItem('bc-theme-legacy-owner',account);if(!Object.keys(theme).length){theme=read('bc-desktop-theme-v2');const prefs=read('bc-desktop-prefs');for(const k of ['compact','noAnimations'])if(typeof prefs[k]==='boolean')theme[k]=prefs[k];}}
    persist();emit('Carregando aparência da conta…');
    try{const result=await request(null);if(epoch!==version)return;if(result?.layout){theme=merge(result.layout,pending);}else{pending={...theme,...pending};}persist();emit('Aparência salva na sua conta');if(Object.keys(pending).length)void flush();}
    catch{if(epoch===version)emit('Aparência local. Sem conexão com a conta.');}
   },
   save(next){if(!owner)return;for(const k of keys){if(JSON.stringify(next[k])!==JSON.stringify(theme[k]))pending[k]=next[k]===undefined?null:next[k];}theme=merge({},next);persist();emit('Salvando aparência…');clearTimeout(timer);timer=setTimeout(()=>void flush(),800);},
   close(){clearTimeout(timer);++epoch;owner='';theme={};pending={};emit('');}
  };
 };
})(globalThis);

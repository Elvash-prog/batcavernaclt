/* Read-only warmups: one background task at a time, after paint or user intent. */
(()=>{'use strict';
 let idle=null,timer=null,hover=null,queue=new Map(),running=0,generation=0,sequence=0;
 const ready=()=>!!state.userId&&!document.hidden&&!document.querySelector('#appShell')?.hidden;
 function cancel(){generation++;running=0;queue.clear();clearTimeout(timer);clearTimeout(hover);if(idle!==null){if(window.cancelIdleCallback)cancelIdleCallback(idle);else clearTimeout(idle);}idle=null;}
 function schedule(){if(idle!==null||running||!queue.size||!ready())return;const version=generation;const run=()=>{idle=null;if(version!==generation||!ready())return;const [key,task]=queue.entries().next().value;queue.delete(key);const id=++sequence;running=id;Promise.resolve().then(task).catch(()=>{}).finally(()=>{if(running===id){running=0;schedule();}});};idle=window.requestIdleCallback?requestIdleCallback(run,{timeout:1200}):setTimeout(run,150);}
 function warm(view,category){
  if(!ready())return Promise.resolve();
  if(view==='library'&&['jogos','filmes','series','animes'].includes(category))return api.library(category,{fresh:false});
  if(view==='home')return api.dashboard({fresh:false});
  if(view==='profile'){const id=state.userId;return Promise.all([api.profileView(null,{fresh:false}),screenRead('own-profile-bundle',{id},15000,()=>call('community',{input:{op:'profile_bundle',id}}),{fresh:false})]);}
  if(view==='notifications')return window.batcavernaWarmNotifications?.();
  return Promise.resolve();
 }
 function enqueue(view,category){if(!ready())return;const account=state.userId,key=[account,view,category||''].join(':');queue.set(key,()=>account===state.userId?warm(view,category):null);if(queue.size>8)queue.delete(queue.keys().next().value);schedule();}
 function target(node){const button=node.closest?.('#mainNav [data-view],#notificationBell,#sidebarAccount');if(!button)return null;if(button.id==='notificationBell')return ['notifications'];if(button.id==='sidebarAccount')return ['profile'];const category=button.dataset.collection;return [category?'library':button.dataset.view,category];}
 document.addEventListener('pointerover',event=>{const next=target(event.target);if(!next)return;clearTimeout(hover);hover=setTimeout(()=>enqueue(...next),120);});
 document.addEventListener('pointerout',event=>{if(target(event.target))clearTimeout(hover);});
 document.addEventListener('focusin',event=>{const next=target(event.target);if(next)enqueue(...next);});
 const app=showApp;showApp=async function(...args){const result=await app(...args);if(ready()&&!navigator.connection?.saveData&&!/^(slow-)?2g$/.test(navigator.connection?.effectiveType||'')){const account=state.userId;timer=setTimeout(()=>{if(account===state.userId)for(const category of ['jogos','filmes','series','animes'])enqueue('library',category);},1800);}return result;};
 const routeKey=view=>[view,view==='library'?state.libraryCategory:view==='profile'?state.profileUser||state.userId:view==='discover'?state.discoverTab:view==='settings'?state.settingsTab:''].join(':');let lastRoute='';const navigateBefore=navigate;navigate=async function(view,...args){const key=routeKey(view),context={owner:state.userId,view,ticket:++sequence,fresh:args[0]?.fresh??key===lastRoute};state.screenReadContext=context;try{return await navigateBefore(view,...args);}finally{if(state.screenReadContext===context){lastRoute=key;state.screenReadContext=null;}}};
 const login=showLogin;showLogin=function(...args){cancel();screenCache.clear();return login(...args);};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();else screenCache.invalidate();});
 window.addEventListener('online',()=>screenCache.invalidate());
 window.BatPreload={warm,cancel};
})();

'use strict';
// A single compositor animation per pane, with no timers or delayed interaction.
function createNavigationMotion({enabled,animate}){
 let current=null;
 const clear=()=>{const old=current;current=null;old?.cancel();};
 return {clear,reveal(root){clear();if(!enabled())return;let animation;try{animation=animate(root,[{opacity:.4,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:220,easing:'cubic-bezier(.22,1,.36,1)',fill:'none'});}catch{return;}current=animation;animation.id='navigation-reveal';const release=()=>{if(current===animation)current=null;};animation.finished.then(release,release);}};
}
// Only the newest navigation may show or dismiss its delayed read indicator.
function createNavigationGate({start,pending,complete,owner,schedule=setTimeout,unschedule=clearTimeout,delay=180}){
 let sequence=0,timer=null,active=null;
 const stop=()=>{if(timer!==null)unschedule(timer);timer=null;};
 return {
  begin(context){stop();if(active)complete(active,false);const ticket=++sequence;active={...context,ticket};start(active);timer=schedule(()=>{if(active?.ticket!==ticket)return;timer=null;if(owner()===active.owner)pending(active);},delay);return ticket;},
  end(ticket){if(active?.ticket!==ticket)return;stop();const finished=active;active=null;complete(finished,true);},
  cancel(){stop();sequence++;const finished=active;active=null;if(finished)complete(finished,false);},
  get active(){return active;}
 };
}
if(typeof window!=='undefined'&&typeof navigate==='function')(()=>{
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
 const motion=createNavigationMotion({enabled:()=>!reducedMotion.matches&&!document.body.classList.contains('no-animations')&&!document.hidden,animate:(root,frames,options)=>root.animate(frames,options)});
 const screenKey=view=>[view,view==='library'?state.libraryCategory:view==='discover'?state.discoverTab:view==='profile'?state.profileUser||state.userId:view==='settings'?state.settingsTab:view==='chat'?window.batcavernaChatTarget?.()||'lobby':''].join(':');
 let displayed=screenKey(state.current);
 reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)motion.clear();});
 new MutationObserver(()=>{if(document.body.classList.contains('no-animations'))motion.clear();}).observe(document.body,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)motion.clear();});
 const category=()=>({jogos:'sua biblioteca',filmes:'seus filmes',series:'suas séries',animes:'seus animes'}[state.libraryCategory]||'sua coleção');
 const label=view=>view==='library'?`Abrindo ${category()}…`:({home:'Abrindo o início…',profile:'Abrindo o perfil…',discover:'Abrindo Minha Steam…',settings:'Abrindo configurações…','game-feed':'Abrindo o feed dos amigos…',lists:'Abrindo suas listas…',recommendations:'Abrindo suas indicações…',statistics:'Preparando estatísticas…',friends:'Abrindo seus amigos…',chat:'Abrindo a conversa…',notifications:'Abrindo notificações…'}[view]||'Preparando esta aba…');
 const pageClasses={home:['reference-home','cavern-home'],library:['reference-library','cavern-library'],profile:['cavern-profile','profile-atmosphere'],friends:['reference-friends','friends-chat-reference','community-hub'],chat:['reference-chat-page','friends-chat-reference','chat-reference-active'],social:['community-feed'],'game-feed':['game-feed-screen']};
 const routeClasses=Object.values(pageClasses).flat();
 const gate=createNavigationGate({owner:()=>state.userId,
  start(context){const root=context.root;context.retained=routeClasses.filter(name=>root.classList.contains(name));context.wasInert=root.inert;context.previousConversation=context.chatOnly?root.querySelector('.conversation'):null;context.conversationWasInert=context.previousConversation?.inert;if(context.previousConversation)context.previousConversation.inert=true;context.busy=root.getAttribute('aria-busy');context.initial=!root.children.length;root.inert=context.chatOnly?context.wasInert:true;root.classList.toggle('navigation-chat-reading',context.chatOnly);root.setAttribute('aria-busy','true');root.classList.remove('navigation-committed');root.classList.add('navigation-pending',context.staged?'navigation-staging':'navigation-reading');context.observer=new MutationObserver(records=>{if(gate.active?.ticket!==context.ticket)return;if(records.some(record=>record.type==='childList')){root.classList.remove('navigation-reading');if(!root.classList.contains('navigation-staging'))root.classList.add('navigation-staging');}if(root.classList.contains('navigation-reading'))for(const name of context.retained)if(!root.classList.contains(name))root.classList.add(name);if(!root.classList.contains('navigation-pending'))root.classList.add('navigation-pending');if(root.getAttribute('aria-busy')!=='true')root.setAttribute('aria-busy','true');});context.observer.observe(root,{childList:true,attributes:true,attributeFilter:['class','aria-busy']});},
  pending(context){if(!context.root.isConnected)return;const panel=document.createElement('div');panel.id='navigationProgress';panel.className='navigation-progress'+(context.initial?' navigation-progress-initial':'');panel.append(window.BatFeedback.loading({library:context.view==='library',title:context.label}));context.panel=panel;context.root.before(panel);context.root.classList.add('navigation-waiting');},
  complete(context,commit){context.observer?.disconnect();context.panel?.remove();const root=context.root;if(commit){document.body.dataset.screen=state.current||'home';document.body.classList.toggle('rail-off',['chat','friends'].includes(state.current));const keep=pageClasses[state.current]||[];for(const name of routeClasses)if(!keep.includes(name))root.classList.remove(name);}root.inert=context.wasInert;if(context.previousConversation?.isConnected)context.previousConversation.inert=context.conversationWasInert;if(context.busy===null)root.removeAttribute('aria-busy');else root.setAttribute('aria-busy',context.busy);root.classList.remove('navigation-pending','navigation-reading','navigation-staging','navigation-waiting','navigation-chat-reading','screen-pending','view-preparing');root.classList.add('navigation-committed');if(commit){const next=screenKey(state.current);if(!context.initial&&displayed!==next&&context.owner===state.userId)motion.reveal(context.chatOnly?root.querySelector('.conversation')||root:root);displayed=next;}}
 });
 const begin=view=>{const root=document.querySelector('#content');return gate.begin({root,view,chatOnly:view==='chat'&&state.current==='chat'&&!!root.querySelector('.chat-studio'),owner:state.userId,label:label(view),staged:root.classList.contains('navigation-staging')});};
 const original=navigate;navigate=async function(view,...args){const ticket=begin(view);try{return await original(view,...args)}finally{gate.end(ticket)}};
 // Read states are now outside the content: its existing DOM remains until replacement.
 loading=function(){};
 const wrap=(renderer,view)=>async function(...args){if(gate.active||state.current!==view)return renderer(...args);const ticket=begin(view);try{return await renderer(...args)}finally{gate.end(ticket)}};
 renderLibrary=wrap(renderLibrary,'library');renderHome=wrap(renderHome,'home');renderProfile=wrap(renderProfile,'profile');renderDiscover=wrap(renderDiscover,'discover');renderSettings=wrap(renderSettings,'settings');renderChat=wrap(renderChat,'chat');
 const login=showLogin;showLogin=function(...args){motion.clear();gate.cancel();displayed='';return login(...args)};
})();

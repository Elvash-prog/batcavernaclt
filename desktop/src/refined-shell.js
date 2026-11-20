// Caverna refinada (conceito A): o painel de amigos vira uma gaveta aberta pelo botão
// "Amigos" da lateral, para o conteúdo usar a largura inteira. A escolha fica salva no PC.
(()=>{
 const KEY='bc-friends-drawer-v1';
 const shell=document.getElementById('appShell');
 const rail=shell&&shell.querySelector('.cavern-rail');
 const foot=shell&&shell.querySelector('.sidebar-foot');
 if(!rail||!foot)return;
 document.body.classList.add('refined-ui');
 if(!rail.id)rail.id='friendsDrawer';
 const button=document.createElement('button');
 button.type='button';button.id='friendsToggle';button.className='friends-toggle';
 button.setAttribute('aria-controls',rail.id);button.setAttribute('aria-expanded','false');
 button.innerHTML='<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/></svg><span>Amigos</span><b class="friends-toggle-count" hidden></b>';
 // Fica fora de .sidebar-foot, que é redesenhado por outros módulos.
 foot.before(button);
 const count=button.querySelector('b');
 const refresh=()=>{
  const online=[...rail.querySelectorAll('[data-sidebar-chat]')].filter(item=>!item.closest('.rail-offline')).length;
  count.hidden=!online;count.textContent=online+' online';
  button.setAttribute('aria-label',online?`Amigos, ${online} online`:'Amigos');
 };
 new MutationObserver(refresh).observe(rail,{childList:true,subtree:true});
 refresh();
 const isOpen=()=>document.body.classList.contains('friends-open');
 const set=(open,focus)=>{
  document.body.classList.toggle('friends-open',open);
  button.setAttribute('aria-expanded',String(open));
  rail.toggleAttribute('inert',!open);
  try{localStorage.setItem(KEY,open?'1':'0')}catch{}
  if(open&&focus)rail.querySelector('.rail-search input')?.focus({preventScroll:true});
 };
 button.addEventListener('click',()=>set(!isOpen(),true));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&isOpen()){set(false);button.focus()}});
 document.addEventListener('pointerdown',event=>{if(isOpen()&&!rail.contains(event.target)&&!button.contains(event.target))set(false)});
 rail.addEventListener('click',event=>{if(event.target.closest('[data-sidebar-chat]'))set(false)});
 let initial=false;try{initial=localStorage.getItem(KEY)==='1'}catch{}
 set(initial,false);
})();

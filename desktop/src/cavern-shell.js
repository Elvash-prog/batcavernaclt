'use strict';
(()=>{
 const shell=$('#appShell'),nav=$('#mainNav'),sidebar=$('.sidebar');
 if(!shell||!nav||!sidebar)return;
 const svg=body=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
 const icons={
  home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-6h4v6"/>',
  library:'<path d="M7 8h10a4 4 0 0 1 3.9 4.9l-.7 3.2a2.4 2.4 0 0 1-4 1.2L14 15.5h-4l-2.2 1.8a2.4 2.4 0 0 1-4-1.2l-.7-3.2A4 4 0 0 1 7 8z"/><path d="M8 10.5v3M6.5 12h3"/><circle cx="15.5" cy="11" r=".6"/><circle cx="17.5" cy="13" r=".6"/>',
  social:'<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14c2.6 0 4.1 1.3 4.5 4"/>',
  friends:'<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.7-3.8 3.4-6 7-6s6.3 2.2 7 6"/>',
  chat:'<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v4M8 21h8M9 17h6"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>',
  film:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 5v14M16 5v14M4 9h4M4 15h4M16 9h4M16 15h4"/>',
  anime:'<path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>',
  lists:'<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r=".8"/><circle cx="4" cy="12" r=".8"/><circle cx="4" cy="18" r=".8"/>',
  recommend:'<path d="M7 17 17 7M9 7h8v8"/>',
  stats:'<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  gift:'<rect x="3" y="9" width="18" height="11" rx="1.5"/><path d="M12 9v11M3 13h18"/><path d="M12 9c-1-4-5-4-5-1.5S10 9 12 9zM12 9c1-4 5-4 5-1.5S14 9 12 9z"/>',
  steam:'<circle cx="12" cy="12" r="9"/><circle cx="15" cy="9.5" r="2.5"/><path d="M4.5 14l4 1.6M8 17.5a2 2 0 1 0 1.4-3.7"/>',
  retro:'<rect x="4" y="15" width="16" height="5" rx="2"/><path d="M12 15V9"/><circle cx="12" cy="6.5" r="2.5"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>'
 };
 const main=[
  ['home','Início','home'],['library','Biblioteca','library',{collection:'jogos'}],['social','Comunidade','social'],
  ['friends','Amigos','friends'],['chat','Chat','chat'],['achievements','Conquistas','trophy',{action:'achievements'}],['settings','Configurações','settings']
 ];
 const more=[
  ['media','Filmes e séries','film',{collection:'filmes'}],['anime','Animes','anime',{collection:'animes'}],['lists','Listas','lists'],
  ['recommendations','Indicações','recommend'],['statistics','Estatísticas','stats'],
  ['discover','Jogos grátis','gift',{kind:'free'}],['discover','Minha Steam','steam',{kind:'steam'}],['discover','Minha Retro','retro',{kind:'retro'}]
 ];
 const button=([view,label,icon,extra={}])=>{
  const attrs=extra.action?`data-shell-action="${extra.action}"`:`data-view="${view}"`;
  return `<button type="button" ${attrs}${extra.collection?` data-collection="${extra.collection}"`:''}${extra.kind?` data-discover-kind="${extra.kind}"`:''}>${svg(icons[icon])}<span>${label}</span></button>`;
 };
 nav.innerHTML=`<div class="shell-nav-main">${main.map(button).join('')}</div><div class="shell-nav-more"><small>EXPLORAR</small>${more.map(button).join('')}</div>`;

 const logo=$('.sidebar .logo');
 if(logo)logo.innerHTML='<img src="brand.jpg" alt=""><strong>BatCaverna <em>CLT</em></strong><small>JOGOS • PESSOAS • HISTÓRIAS</small>';

 const rail=document.createElement('aside');
 rail.className='cavern-rail';rail.setAttribute('aria-label','Amigos e atividade');
 rail.innerHTML=`<label class="rail-search">${svg(icons.search)}<input type="search" id="railSearch" placeholder="Buscar amigos…" aria-label="Buscar amigos" autocomplete="off"></label>`;
 const community=$('#sidebarCommunity');
 if(community)rail.append(community);
 shell.append(rail);
 const applyFilter=()=>{
  const query=$('#railSearch').value.trim().toLocaleLowerCase('pt-BR');
  rail.querySelectorAll('[data-sidebar-chat]').forEach(item=>{item.hidden=!!query&&!item.textContent.toLocaleLowerCase('pt-BR').includes(query)});
 };
 $('#railSearch').addEventListener('input',applyFilter);
 if(community)new MutationObserver(applyFilter).observe(community,{childList:true});

 let achievements=false;
 nav.addEventListener('click',async event=>{
  const action=event.target.closest('[data-shell-action="achievements"]');if(!action)return;
  state.profileUser=null;
  await navigate('profile');
  $('[data-profile-section="achievements"]')?.click();
  achievements=true;syncActive();
 });
 function syncActive(){
  nav.querySelectorAll('[data-shell-action="achievements"]').forEach(item=>item.classList.toggle('active',achievements&&state.current==='profile'));
  if(achievements&&state.current==='profile')nav.querySelectorAll('[data-view]').forEach(item=>item.classList.remove('active'));
 }
 function syncView(){
  document.body.dataset.screen=state.current||'home';
  document.body.classList.toggle('rail-off',['chat','friends'].includes(state.current));
 }
 const baseNavigate=navigate;
 navigate=async function(view){
  if(view!=='profile')achievements=false;
  document.body.dataset.screen=view;syncView();
  try{await baseNavigate(view)}finally{syncView();syncActive()}
 };

 const baseHome=renderHome;
 renderHome=async function(){
  await baseHome();
  if(state.current!=='home')return;
  const content=$('#content'),activity=$('.hero-activity');
  if(activity&&!activity.closest('.cavern-recent')){
   activity.querySelector(':scope>.section-head')?.remove();
   const section=document.createElement('section');section.className='cavern-recent';
   section.innerHTML='<div class="section-head"><h2>Atividade recente</h2><button type="button" class="link-button" data-shell-go="social">Ver todos →</button></div>';
   section.append(activity);content.append(section);
  }
  const recent=$('.shelf-section .section-head');
  if(recent&&!recent.querySelector('[data-shell-go]')){
   recent.insertAdjacentHTML('beforeend','<button type="button" class="link-button" data-shell-go="library">Ver todos →</button>');
  }
  content.querySelectorAll('[data-shell-go]').forEach(item=>item.onclick=()=>navigate(item.dataset.shellGo));
 };
 syncView();
})();

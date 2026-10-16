'use strict';
(()=>{
 const shell=$('#appShell'),nav=$('#mainNav'),sidebar=$('.sidebar');
 if(!shell||!nav||!sidebar)return;
 const svg=body=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
 const icons={
  home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-6h4v6"/>',
  library:'<path d="M7 8h10a4 4 0 0 1 3.9 4.9l-.7 3.2a2.4 2.4 0 0 1-4 1.2L14 15.5h-4l-2.2 1.8a2.4 2.4 0 0 1-4-1.2l-.7-3.2A4 4 0 0 1 7 8z"/><path d="M8 10.5v3M6.5 12h3"/><circle cx="15.5" cy="11" r=".6"/><circle cx="17.5" cy="13" r=".6"/>',
  social:'<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.3 3-5 6-5s5.4 1.7 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16.5 14c2.6 0 4.1 1.3 4.5 4"/>',
  user:'<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.7-3.8 3.4-6 7-6s6.3 2.2 7 6"/>',
  friends:'<circle cx="10" cy="8" r="3.4"/><path d="M3.5 20c.6-3.6 3.2-5.6 6.5-5.6s5.9 2 6.5 5.6"/><path d="M19 7v6M16 10h6"/>',
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
  ['home','Início','home'],['library','Biblioteca','library',{collection:'jogos'}],['media','Filmes e Séries','film',{collection:'filmes'}],['anime','Animes','anime',{collection:'animes'}],
  ['discover','Minha Steam','steam',{kind:'steam'}],['discover','Meu Retrô','retro',{kind:'retro'}],
  ['social','Comunidade','social'],['settings','Configurações','settings']
 ];
 const more=[
  ['lists','Listas','lists'],['recommendations','Indicações','recommend'],['discover','Jogos grátis','gift',{kind:'free'}]
 ];
 const button=([view,label,icon,extra={}])=>{
  const attrs=extra.action?`data-shell-action="${extra.action}"`:`data-view="${view}"`;
  return `<button type="button" ${attrs}${extra.collection?` data-collection="${extra.collection}"`:''}${extra.kind?` data-discover-kind="${extra.kind}"`:''}>${svg(icons[icon])}<span>${label}</span></button>`;
 };
 nav.innerHTML=`<div class="shell-nav-main">${main.map(button).join('')}</div><div class="shell-nav-more"><small>MAIS</small>${more.map(button).join('')}</div>`;

 const logo=$('.sidebar .logo');
 if(logo)logo.innerHTML='<img src="brand.jpg" alt=""><strong>BatCaverna <em>CLT</em></strong><small>JOGOS • PESSOAS • HISTÓRIAS</small>';

 const bell=$('#notificationBell');if(bell&&logo)logo.after(bell);
 const rail=document.createElement('aside');
 rail.className='cavern-rail';rail.setAttribute('aria-label','Amigos online e jogando na Steam');
 const community=$('#sidebarCommunity');
 if(community)rail.append(community);
 shell.append(rail);
 rail.insertAdjacentHTML('afterbegin',`<label class="rail-search">${svg(icons.search)}<input type="search" placeholder="Buscar amigos..." aria-label="Buscar amigos"></label>`);
 rail.querySelector('.rail-search input').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();rail.querySelectorAll('[data-sidebar-chat]').forEach(b=>b.hidden=!!q&&!b.textContent.toLowerCase().includes(q))});
 const sync=()=>{document.body.dataset.screen=state.current||'home';document.body.classList.toggle('rail-off',['chat','friends'].includes(state.current))};
 const baseNavigate=navigate;
 navigate=async function(view){
  document.body.dataset.screen=view;
  try{await baseNavigate(view)}finally{sync()}
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
 const baseProfile=renderProfile;
 renderProfile=async function(userId){
  await baseProfile(userId);
  if(state.current!=='profile')return;
  const card=$('.complete-profile'),overview=$('#profileOverview');
  if(!card||!overview||card.dataset.cavern)return;
  card.dataset.cavern='1';
  const stat=label=>[...card.querySelectorAll('.profile-stats span')].find(s=>s.textContent.includes(label))?.querySelector('b')?.textContent||'0';
  const level=(overview.querySelector('.level-card h2')?.textContent||'').replace(/\D/g,'')||'1';
  const xp=overview.querySelector('.level-card p')?.textContent||'';
  const progress=overview.querySelector('.level-card progress');
  const unlocked=(overview.querySelector('.profile-feature p')?.textContent.match(/^(\d+) de/)||[])[1]||'0';
  const friends=overview.querySelectorAll('.friend-grid .friend-card').length;
  const cell=(icon,value,label,extra='')=>`<div class="cavern-stat">${svg(icons[icon])}<span><b>${esc(value)}</b><small>${label}</small>${extra}</span></div>`;
  card.insertAdjacentHTML('afterend',`<section class="cavern-stats" aria-label="Resumo do perfil"><div class="cavern-stat cavern-level"><i>${esc(level)}</i><span><b>Nível ${esc(level)}</b><small>${esc(xp.replace(' acumulados',''))}</small><progress max="${progress?.max||1}" value="${progress?.value||0}"></progress></span></div>${cell('trophy',unlocked,'Conquistas')}${cell('library',stat('jogos'),'Jogos')}${cell('stats',stat('jogadas'),'Tempo de jogo')}${cell('friends',friends,'Amigos')}</section>`);
  const highlights=[...overview.querySelectorAll('.profile-feature')].find(n=>n.querySelector('h3')?.textContent==='Conquistas em destaque');
  const bio=card.querySelector('.profile-info>p');
  const about=document.createElement('article');about.className='profile-feature cavern-about';
  about.innerHTML=`<h3>Sobre mim</h3><p>${esc(bio?.textContent||'Este perfil ainda não tem uma bio.')}</p>`;
  const columns=document.createElement('div');columns.className='cavern-overview-grid';
  columns.append(about);if(highlights)columns.append(highlights);
  overview.prepend(columns);
  overview.querySelector('.profile-overview-columns')?.classList.add('cavern-hidden-level');
  const favorites=overview.querySelector('.profile-featured')?.closest('.shelf-section')||overview.querySelector('.shelf-section');
  if(favorites){favorites.classList.add('cavern-favorites');favorites.querySelector('h2')&&(favorites.querySelector('h2').textContent='Jogos favoritos');favorites.querySelectorAll('.cinema-card').forEach((c,i)=>c.insertAdjacentHTML('afterbegin',`<em class="cavern-rank">${i+1}</em>`))}
 };
 const baseRetroDiscover=renderDiscover;
 renderDiscover=async function(){
  if(state.discoverTab==='free'){
   setPage('Jogos grátis','OFERTAS PARA RESGATAR');
   const content=$('#content');
   content.innerHTML='<div id="discoverBody" class="free-offers-page"><div class="loading"><span class="spinner"></span>Buscando jogos grátis…</div></div>';
   const out=$('#discoverBody');
   try{
    const data=await api.bright({op:'gratis'});
    if(state.current!=='discover'||state.discoverTab!=='free'||!out.isConnected)return;
    const rows=[...(data.epic||[]).map(item=>({...item,store:'Epic'})),...(data.steam||[]).map(item=>({...item,store:'Steam'}))];
    out.innerHTML=`<div class="section-head"><div><span class="eyebrow">OFERTAS DA SEMANA</span><h2>Jogos 100% grátis <small>${rows.length}</small></h2><p>Resgate enquanto as ofertas ainda estão disponíveis.</p></div></div>${['Epic','Steam'].map(store=>`<section class="free-store-section"><h2>${store==='Epic'?'Epic Games':'Steam'}</h2><section class="offers">${rows.filter(r=>r.store===store).map(offerCard).join('')||'<p class="empty">Nenhuma oferta disponível nesta loja.</p>'}</section></section>`).join('')}`;
    out.querySelectorAll('.offer-card').forEach((card,index)=>{const row=rows.filter(r=>r.store==='Epic').concat(rows.filter(r=>r.store==='Steam'))[index],image=card.querySelector('img'),id=Number(row.appid||row.steamAppid||String(row.url||'').match(/app\/(\d+)/)?.[1]);if(image&&!id){const repair=async()=>{image.onerror=null;try{const cover=await window.batcavernaRetroCover(row.nome,'');if(cover)image.src=await api.coverImage(cover);else image.alt='Imagem indisponível — '+row.nome}catch{image.alt='Imagem indisponível — '+row.nome}};image.onerror=repair;if(!row.capa||/brand\.jpg$/.test(image.getAttribute('src')||''))void repair()}if(image&&id){image.onerror=async()=>{image.onerror=null;try{const data=await api.bright({op:'steamInfo',appids:[id]});const cover=data.lista?.[0]?.capa||`https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${id}/header.jpg`;image.src=await api.coverImage(cover)}catch{image.alt='Imagem indisponível — '+row.nome}};image.src=`https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${id}/header.jpg`;}const store=card.querySelector('small')?.textContent||'';card.classList.toggle('offer-steam',/steam/i.test(store));card.classList.toggle('offer-epic',/epic/i.test(store));const tag=document.createElement('span');tag.className='offer-discount';tag.textContent='−100%';card.querySelector('.body')?.prepend(tag)});
    out.querySelectorAll('[data-open-url]').forEach(button=>button.onclick=()=>api.open(button.dataset.openUrl));
   }catch(error){if(out.isConnected)out.innerHTML=`<div class="error-card"><p>Não foi possível carregar os jogos grátis.</p><p>${esc(failure(error))}</p><button class="secondary" id="retryFreeGames">Tentar novamente</button></div>`;$('#retryFreeGames')?.addEventListener('click',renderDiscover)}
   return;
  }
  await baseRetroDiscover();
  if(state.current!=='discover'||state.discoverTab!=='retro')return;
  const out=$('#discoverBody'),hero=out?.querySelector('.retro-profile');
  if(!hero||out.querySelector('.cavern-stats'))return;
  const cards=[...out.querySelectorAll('.retro-game-card')];
  let got=0,total=0,hard=0;
  cards.forEach(c=>{const m=c.querySelector('.body p')?.textContent.match(/(\d+)\/(\d+) conquistas · (\d+) Hardcore/);if(m){got+=+m[1];total+=+m[2];hard+=+m[3]}});
  const points=(hero.querySelector('p')?.textContent.match(/^([\d.,]+) pontos · ([\d.,]+)/)||[]).slice(1);
  const cell=(icon,value,label)=>`<div class="cavern-stat">${svg(icons[icon])}<span><b>${esc(value)}</b><small>${label}</small></span></div>`;
  hero.insertAdjacentHTML('afterend',`<section class="cavern-stats cavern-retro-stats" aria-label="Resumo retrô">${cell('trophy',points[0]||'0','Pontos')}${cell('stats',points[1]||'0','True points')}${cell('library',cards.length,'Jogos')}${cell('trophy',`${got}/${total}`,'Conquistas')}${cell('trophy',hard,'Hardcore')}</section>`);
 };
 const hoursOf=v=>Number(String(v??'').match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',','.'))||0;
 const libTabs=games=>[['all','Todos',()=>true],['progress',games?'Em progresso':'Assistindo',s=>s==='progress'],['done',games?'Concluídos':'Concluídos',s=>['finished','platinum'].includes(s)],['backlog',games?'Não iniciados':'Para assistir',s=>s==='backlog'],['favorite','Favoritos',s=>s==='favorite']];
 const baseLibraryDraw=drawLibrary;
 drawLibrary=function(){
  baseLibraryDraw();
  if(state.current!=='library')return;
  const content=$('#content'),box=$('#libraryGroups');
  if(!content||!box||!state.libraryRows)return;
  const games=state.libraryCategory==='jogos',tabs=libTabs(games),key=tabs.some(t=>t[0]===state.cavernFilter)?state.cavernFilter:'all',view=localStorage.getItem('cavern-lib-view')==='list'?'list':'grid';
  state.cavernFilter=key;
  const match=tabs.find(t=>t[0]===key)[2];
  if(key!=='all'){
   box.querySelectorAll('[data-detail]').forEach(card=>{const row=state.libraryRows.find(r=>String(r.id)===String(card.dataset.detail));if(!row||!match(normalizedStatus(row.status)))card.remove()});
   box.querySelectorAll('.collection-section').forEach(s=>{if(!s.querySelector('[data-detail]'))s.remove()});
   const total=box.querySelectorAll('[data-detail]').length,count=box.querySelector('.collection-result-count');
   if(count)count.textContent=`${total} títulos na sua coleção`;
   if(!total&&!box.querySelector('.empty'))box.innerHTML='<div class="empty">Nenhum título neste filtro.</div>';
  }
  box.classList.toggle('cavern-list',view==='list');
  content.querySelector('.cavern-lib-bar')?.remove();
  content.querySelector('.cavern-featured')?.remove();
  const bar=document.createElement('div');
  bar.className='cavern-lib-bar';
  bar.innerHTML=`<div class="cavern-lib-tabs" role="tablist">${tabs.map(([k,l,f])=>`<button type="button" role="tab" data-lib-filter="${k}" aria-selected="${k===key}" class="${k===key?'active':''}">${l} (${state.libraryRows.filter(r=>f(normalizedStatus(r.status))).length})</button>`).join('')}</div><div class="cavern-view-toggle" role="group" aria-label="Modo de exibição"><button type="button" data-lib-view="grid" aria-label="Grade" aria-pressed="${view==='grid'}" class="${view==='grid'?'active':''}">${svg('<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/>')}</button><button type="button" data-lib-view="list" aria-label="Lista" aria-pressed="${view==='list'}" class="${view==='list'?'active':''}">${svg('<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>')}</button></div>`;
  (content.querySelector('.library-controls')||box).after(bar);
  bar.querySelectorAll('[data-lib-filter]').forEach(b=>b.onclick=()=>{state.cavernFilter=b.dataset.libFilter;drawLibrary()});
  bar.querySelectorAll('[data-lib-view]').forEach(b=>b.onclick=()=>{localStorage.setItem('cavern-lib-view',b.dataset.libView);drawLibrary()});
  const featured=games&&key==='all'&&!state.libraryQuery?[...state.libraryRows].filter(r=>hoursOf(r.horas)>0).sort((a,b)=>hoursOf(b.horas)-hoursOf(a.horas)).slice(0,2):[];
  if(!featured.length)return;
  const section=document.createElement('section');
  section.className='cavern-featured';
  section.innerHTML=`<header><h2>Em destaque</h2><button type="button" class="cavern-link" data-featured-all>Ver todos →</button></header><div class="cavern-featured-grid">${featured.map(r=>`<article class="cavern-featured-card" data-featured="${esc(r.id)}"><img src="brand.jpg" data-cover="${esc(coverUrl(r.capa))}" data-cover-name="${esc(r.nome)}" data-cover-game="1" data-cover-format="landscape" data-steam-appid="${esc(r.steam_appid||'')}" alt=""><div class="cavern-featured-body"><h3>${esc(r.nome)}</h3><small>${hoursOf(r.horas)}h jogadas · ${esc(r.status||'Na biblioteca')}</small><div class="cavern-featured-actions">${r.steam_appid?'<button type="button" class="primary" data-featured-play>▶ Jogar</button>':''}<button type="button" class="secondary" data-featured-details aria-label="Ver detalhes de ${esc(r.nome)}">…</button></div></div></article>`).join('')}</div>`;
  bar.after(section);
  section.querySelector('[data-featured-all]').onclick=()=>{state.librarySort='hours';const sort=$('#librarySort');if(sort)sort.value='hours';drawLibrary();box.scrollIntoView({block:'start'})};
  section.querySelectorAll('.cavern-featured-card').forEach(card=>{
   const row=featured.find(r=>String(r.id)===card.dataset.featured);
   card.querySelector('[data-featured-details]').onclick=()=>box.querySelector(`[data-detail="${CSS.escape(String(row.id))}"]`)?.click();
   const play=card.querySelector('[data-featured-play]');
   if(play)play.onclick=()=>call('launch_game',{appid:Number(row.steam_appid)}).catch(e=>globalThis.toast(failure(e)));
  });
  hydrateCovers(section);
 };
 sync();

 let pending=null,checking=false;
 const toast=()=>{
  let box=$('#updateToast');
  if(!box){box=document.createElement('aside');box.id='updateToast';box.className='update-toast';box.setAttribute('role','status');document.body.append(box)}
  return box;
 };
 const hideToast=()=>{$('#updateToast')?.remove()};
 const installNow=async()=>{
  if(!pending||!await confirmUpdate(pending))return;
  const box=toast();box.innerHTML=`<strong>Instalando a versão ${esc(pending.version)}…</strong><small>Baixando e verificando a assinatura.</small>`;
  try{await api.installUpdate(pending.version);box.innerHTML='<strong>Atualização instalada</strong><small>O instalador iniciará a versão nova.</small>'}
  catch(error){box.innerHTML=`<strong>Não foi possível instalar</strong><small>${esc(failure(error))}</small><div><button type="button" class="secondary" data-update-dismiss>Fechar</button></div>`;box.querySelector('[data-update-dismiss]').onclick=hideToast}
 };
 const markSidebar=()=>{
  const foot=$('.sidebar-foot');if(!foot||!pending)return;
  let link=$('#updateLink');
  if(!link){link=document.createElement('button');link.id='updateLink';link.type='button';link.className='update-link';link.onclick=installNow;foot.prepend(link)}
  link.textContent=`⬆ Atualizar para ${pending.version}`;
 };
 const announce=update=>{
  pending=update;markSidebar();
  if(sessionStorage.getItem('bc-update-dismissed')===update.version)return;
  const box=toast();
  box.innerHTML=`<strong>Nova versão ${esc(update.version)} disponível</strong><small>Atualize para receber as melhorias mais recentes.</small><div><button type="button" class="primary" data-update-now>Ver e instalar</button><button type="button" class="secondary" data-update-later>Depois</button></div>`;
  box.querySelector('[data-update-now]').onclick=installNow;
  box.querySelector('[data-update-later]').onclick=()=>{sessionStorage.setItem('bc-update-dismissed',update.version);hideToast()};
 };
 let lastCheck=0;
 const autoCheck=async()=>{
  if(checking||$('#appShell').hidden||!state.userId||Date.now()-lastCheck<6*60*60*1000)return;
  checking=true;lastCheck=Date.now();
  try{const update=await api.checkForUpdates();if(update?.available&&update.version)announce(update)}
  catch{}
  finally{checking=false}
 };
 setTimeout(autoCheck,5000);
 setInterval(autoCheck,60*1000);
})();

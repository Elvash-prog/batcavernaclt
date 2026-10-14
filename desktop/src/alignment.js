'use strict';
(()=>{
const statusOptions={online:'Online',jogando:'Jogando',ausente:'Ausente',dnd:'Não incomodar',invisivel:'Invisível'};

function safeAvatar(img){if(!img||img.dataset.fallbackReady)return;img.dataset.fallbackReady='1';img.addEventListener('error',()=>{img.removeAttribute('data-private-src');img.src='brand.jpg'},{once:true});}
document.addEventListener('error',event=>{if(event.target instanceof HTMLImageElement&&event.target.src&&!event.target.src.endsWith('/brand.jpg')){event.target.removeAttribute('data-private-src');event.target.src='brand.jpg'}},true);
new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType!==1)return;if(node.matches?.('img'))safeAvatar(node);node.querySelectorAll?.('img').forEach(safeAvatar)}))).observe(document.body,{childList:true,subtree:true});
document.querySelectorAll('img').forEach(safeAvatar);

const baseNavigate=navigate;
navigate=async function(view){
 $('#content')?.classList.remove('friends-chat-reference','chat-reference-active');
 return baseNavigate(view==='collection'?'library':view);
};
const baseDrawLibrary=drawLibrary;
drawLibrary=function(){
 baseDrawLibrary();if(state.current!=='library')return;
 const tabs=$('#statusTabs');if(tabs)tabs.hidden=false;
 const filter=$('#libraryStatusFilter');if(filter)filter.value=state.libraryStatus;
};
const baseLibrary=renderLibrary;
renderLibrary=async function(){
 await baseLibrary();if(state.current!=='library')return;
 let theme={};try{theme=JSON.parse(localStorage.getItem('bc-desktop-theme-v2')||'{}')}catch{}
 $('#content').style.setProperty('--collection-card-width',`${Math.max(180,Math.min(500,Number(theme.cardWidth)||190))}px`);
 drawLibrary();
};
const friendsNav=$('#mainNav [data-view="friends"]');
friendsNav?.remove();
const chatNav=$('#mainNav [data-view="chat"]');
chatNav?.remove();

async function setOwnStatus(status,button){
 const p=state.profile||{},account=$('#sidebarAccount');if(button)button.disabled=true;
 try{
  await api.updateProfile({name:p.nome||p.slug||'CLT',bio:p.bio||'',banner:p.banner_url||p.banner||'',status,steamId:p.steam_id||'',avatar:p.avatar_url||'',games:p.jogos_destaque||[],titleLevel:Number(p.titulo_destaque_nivel)||0,achievements:p.conquistas_destaque||[]});
  p.status_personalizado=status;const accountStatus=$('#accountStatus');if(accountStatus)accountStatus.textContent=statusOptions[status];account?.querySelector('small')&&(account.querySelector('small').textContent=statusOptions[status]);
  await call('realtime_presence',{input:{nome:p.nome||'CLT',slug:p.slug||'',avatar:p.avatar_url||'',status,jogo:'',jogo_fonte:''}}).catch(()=>{});
  toast(`Status alterado para ${statusOptions[status]}.`);return true;
 }catch(error){toast(failure(error));if(button)button.disabled=false;return false;}
}
function installStatusPicker(){
 const account=$('#sidebarAccount');if(!account)return;
 account.onclick=()=>{state.profileUser=null;navigate('profile')};
 account.setAttribute('aria-label','Abrir meu perfil');
}
installStatusPicker();

const baseProfile=renderProfile;
renderProfile=async function(userId=null){
 await baseProfile(userId);if(state.current!=='profile')return;
 const own=!userId||String(userId)===String(state.userId),card=$('.complete-profile');
 card?.classList.add('profile-cover-complete');
 if(own){
  $('[data-profile-section="library"]')?.remove();$('[data-profile-section="statistics"]')?.remove();
  $('[data-profile-page="library"]')?.remove();$('[data-profile-page="statistics"]')?.remove();
 }else{
  $('[data-profile-section="statistics"]')?.remove();$('[data-profile-page="statistics"]')?.remove();
 }
 const tabs=$('.profile-tabs');if(tabs&&!tabs.children.length)tabs.remove();await hydrateMedia($('#content'));
};

const baseSocial=renderSocial;
renderSocial=async function(){
 await baseSocial();if(state.current!=='social')return;
 const content=$('#content'),composer=$('#composer'),posts=content.querySelector('.posts');if(!composer||!posts)return;
 const heading=document.createElement('header');heading.className='community-reference-heading';heading.innerHTML='<div><span class="eyebrow">BOAS HISTÓRIAS SÃO COMPARTILHADAS</span><h2>Sua comunidade</h2><p>Conquistas, descobertas e conversas de quem joga com você.</p></div><small>● Tempo real conectado</small>';
 const shell=document.createElement('section');shell.className='community-reference-layout';
 shell.innerHTML=`<aside class="community-reference-left"><small>SEU ESPAÇO</small><nav><button data-feed-filter="all" class="active">♙ Todos</button><button data-feed-filter="friends">♡ Amigos</button><button data-feed-filter="mine">◌ Minhas publicações</button></nav><div class="community-trends"><small>EM ALTA NA CAVERNA</small><ol><li><b>01</b><span>Jogos em progresso<small>novas jornadas</small></span></li><li><b>02</b><span>Conquistas<small>momentos marcantes</small></span></li><li><b>03</b><span>Descobertas<small>indicações da comunidade</small></span></li></ol></div></aside><main class="community-reference-center"><div class="community-reference-composer"></div><h3>Na sua comunidade <small>Mais recentes</small></h3><div class="community-reference-posts"></div></main><aside class="community-reference-right"><h3>Gente que joga junto</h3><p>Novas conexões, boas histórias.</p><div id="communityConnections" class="community-connections"><span class="muted">Carregando conexões…</span></div><article><span class="eyebrow">🏆 CONQUISTA DA SEMANA</span><h2>Cada vitória conta.</h2><p>Da primeira tentativa ao último chefe. Compartilhe o seu momento.</p></article></aside>`;
 content.innerHTML='';content.append(heading,shell);shell.querySelector('.community-reference-composer').append(composer);shell.querySelector('.community-reference-posts').append(posts);
 shell.querySelectorAll('[data-feed-filter]').forEach(button=>button.onclick=()=>{shell.querySelectorAll('[data-feed-filter]').forEach(x=>x.classList.toggle('active',x===button));const ownName=String(state.profile?.nome||state.profile?.slug||'').toLowerCase();posts.querySelectorAll('.post').forEach(post=>{const author=String(post.querySelector('header strong')?.textContent||'').toLowerCase();post.hidden=button.dataset.feedFilter==='mine'&&author!==ownName;});});
 api.friends().then(rows=>{const box=$('#communityConnections');if(!box)return;box.innerHTML=rows.slice(0,4).map(friend=>`<button data-community-profile="${esc(friend.id)}"><img src="brand.jpg" data-private-src="${esc(friend.avatar_url||'')}" alt=""><span><b>${esc(friend.nome||friend.slug)}</b><small>@${esc(friend.slug||'')}</small></span><i>＋</i></button>`).join('')||'<span class="muted">Nenhuma conexão para mostrar.</span>';hydrateMedia(box);box.querySelectorAll('[data-community-profile]').forEach(button=>button.onclick=()=>{state.profileUser=button.dataset.communityProfile;navigate('profile')});}).catch(()=>{});
};

const baseFriends=renderFriends;
renderFriends=async function(){
 await baseFriends();if(!['friends','chat'].includes(state.current))return;
 const content=$('#content'),rows=content.querySelector('.reference-friend-list');if(!rows)return;
 const shell=document.createElement('section');shell.className='friends-compact';
 shell.innerHTML='<header><h2>Amigos</h2><button id="unifiedAddFriend" class="secondary">＋ Adicionar amigo</button></header><label class="compact-friends-search"><span>⌕</span><input id="compactFriendsSearch" type="search" placeholder="Buscar amigos…" aria-label="Buscar amigos"></label><div class="compact-friends-list"></div><p id="compactFriendsEmpty" class="muted" hidden>Nenhum amigo encontrado.</p>';
 content.replaceChildren(shell);content.classList.add('friends-chat-reference');shell.querySelector('.compact-friends-list').append(rows);
 rows.querySelectorAll('.friend-card').forEach(card=>{const info=card.querySelector('.friend-profile span'),status=card.querySelector('.friend-status');info?.querySelector('small')?.remove();if(info&&status)info.append(status);const chat=card.querySelector('[data-choose-chat]');if(chat){chat.textContent='›';chat.setAttribute('aria-label','Conversar com '+(card.querySelector('strong')?.textContent||'amigo'));}});
 $('#unifiedAddFriend').onclick=openFriendSearch;
 $('#compactFriendsSearch').oninput=event=>{const query=event.target.value.trim().toLocaleLowerCase('pt-BR');let visible=0;rows.querySelectorAll('.friend-card').forEach(card=>{card.hidden=!card.textContent.toLocaleLowerCase('pt-BR').includes(query);if(!card.hidden)visible++;});$('#compactFriendsEmpty').hidden=visible>0||!query;};
};
function openFriendSearch(){
 $('.friend-search-overlay')?.remove();
 const overlay=document.createElement('div');overlay.className='editor-overlay friend-search-overlay';
 overlay.innerHTML=`<section class="editor friend-search-dialog"><button class="detail-close" data-close aria-label="Fechar">×</button><span class="eyebrow">NOVA CONEXÃO</span><h2>Adicionar amigo</h2><p>Busque pelo nome, usuário ou código da pessoa.</p><form id="unifiedFriendSearch"><input name="query" type="search" minlength="2" required placeholder="Buscar usuário"><button class="primary">Pesquisar</button></form><div id="unifiedFriendResults"></div></section>`;
 document.body.append(overlay);overlay.querySelector('[data-close]').onclick=()=>overlay.remove();overlay.onclick=event=>{if(event.target===overlay)overlay.remove()};
 $('#unifiedFriendSearch').onsubmit=async event=>{event.preventDefault();const out=$('#unifiedFriendResults');out.innerHTML='<div class="loading">Buscando pessoas…</div>';try{const rows=await api.searchPeople(event.currentTarget.elements.query.value);out.innerHTML=rows.map(person=>`<article><img src="brand.jpg" data-private-src="${esc(person.avatar_url||'')}" alt=""><span><b>${esc(person.nome||person.slug)}</b><small>@${esc(person.slug||'')}</small></span><button class="primary" data-unified-invite="${esc(person.id)}">Adicionar</button></article>`).join('')||'<div class="empty">Nenhuma pessoa encontrada.</div>';hydrateMedia(out);out.querySelectorAll('[data-unified-invite]').forEach(button=>button.onclick=async()=>{button.disabled=true;try{await api.invite(button.dataset.unifiedInvite);button.textContent='Convite enviado'}catch(error){toast(failure(error));button.disabled=false}})}catch(error){out.innerHTML=`<p class="form-error">${esc(failure(error))}</p>`}};
 overlay.querySelector('input').focus();
}
const baseChat=renderChat;
renderChat=async function(){await baseChat();if(state.current!=='chat')return;$('#content').classList.add('friends-chat-reference','chat-reference-active');$('.community-tabs')?.remove();};

function installFriendsDock(){
 if($('#friendsDock'))return;
 const dock=document.createElement('section');dock.id='friendsDock';dock.className='friends-dock';dock.hidden=true;
 dock.innerHTML='<section class="friends-dock-panel" id="friendsDockPanel" hidden><header><div><b>Amigos</b><small id="friendsDockCount">Carregando…</small></div><button id="friendsDockClose" aria-label="Fechar amigos">×</button></header><div class="friends-dock-status"><small>SEU STATUS</small><div id="friendsDockStatuses"></div></div><div class="friends-dock-actions"><label><span>⌕</span><input id="friendsDockSearch" type="search" placeholder="Pesquisar amigos" aria-label="Pesquisar amigos"></label><button id="friendsDockAdd" aria-label="Adicionar amigo">＋</button></div><div id="friendsDockList" class="friends-dock-list"></div></section><button id="friendsDockToggle" class="friends-dock-toggle" aria-expanded="false"><span>♙</span> Amigos <b id="friendsDockBadge"></b></button>';
 document.body.append(dock);
 const panel=$('#friendsDockPanel'),toggle=$('#friendsDockToggle'),list=$('#friendsDockList'),search=$('#friendsDockSearch');
 let rows=[];
 const paintStatuses=()=>{const active=state.profile?.status_personalizado||'online',box=$('#friendsDockStatuses');box.innerHTML=Object.entries(statusOptions).map(([key,label])=>`<button data-dock-status="${key}" class="${key===active?'active':''}" title="${label}"><i class="status-dot status-${key}"></i><span>${label}</span></button>`).join('');box.querySelectorAll('[data-dock-status]').forEach(button=>button.onclick=async()=>{if(await setOwnStatus(button.dataset.dockStatus,button))paintStatuses()})};
 const render=()=>{const query=search.value.trim().toLocaleLowerCase('pt-BR'),visible=rows.filter(friend=>`${friend.nome||''} ${friend.slug||''}`.toLocaleLowerCase('pt-BR').includes(query));list.innerHTML=visible.map(friend=>{const presence=window.batcavernaFriendPresence?.(friend)||{online:false,text:'Sincronizando presença…'};return `<button data-dock-friend="${esc(friend.id)}"><span class="friends-dock-avatar ${presence.online?'online':''}"><img src="brand.jpg" data-private-src="${esc(friend.avatar_url||'')}" alt=""><i></i></span><span><b>${esc(friend.nome||friend.slug||'Amigo')}</b><small>${esc(presence.text)}</small></span><em>Conversar</em></button>`}).join('')||`<p class="muted">${query?'Nenhum amigo encontrado.':'Sua lista de amigos está vazia.'}</p>`;hydrateMedia(list);list.querySelectorAll('[data-dock-friend]').forEach(button=>button.onclick=()=>{const friend=rows.find(item=>String(item.id)===button.dataset.dockFriend);if(!friend)return;panel.hidden=true;toggle.setAttribute('aria-expanded','false');if(window.batcavernaChooseChat)window.batcavernaChooseChat(friend);else{state.chatFriend=friend;navigate('chat')}});};
 const load=async()=>{list.innerHTML='<div class="loading">Carregando amigos…</div>';try{const live=window.batcavernaFriends?.();rows=Array.isArray(live)&&live.length?live:await api.friends();$('#friendsDockCount').textContent=`${rows.length} ${rows.length===1?'amigo':'amigos'}`;$('#friendsDockBadge').textContent=rows.length||'';render()}catch(error){list.innerHTML=`<p class="form-error">${esc(failure(error))}</p>`}};
 toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){paintStatuses();load();setTimeout(()=>search.focus(),0)}};
 $('#friendsDockClose').onclick=()=>{panel.hidden=true;toggle.setAttribute('aria-expanded','false')};
 $('#friendsDockAdd').onclick=()=>{panel.hidden=true;toggle.setAttribute('aria-expanded','false');openFriendSearch()};
 search.oninput=render;
 document.addEventListener('click',event=>{if(!event.target.closest('#friendsDock')){panel.hidden=true;toggle.setAttribute('aria-expanded','false')}});
 const shell=$('#appShell'),sync=()=>{dock.hidden=!shell||shell.hidden;if(dock.hidden)panel.hidden=true};if(shell){new MutationObserver(sync).observe(shell,{attributes:true,attributeFilter:['hidden']});sync()}
}
installFriendsDock();

const baseSettings=renderSettings;
renderSettings=async function(){
 await baseSettings();if(state.current!=='settings')return;
 if(state.settingsTab==='notifications'){
  const panel=$('#settingsPanel');panel?.insertAdjacentHTML('beforeend','<div class="settings-row"><div><strong>Preferências por categoria</strong><small>Escolha alertas de mensagens, comunidade, amizades, indicações e progresso.</small></div><button class="secondary" id="openNotificationPreferences">Configurar</button></div>');
  $('#openNotificationPreferences')?.addEventListener('click',()=>navigate('preferences'));
 }
 const admins=$$('.launcher-admin');admins.forEach((section,index)=>{if(state.settingsTab!=='appearance'||index>0)section.remove()});
 $$('[data-theme-range]').forEach(input=>input.addEventListener('input',()=>{
  const value=Number(input.value),key=input.dataset.themeRange;
  if(key==='cardWidth'){document.documentElement.style.setProperty('--reference-card-width',`${value}px`);document.documentElement.style.setProperty('--card-width',`${value}px`);}
  if(key==='width')document.documentElement.style.setProperty('--workspace-width',`${value}px`);
  if(key==='scale')document.documentElement.style.setProperty('--ui-scale',String(value/100));
  input.style.setProperty('--range-fill',`${(value-Number(input.min))/(Number(input.max)-Number(input.min))*100}%`);
 }));
};
})();

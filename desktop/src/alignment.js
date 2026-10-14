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
if(chatNav)chatNav.querySelector('span').textContent='Amigos e chat';

function installStatusPicker(){
 const account=$('#sidebarAccount');if(!account)return;
 account.onclick=event=>{
  event.stopPropagation();const current=$('#sidebarStatusMenu');if(current){current.remove();return;}
  const menu=document.createElement('section');menu.id='sidebarStatusMenu';menu.className='sidebar-status-menu';
  const active=state.profile?.status_personalizado||'online';
  menu.innerHTML=`<header><b>Seu status</b><button data-open-own-profile>Ver perfil</button></header>${Object.entries(statusOptions).map(([key,label])=>`<button data-account-status="${key}" class="${key===active?'active':''}"><i class="status-dot status-${key}"></i><span>${label}</span>${key===active?'<b>✓</b>':''}</button>`).join('')}`;
  account.before(menu);
  menu.querySelector('[data-open-own-profile]').onclick=()=>{menu.remove();state.profileUser=null;navigate('profile')};
  menu.querySelectorAll('[data-account-status]').forEach(button=>button.onclick=async()=>{
   const p=state.profile||{},status=button.dataset.accountStatus;button.disabled=true;
   try{
    await api.updateProfile({name:p.nome||p.slug||'CLT',bio:p.bio||'',banner:p.banner_url||p.banner||'',status,steamId:p.steam_id||'',avatar:p.avatar_url||'',games:p.jogos_destaque||[],titleLevel:Number(p.titulo_destaque_nivel)||0,achievements:p.conquistas_destaque||[]});
    p.status_personalizado=status;$('#accountStatus').textContent=statusOptions[status];account.querySelector('small').textContent=statusOptions[status];
    await call('realtime_presence',{input:{nome:p.nome||'CLT',slug:p.slug||'',avatar:p.avatar_url||'',status,jogo:'',jogo_fonte:''}}).catch(()=>{});
    menu.remove();toast(`Status alterado para ${statusOptions[status]}.`);
   }catch(error){toast(failure(error));button.disabled=false;}
  });
 };
 document.addEventListener('click',event=>{if(!event.target.closest('#sidebarStatusMenu,#sidebarAccount'))$('#sidebarStatusMenu')?.remove()});
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
 shell.innerHTML='<header><h2>Amigos e chat</h2><button id="unifiedAddFriend" class="secondary">＋ Adicionar amigo</button></header><nav class="tabs compact-friends-tabs"><button id="chatFriendsTab" class="active">Amigos</button><button id="chatConversationsTab">Chat</button></nav><label class="compact-friends-search"><span>⌕</span><input id="compactFriendsSearch" type="search" placeholder="Buscar amigos…" aria-label="Buscar amigos"></label><div class="compact-friends-list"></div><p id="compactFriendsEmpty" class="muted" hidden>Nenhum amigo encontrado.</p>';
 content.replaceChildren(shell);content.classList.add('friends-chat-reference');shell.querySelector('.compact-friends-list').append(rows);
 rows.querySelectorAll('.friend-card').forEach(card=>{const info=card.querySelector('.friend-profile span'),status=card.querySelector('.friend-status');info?.querySelector('small')?.remove();if(info&&status)info.append(status);const chat=card.querySelector('[data-choose-chat]');if(chat){chat.textContent='›';chat.setAttribute('aria-label','Conversar com '+(card.querySelector('strong')?.textContent||'amigo'));}});
 $('#unifiedAddFriend').onclick=openFriendSearch;
 $('#chatFriendsTab').onclick=()=>{};
 $('#chatConversationsTab').onclick=()=>{const first=rows.querySelector('[data-choose-chat]');if(first)first.click();else toast('Adicione um amigo para iniciar uma conversa.');};
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
renderChat=async function(){await baseChat();if(state.current!=='chat')return;$('#content').classList.add('friends-chat-reference','chat-reference-active');const tabs=$('.community-tabs');if(tabs&&!tabs.querySelector('#unifiedAddFriend')){tabs.insertAdjacentHTML('beforeend','<button id="unifiedAddFriend" class="primary">＋ Adicionar amigo</button>');$('#unifiedAddFriend').onclick=openFriendSearch;}};

const baseSettings=renderSettings;
renderSettings=async function(){
 await baseSettings();if(state.current!=='settings')return;
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

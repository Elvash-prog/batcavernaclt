'use strict';

const $ = selector => document.querySelector(selector);
const invoke = window.__TAURI__?.core?.invoke;
const call = (command, payload = {}) => invoke ? invoke(command, payload) : Promise.reject('Abra pelo programa BatCaverna.');
const api = Object.freeze({
  state: () => call('app_state'), login: credentials => call('login', { credentials }), logout: () => call('logout'),
  dashboard: () => call('dashboard'), stats: () => call('journey_stats'),
  library: category => call('library', { category }), saveItem: item => call('save_item', { item }), deleteItem: id => call('delete_item', { id: String(id) }),
  feed: () => call('feed'), socialMeta: () => call('social_meta'), publish: text => call('publish', { text }),
  toggleLike: input => call('toggle_like', { input }), addComment: input => call('add_comment', { input }),
  friends: () => call('friends'), searchPeople: query => call('search_people', { query }), invite: userId => call('send_friend_invite', { input: { userId } }),
  messages: friendId => call('chat_messages', { friendId }), sendMessage: input => call('send_message', { input }),
  notifications: () => call('notifications'), markNotificationsRead: () => call('mark_notifications_read'),
  respondInvite: input => call('respond_friend_invite', { input })
});
const state = { current: 'home', profile: null, userId: '', version: '', libraryCategory: 'jogos', libraryRows: [], chatFriend: null };
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));
const image = url => /^https:\/\//i.test(String(url || '')) ? escapeHtml(url) : 'icon.png';
const date = value => { try { return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)); } catch { return ''; } };
const failureMessage = failure => typeof failure === 'string' && failure.trim() ? failure : failure?.message || 'Não foi possível concluir. Tente novamente.';
function toast(message){const node=$('#toast');node.textContent=message;node.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.hidden=true,3500)}
function loading(){ $('#content').innerHTML='<div class="loading"><span class="spinner"></span>Carregando...</div>'; }
function errorCard(error){ $('#content').innerHTML=`<div class="error-card">${escapeHtml(failureMessage(error))}</div>`; }
function setPage(title,eyebrow){$('#pageTitle').textContent=title;$('#pageEyebrow').textContent=eyebrow}
function setLoginPending(pending){const button=$('#loginForm button[type="submit"]');button.disabled=pending;button.textContent=pending?'Entrando…':button.dataset.idleLabel;$('#loginForm').setAttribute('aria-busy',String(pending))}
function showLogin(){ $('#appShell').hidden=true;$('#loginScreen').hidden=false;$('#loginForm').reset(); }
function showApp(){ $('#loginScreen').hidden=true;$('#appShell').hidden=false;$('#appVersion').textContent=`v${state.version}`;navigate('home'); }

async function navigate(view){
  state.current=view;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));loading();
  try{
    if(view==='home')await renderHome();
    if(view==='library')await renderLibrary();
    if(view==='social')await renderSocial();
    if(view==='chat')await renderChat();
    if(view==='friends')await renderFriends();
    if(view==='notifications')await renderNotifications();
    if(view==='settings')renderSettings();
  }catch(error){errorCard(error)}
}

async function renderHome(){
  setPage('Início','SUA BATCAVERNA');
  const [data,statsResult]=await Promise.all([api.dashboard(),api.stats().catch(()=>null)]);
  state.profile=data.profile;state.userId=data.profile.id||state.userId;
  $('#accountName').textContent=data.profile.nome||data.profile.slug||'Minha conta';$('#accountStatus').textContent=data.profile.status_personalizado||'Online';$('#accountAvatar').src=image(data.profile.avatar_url);$('#navUnread').hidden=!data.counts.unread;
  const stats=statsResult?.[0]||null,cards=data.recent.map(mediaCard).join('');
  const updates=data.updates.map(item=>`<div class="update"><div><strong>${escapeHtml(item.nome)}</strong><div class="muted">${escapeHtml(item.status||item.categoria)}</div></div><small>${date(item.updated_at)}</small></div>`).join('');
  $('#content').innerHTML=`<section class="welcome"><div><span>OLÁ, ${escapeHtml((data.profile.nome||'CLT').split(' ')[0].toUpperCase())}</span><h2>O que vamos acompanhar hoje?</h2><p>Seus títulos, amigos e conversas reunidos aqui.</p></div><img src="icon.png" alt=""></section>
  <section class="stats">${[['Jogos',data.counts.totalGames],['Jogando',data.counts.playing],['Concluídos',data.counts.finished],['Filmes e séries',data.counts.totalMedia],['Não lidas',data.counts.unread]].map(([l,v])=>`<article class="stat"><small>${l}</small><strong>${v}</strong></article>`).join('')}</section>
  ${stats?`<section class="insight"><div><small>VISÃO GERAL</small><strong>${stats.total||0} títulos</strong></div><div><small>CONCLUÍDOS</small><strong>${stats.concluidos||0}</strong></div><div><small>HORAS JOGADAS</small><strong>${stats.horas||0}h</strong></div></section>`:''}
  <div class="section-head"><div><h2>Biblioteca recente</h2><p>Continue de onde parou.</p></div><button class="secondary" data-go="library">Ver biblioteca</button></div><section class="grid">${cards||'<div class="empty">Nenhum título cadastrado.</div>'}</section><div class="section-head"><div><h2>Últimas atualizações</h2></div></div><section class="updates">${updates||'<div class="empty">Ainda não há atualizações.</div>'}</section>`;
  $('[data-go="library"]')?.addEventListener('click',()=>navigate('library'));
}

function mediaCard(item){return `<article class="media-card" data-item-id="${escapeHtml(item.id)}"><div class="cover-wrap"><img src="${image(item.capa)}" alt=""><span>${escapeHtml(item.status||'Na biblioteca')}</span></div><div class="body"><h3>${escapeHtml(item.nome)}</h3><small>${escapeHtml(item.plataforma||item.onde||item.tipo||'BatCaverna')}</small></div></article>`}
function categoryInfo(key){return key==='jogos'?{category:'jogos',type:'',label:'Jogo'}:{category:'filmes',type:key==='filmes'?'filme':key==='series'?'serie':'anime',label:key==='filmes'?'Filme':key==='series'?'Série':'Anime'}}
async function renderLibrary(){
  setPage('Biblioteca','MINHA COLEÇÃO');const rows=await api.library(state.libraryCategory);state.libraryRows=rows;
  const categories=[['jogos','Jogos'],['filmes','Filmes'],['series','Séries'],['animes','Animes']];
  $('#content').innerHTML=`<div class="library-toolbar"><div class="tabs">${categories.map(([k,l])=>`<button data-category="${k}" class="${k===state.libraryCategory?'active':''}">${l}</button>`).join('')}</div><button id="addItem" class="primary">+ Adicionar</button></div><section class="grid">${rows.map(mediaCard).join('')||'<div class="empty">Nenhum título nesta categoria.</div>'}</section>`;
  document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{state.libraryCategory=b.dataset.category;renderLibrary().catch(errorCard)}));
  document.querySelectorAll('[data-item-id]').forEach(card=>card.addEventListener('click',()=>openItemEditor(rows.find(x=>String(x.id)===card.dataset.itemId))));$('#addItem').addEventListener('click',()=>openItemEditor(null));
}

function openItemEditor(item){
  const info=categoryInfo(state.libraryCategory),row=item||{},game=info.category==='jogos';
  const statuses=game?['📌 Backlog','🎮 Jogando','✅ Zerado','🏆 Platina']:['⏳ Para Assistir','▶️ Assistindo','✅ Concluído','⭐ Favorito'];
  const overlay=document.createElement('div');overlay.className='editor-overlay';overlay.innerHTML=`<form class="editor"><header><div><small>${item?'EDITAR':'NOVO'} ${info.label.toUpperCase()}</small><h2>${item?escapeHtml(item.nome):`Adicionar ${info.label.toLowerCase()}`}</h2></div><button type="button" class="icon-button" data-close>×</button></header><div class="editor-grid">
  <label class="wide">Nome<input name="nome" required maxlength="180" value="${escapeHtml(row.nome||'')}"></label><label>Status<select name="status">${statuses.map(v=>`<option ${v===row.status?'selected':''}>${v}</option>`).join('')}</select></label>
  ${game?`<label>Plataforma<select name="plataforma">${['💻 PC','🎮 PlayStation 5','🎮 Xbox Series','🎮 Nintendo Switch','📱 Mobile','Outro'].map(v=>`<option ${v===row.plataforma?'selected':''}>${v}</option>`).join('')}</select></label><label>Loja<select name="loja">${['Steam','Epic Games','GOG','Xbox Store','PlayStation Store','eShop','Outra'].map(v=>`<option ${v===row.loja?'selected':''}>${v}</option>`).join('')}</select></label><label>Horas<input name="horas" type="number" min="0" step="0.1" value="${escapeHtml(row.horas||'')}"></label>`:`<label>Onde assistir<input name="onde" value="${escapeHtml(row.onde||'')}"></label><input type="hidden" name="tipo" value="${info.type}">`}
  <label>Ano<input name="ano" type="number" min="1900" max="2200" value="${escapeHtml(row.ano||'')}"></label><label>Nota<input name="nota" type="number" min="0" max="10" step="0.5" value="${escapeHtml(row.nota||'')}"></label><label class="wide">URL da capa<input name="capa" type="url" value="${escapeHtml(row.capa||'')}"></label><label class="wide">Comentário<textarea name="review" maxlength="2000">${escapeHtml(row.review||'')}</textarea></label></div><footer>${item?'<button type="button" class="danger" data-delete>Excluir</button>':'<span></span>'}<div><button type="button" class="secondary" data-close>Cancelar</button><button class="primary" type="submit">Salvar</button></div></footer><p class="form-error"></p></form>`;
  document.body.appendChild(overlay);overlay.querySelector('input')?.focus();const close=()=>overlay.remove();overlay.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',close));overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
  overlay.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('[type="submit"]'),data=Object.fromEntries(new FormData(f));data.categoria=info.category;if(item)data.id=String(item.id);b.disabled=true;b.textContent='Salvando…';try{await api.saveItem(data);close();toast('Título salvo.');await renderLibrary()}catch(err){f.querySelector('.form-error').textContent=failureMessage(err);b.disabled=false;b.textContent='Salvar'}});
  overlay.querySelector('[data-delete]')?.addEventListener('click',async()=>{if(!confirm(`Excluir “${row.nome}”?`))return;try{await api.deleteItem(row.id);close();toast('Título excluído.');await renderLibrary()}catch(err){overlay.querySelector('.form-error').textContent=failureMessage(err)}});
}

async function renderSocial(){
  setPage('Social','COMUNIDADE');const [posts,meta]=await Promise.all([api.feed(),api.socialMeta()]);const likes={},mine={};(meta.likes||[]).forEach(x=>{likes[x.post_id]=(likes[x.post_id]||0)+1;if(String(x.user_id)===String(meta.userId))mine[x.post_id]=true});const comments={};(meta.comments||[]).forEach(x=>(comments[x.post_id]||(comments[x.post_id]=[])).push(x));
  $('#content').innerHTML=`<form id="composer" class="composer"><textarea name="text" maxlength="500" placeholder="Compartilhe algo com seus amigos"></textarea><footer><small class="muted">O rascunho fica salvo neste computador.</small><button class="primary" type="submit">Publicar</button></footer></form><section class="posts">${posts.map(post=>{const pid=String(post.id),cs=comments[pid]||[];return `<article class="post" data-post="${escapeHtml(pid)}"><header><img src="${image(post.author?.avatar_url)}" alt=""><div><strong>${escapeHtml(post.author?.nome||'BatCaverna')}</strong><br><time>${date(post.created_at)}</time></div></header><p>${escapeHtml(post.texto)}</p><div class="post-actions"><button data-like class="${mine[pid]?'liked':''}">♥ ${likes[pid]||0}</button><span>💬 ${cs.length}</span></div>${cs.slice(-3).map(c=>`<div class="comment"><strong>${String(c.user_id)===String(meta.userId)?'Você':'Amigo'}</strong> ${escapeHtml(c.texto)}</div>`).join('')}<form data-comment><input name="text" maxlength="500" placeholder="Escreva um comentário"><button>Enviar</button></form></article>`}).join('')||'<div class="empty">Ainda não há publicações.</div>'}</section>`;
  const key='batcaverna-desktop-draft',textarea=$('#composer textarea');textarea.value=localStorage.getItem(key)||'';textarea.addEventListener('input',()=>localStorage.setItem(key,textarea.value));$('#composer').addEventListener('submit',async e=>{e.preventDefault();const b=e.currentTarget.querySelector('button');b.disabled=true;try{await api.publish(textarea.value);localStorage.removeItem(key);toast('Publicação enviada.');await renderSocial()}catch(err){toast(failureMessage(err));b.disabled=false}});
  document.querySelectorAll('[data-post]').forEach(article=>{const postId=article.dataset.post;article.querySelector('[data-like]').addEventListener('click',async e=>{e.currentTarget.disabled=true;try{await api.toggleLike({postId,liked:e.currentTarget.classList.contains('liked')});await renderSocial()}catch(err){toast(failureMessage(err))}});article.querySelector('[data-comment]').addEventListener('submit',async e=>{e.preventDefault();const input=e.currentTarget.elements.text;try{await api.addComment({postId,text:input.value});await renderSocial()}catch(err){toast(failureMessage(err))}})});
}

async function renderChat(){
  setPage('Chat','CONVERSAS');const friends=await api.friends();if(!state.chatFriend&&friends.length)state.chatFriend=friends[0];const active=state.chatFriend,messages=active?await api.messages(String(active.id)):[];
  $('#content').innerHTML=`<section class="chat-layout"><aside class="chat-people"><h3>Conversas</h3>${friends.map(p=>`<button data-chat-user="${escapeHtml(p.id)}" class="${active&&String(active.id)===String(p.id)?'active':''}"><img src="${image(p.avatar_url)}" alt=""><span><strong>${escapeHtml(p.nome||p.slug||'Amigo')}</strong><small>@${escapeHtml(p.slug||'batcaverna')}</small></span></button>`).join('')||'<div class="empty">Adicione amigos para conversar.</div>'}</aside><div class="conversation">${active?`<header><img src="${image(active.avatar_url)}" alt=""><div><strong>${escapeHtml(active.nome||active.slug)}</strong><small>Conversa privada</small></div></header><div class="messages">${messages.map(m=>`<div class="message ${String(m.remetente_id)===String(state.userId)?'mine':''}"><p>${escapeHtml(m.texto||'Imagem')}</p><time>${date(m.created_at)}</time></div>`).join('')||'<div class="chat-empty">Comece a conversa.</div>'}</div><form id="messageForm"><textarea name="text" maxlength="2000" placeholder="Escreva uma mensagem"></textarea><button class="primary">Enviar</button></form>`:'<div class="chat-empty">Selecione uma conversa.</div>'}</div></section>`;
  document.querySelectorAll('[data-chat-user]').forEach(b=>b.addEventListener('click',()=>{state.chatFriend=friends.find(p=>String(p.id)===b.dataset.chatUser);renderChat().catch(errorCard)}));$('#messageForm')?.addEventListener('submit',async e=>{e.preventDefault();const text=e.currentTarget.elements.text.value,b=e.currentTarget.querySelector('button');b.disabled=true;try{await api.sendMessage({friendId:String(active.id),text});await renderChat()}catch(err){toast(failureMessage(err));b.disabled=false}});document.querySelector('.messages')?.scrollTo(0,999999);
}

async function renderFriends(){
  setPage('Amigos','COMUNIDADE');const rows=await api.friends();$('#content').innerHTML=`<form id="peopleSearch" class="search-people"><input name="query" minlength="2" placeholder="Buscar por usuário, nome ou código"><button class="primary">Buscar</button></form><div id="peopleResults"></div><div class="section-head"><div><h2>Seus amigos</h2><p>${rows.length} conexões</p></div></div><section class="people">${rows.map(p=>`<article class="person"><img src="${image(p.avatar_url)}" alt=""><div><strong>${escapeHtml(p.nome||'Perfil')}</strong><small>@${escapeHtml(p.slug||'batcaverna')}</small></div><button class="secondary" data-open-chat="${escapeHtml(p.id)}">Conversar</button></article>`).join('')||'<div class="empty">Sua lista de amigos está vazia.</div>'}</section>`;
  document.querySelectorAll('[data-open-chat]').forEach(b=>b.addEventListener('click',()=>{state.chatFriend=rows.find(p=>String(p.id)===b.dataset.openChat);navigate('chat')}));$('#peopleSearch').addEventListener('submit',async e=>{e.preventDefault();const out=$('#peopleResults');out.innerHTML='<div class="loading">Buscando...</div>';try{const found=await api.searchPeople(e.currentTarget.elements.query.value);out.innerHTML=`<section class="people search-results">${found.map(p=>`<article class="person"><img src="${image(p.avatar_url)}" alt=""><div><strong>${escapeHtml(p.nome||p.slug)}</strong><small>@${escapeHtml(p.slug||'usuário')}</small></div><button class="primary" data-invite="${escapeHtml(p.id)}">Convidar</button></article>`).join('')||'<div class="empty">Nenhuma pessoa encontrada.</div>'}</section>`;out.querySelectorAll('[data-invite]').forEach(b=>b.addEventListener('click',async()=>{b.disabled=true;try{await api.invite(b.dataset.invite);b.textContent='Enviado';toast('Convite enviado.')}catch(err){toast(failureMessage(err));b.disabled=false}}))}catch(err){out.innerHTML=`<div class="error-card">${escapeHtml(failureMessage(err))}</div>`}});
}

async function renderNotifications(){
  setPage('Notificações','ATIVIDADE');const rows=await api.notifications();$('#content').innerHTML=`<div class="section-head"><div><h2>Central de notificações</h2><p>${rows.filter(x=>!x.read).length} não lidas</p></div><button id="readAll" class="secondary">Marcar todas como lidas</button></div><section class="notifications">${rows.map(n=>`<article class="notification ${n.read?'':'unread'}"><span class="dot"></span><div><p>${escapeHtml(n.mensagem||n.tipo||'Nova atividade')}</p><time>${date(n.created_at)}</time>${n.tipo==='convite'?`<div class="notification-actions"><button class="primary" data-invite-answer="1" data-id="${escapeHtml(n.referencia_id)}">Aceitar</button><button class="secondary" data-invite-answer="0" data-id="${escapeHtml(n.referencia_id)}">Recusar</button></div>`:n.tipo?.startsWith('social_')?'<button class="secondary" data-go-social>Ver publicação</button>':''}</div></article>`).join('')||'<div class="empty">Nenhuma notificação.</div>'}</section>`;
  $('#readAll').addEventListener('click',async()=>{await api.markNotificationsRead();toast('Notificações atualizadas.');await renderNotifications()});document.querySelectorAll('[data-invite-answer]').forEach(b=>b.addEventListener('click',async()=>{b.disabled=true;try{await api.respondInvite({inviteId:b.dataset.id,accept:b.dataset.inviteAnswer==='1'});toast(b.dataset.inviteAnswer==='1'?'Amizade aceita.':'Convite recusado.');await renderNotifications()}catch(err){toast(failureMessage(err));b.disabled=false}}));document.querySelectorAll('[data-go-social]').forEach(b=>b.addEventListener('click',()=>navigate('social')));
}

function renderSettings(){setPage('Configurações','SUA CONTA');$('#content').innerHTML=`<section class="settings"><div class="settings-row"><div><strong>BatCaverna</strong><small>Versão instalada</small></div><span>v${escapeHtml(state.version)}</span></div><div class="settings-row"><div><strong>Sessão protegida</strong><small>Credenciais guardadas pelo Windows quando autorizado</small></div><span>Ativa</span></div><div class="settings-row"><div><strong>Sair da conta</strong><small>Remove a sessão deste computador</small></div><button id="logoutButton" class="danger">Sair</button></div></section>`;$('#logoutButton').addEventListener('click',async()=>{await api.logout();showLogin()})}

$('#mainNav').addEventListener('click',event=>{const button=event.target.closest('[data-view]');if(button)navigate(button.dataset.view)});
$('#loginForm').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget,error=$('#loginError'),fields=new FormData(form);error.textContent='';setLoginPending(true);try{await api.login({identifier:String(fields.get('identifier')||'').trim(),password:String(fields.get('password')||''),remember:fields.get('remember')==='on'});showApp()}catch(failure){error.textContent=failureMessage(failure)}finally{setLoginPending(false)}});
api.state().then(initial=>{state.version=initial.version;state.userId=initial.user?.id||'';if(initial.authenticated)showApp();else showLogin()}).catch(()=>showLogin());

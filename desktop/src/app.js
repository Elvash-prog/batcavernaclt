'use strict';

const $ = selector => document.querySelector(selector);
const invoke = window.__TAURI__?.core?.invoke;
const call = (command, payload) => {
  if (!invoke) return Promise.reject(new Error('Abra esta interface pelo programa BatCaverna.'));
  return invoke(command, payload || {});
};
const api = Object.freeze({
  state: () => call('app_state'),
  login: credentials => call('login', { credentials }),
  logout: () => call('logout'),
  dashboard: () => call('dashboard'),
  library: category => call('library', { category }),
  feed: () => call('feed'),
  publish: text => call('publish', { text }),
  friends: () => call('friends'),
  notifications: () => call('notifications'),
  markNotificationsRead: () => call('mark_notifications_read')
});
const state = { current: 'home', profile: null, version: '', libraryCategory: 'jogos' };

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function image(url) {
  const value = String(url || '');
  return /^https:\/\//i.test(value) ? escapeHtml(value) : 'icon.png';
}

function date(value) {
  try { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
  catch { return ''; }
}

function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { node.hidden = true; }, 3500);
}

function loading() { $('#content').innerHTML = '<div class="loading">Carregando sua BatCaverna...</div>'; }
function errorCard(error) { $('#content').innerHTML = `<div class="error-card">${escapeHtml(error.message)}</div>`; }

function setPage(title, eyebrow) {
  $('#pageTitle').textContent = title;
  $('#pageEyebrow').textContent = eyebrow;
}

function showLogin() {
  $('#appShell').hidden = true;
  $('#loginScreen').hidden = false;
  $('#loginForm').reset();
}

function showApp() {
  $('#loginScreen').hidden = true;
  $('#appShell').hidden = false;
  $('#appVersion').textContent = `v${state.version}`;
  navigate('home');
}

async function navigate(view) {
  state.current = view;
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  loading();
  try {
    if (view === 'home') await renderHome();
    if (view === 'library') await renderLibrary();
    if (view === 'social') await renderSocial();
    if (view === 'friends') await renderFriends();
    if (view === 'notifications') await renderNotifications();
    if (view === 'settings') renderSettings();
  } catch (error) { errorCard(error); }
}

async function renderHome() {
  setPage('Início', 'VISÃO GERAL');
  const data = await api.dashboard();
  state.profile = data.profile;
  $('#accountName').textContent = data.profile.nome || data.profile.slug || 'Minha conta';
  $('#accountStatus').textContent = data.profile.status_personalizado || 'Online';
  $('#accountAvatar').src = image(data.profile.avatar_url);
  $('#navUnread').hidden = !data.counts.unread;
  const stats = [
    ['Jogos', data.counts.totalGames], ['Jogando', data.counts.playing], ['Concluídos', data.counts.finished],
    ['Filmes e séries', data.counts.totalMedia], ['Não lidas', data.counts.unread]
  ];
  const cards = data.recent.map(item => `<article class="media-card"><img src="${image(item.capa)}" alt=""><div class="body"><h3>${escapeHtml(item.nome)}</h3><small>${escapeHtml(item.status || item.plataforma || 'Na biblioteca')}</small></div></article>`).join('');
  const updates = data.updates.map(item => `<div class="update"><div><strong>${escapeHtml(item.nome)}</strong><div class="muted">${escapeHtml(item.status || item.categoria)}</div></div><small>${date(item.updated_at)}</small></div>`).join('');
  $('#content').innerHTML = `<section class="stats">${stats.map(([label,value]) => `<article class="stat"><small>${label}</small><strong>${value}</strong></article>`).join('')}</section><div class="section-head"><div><h2>Biblioteca recente</h2><p>Os títulos atualizados por último.</p></div></div><section class="grid">${cards || '<div class="empty">Nenhum jogo cadastrado.</div>'}</section><div class="section-head"><div><h2>Últimas atualizações</h2></div></div><section class="updates">${updates || '<div class="empty">Ainda não há atualizações.</div>'}</section>`;
}

async function renderLibrary() {
  setPage('Biblioteca', 'MINHA COLEÇÃO');
  const rows = await api.library(state.libraryCategory);
  const categories = [['jogos','Jogos'],['filmes','Filmes'],['series','Séries'],['animes','Animes']];
  const cards = rows.map(item => `<article class="media-card"><img src="${image(item.capa)}" alt=""><div class="body"><h3>${escapeHtml(item.nome)}</h3><small>${escapeHtml(item.status || item.plataforma || item.onde || 'Na biblioteca')}</small></div></article>`).join('');
  $('#content').innerHTML = `<div class="tabs">${categories.map(([key,label]) => `<button data-category="${key}" class="${key === state.libraryCategory ? 'active' : ''}">${label}</button>`).join('')}</div><section class="grid">${cards || '<div class="empty">Nenhum título nesta categoria.</div>'}</section>`;
  document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => { state.libraryCategory = button.dataset.category; renderLibrary().catch(errorCard); }));
}

async function renderSocial() {
  setPage('Social', 'COMUNIDADE');
  const posts = await api.feed();
  $('#content').innerHTML = `<form id="composer" class="composer"><textarea name="text" maxlength="500" placeholder="Compartilhe algo com seus amigos"></textarea><footer><small class="muted">O rascunho fica neste computador.</small><button class="primary" type="submit">Publicar</button></footer></form><section class="posts">${posts.map(post => `<article class="post"><header><img src="${image(post.author?.avatar_url)}" alt=""><div><strong>${escapeHtml(post.author?.nome || 'BatCaverna')}</strong><br><time>${date(post.created_at)}</time></div></header><p>${escapeHtml(post.texto)}</p></article>`).join('') || '<div class="empty">Ainda não há publicações.</div>'}</section>`;
  const draftKey = 'batcaverna-desktop-draft';
  const textarea = $('#composer textarea');
  textarea.value = localStorage.getItem(draftKey) || '';
  textarea.addEventListener('input', () => localStorage.setItem(draftKey, textarea.value));
  $('#composer').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    try { await api.publish(textarea.value); localStorage.removeItem(draftKey); toast('Publicação enviada.'); await renderSocial(); }
    catch (error) { toast(error.message); button.disabled = false; }
  });
}

async function renderFriends() {
  setPage('Amigos', 'COMUNIDADE');
  const rows = await api.friends();
  $('#content').innerHTML = `<section class="people">${rows.map(person => `<article class="person"><img src="${image(person.avatar_url)}" alt=""><div><strong>${escapeHtml(person.nome || 'Perfil')}</strong><small>@${escapeHtml(person.slug || 'batcaverna')}</small></div></article>`).join('') || '<div class="empty">Sua lista de amigos está vazia.</div>'}</section>`;
}

async function renderNotifications() {
  setPage('Notificações', 'ATIVIDADE');
  const rows = await api.notifications();
  $('#content').innerHTML = `<div class="section-head"><div><h2>Central de notificações</h2><p>${rows.filter(row => !row.read).length} não lidas</p></div><button id="readAll" class="secondary">Marcar todas como lidas</button></div><section class="notifications">${rows.map(item => `<article class="notification ${item.read ? '' : 'unread'}"><span class="dot"></span><div><p>${escapeHtml(item.mensagem || item.tipo || 'Nova atividade')}</p><time>${date(item.created_at)}</time></div></article>`).join('') || '<div class="empty">Nenhuma notificação.</div>'}</section>`;
  $('#readAll').addEventListener('click', async () => { await api.markNotificationsRead(); toast('Notificações atualizadas.'); await renderNotifications(); });
}

function renderSettings() {
  setPage('Configurações', 'APLICATIVO');
  $('#content').innerHTML = `<section class="settings"><div class="settings-row"><div><strong>Aplicativo Windows</strong><small>Interface local conectada diretamente ao Supabase</small></div><span>v${escapeHtml(state.version)}</span></div><div class="settings-row"><div><strong>Site externo</strong><small>Não é usado para carregar esta interface</small></div><span>Desativado</span></div><div class="settings-row"><div><strong>Sair da conta</strong><small>Remove a sessão protegida deste computador</small></div><button id="logoutButton" class="danger">Sair</button></div></section>`;
  $('#logoutButton').addEventListener('click', async () => { await api.logout(); showLogin(); });
}

$('#mainNav').addEventListener('click', event => {
  const button = event.target.closest('[data-view]');
  if (button) navigate(button.dataset.view);
});

$('#loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button');
  const error = $('#loginError');
  error.textContent = '';
  button.disabled = true;
  try {
    await api.login({ identifier: form.identifier.value, password: form.password.value, remember: form.remember.checked });
    showApp();
  } catch (failure) { error.textContent = failure.message; }
  finally { button.disabled = false; }
});

api.state().then(initial => {
  state.version = initial.version;
  if (initial.authenticated) showApp(); else showLogin();
}).catch(() => showLogin());

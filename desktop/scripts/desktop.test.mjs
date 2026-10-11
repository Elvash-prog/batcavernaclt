import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = path => fs.readFileSync(new URL('../'+path, import.meta.url), 'utf8');

test('interface desktop é própria e não carrega o site', () => {
  const html = read('src/index.html');
  assert.match(html, /BATCAVERNA DOS CLTs/);
  assert.match(html, /data-view="library"/);
  assert.doesNotMatch(html, /iframe|workers\.dev|config\.js/i);
});

test('login e aplicativo respeitam o estado oculto', () => {
  const html = read('src/index.html');
  const css = read('src/visibility.css');
  assert.match(html, /href="visibility\.css"/);
  assert.match(html, /href="phase03\.css"/);
  assert.match(css, /\[hidden\]\s*\{\s*display\s*:\s*none\s*!important\s*;?\s*\}/i);
});

test('login informa andamento e nunca falha silenciosamente', () => {
  const html = read('src/index.html');
  const script = read('src/app.js');
  assert.match(html, /data-idle-label="Entrar na BatCaverna"/);
  assert.match(script, /Entrando…/);
  assert.match(script, /failureMessage\(failure\)/);
  assert.match(script, /new FormData\(form\)/);
});

test('tela de login não apresenta referência à versão desktop', () => {
  const html = read('src/index.html');
  const login = html.match(/<section id="loginScreen"[\s\S]*?<\/section>/)?.[0] || '';
  assert.doesNotMatch(login, /Windows|desktop|aplicativo instalado/i);
});

test('renderer usa somente comandos Tauri', () => {
  const script = read('src/app.js');
  new vm.Script(script);
  assert.match(script, /call\('dashboard'\)/);
  assert.match(script, /call\('library'/);
  assert.match(script, /call\('chat_messages'/);
  assert.match(script, /call\('save_item'/);
  assert.match(script, /call\('toggle_like'/);
  assert.doesNotMatch(script, /fetch\(|workers\.dev|supabase\.co/);
});

test('Rust usa Supabase e limita o Worker ao proxy do catálogo', () => {
  const rust = read('src-tauri/src/main.rs');
  assert.match(rust, /\.supabase\.co/);
  assert.match(rust, /email_login_por_usuario/);
  assert.doesNotMatch(rust, /WebviewUrl::External/);
  assert.match(rust, /CATALOG_ORIGIN}\/api\/catalog/);
  assert.match(rust, /WebviewUrl::App/);
  assert.match(rust, /timeout\(Duration::from_secs\(25\)\)/);
  assert.match(rust, /send_message/);
  assert.match(rust, /respond_friend_invite/);
});

test('login por usuário usa função segura do Supabase', () => {
  const edge = fs.readFileSync(new URL('../../supabase/functions/login-username/index.ts', import.meta.url), 'utf8');
  const rust = read('src-tauri/src/main.rs');
  assert.match(edge, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(edge, /email_login_por_usuario/);
  assert.match(rust, /\/functions\/v1\/login-username/);
  assert.doesNotMatch(rust, /service_role/);
});

test('versão 0.4 inclui autenticação completa e perfil', () => {
  const html=read('src/index.html'),script=read('src/app.js'),rust=read('src-tauri/src/main.rs');
  assert.match(html,/id="registerForm"/);
  assert.match(html,/id="recoverForm"/);
  assert.match(html,/data-view="profile"/);
  assert.match(script,/call\('register'/);
  assert.match(script,/call\('recover_password'/);
  assert.match(rust,/async fn update_profile/);
});

test('chat é limitado à área útil e mantém o compositor na grade', () => {
  const css=read('src/styles.css');
  assert.match(css,/\.content\{[^}]*min-height:0[^}]*overflow:auto/);
  assert.match(css,/\.chat-layout\{[^}]*height:100%[^}]*min-height:0/);
  assert.match(css,/\.conversation\{[^}]*grid-template-rows:auto minmax\(0,1fr\) auto/);
});

test('feed renderiza mídia e catálogo usa Supabase', () => {
  const script=read('src/app.js'),rust=read('src-tauri/src/main.rs');
  assert.match(script,/Foto ou vídeo/);
  assert.match(script,/data-private-src/);
  assert.match(script,/op:'gratis'/);
  assert.match(rust,/functions\/v1\/media-upload/);
  assert.match(rust,/functions\/v1\/bright-api/);
});

function rendererHelpers(){const source=read('src/app.js').split("$('#mainNav').onclick")[0];const ctx={window:{},document:{},URL,URLSearchParams,Date,Intl,Map,console};vm.createContext(ctx);vm.runInContext(source,ctx);return ctx}
test('categoriza os status existentes sem misturar platinas e zerados',()=>{const c=rendererHelpers();for(const [input,expected] of [['🏆 100% (Platina)','platinum'],['🎮 Em Progresso','progress'],['✅ Zerado','finished'],['✅ Assistido','finished'],['🟦 Biblioteca Steam','steam'],['⏸️ Pausado','paused'],['⭐ Favorito','favorite']])assert.equal(c.normalizedStatus(input),expected)});
test('estatísticas usam data de conclusão e horas reais sem inventar meses',()=>{const c=rendererHelpers(),today=new Date().toISOString().slice(0,10),rows=[{categoria:'jogos',status:'🏆 Platina',horas:12,data:today},{categoria:'filmes',tipo:'anime',status:'✅ Concluído'},{categoria:'jogos',status:'Backlog',horas:3}];const s=c.statsFromRows(rows);assert.equal(s.total,3);assert.equal(s.concluidos,2);assert.equal(s.horas,15);assert.equal(s.animes,1);assert.equal(s.sem_data,1);assert.equal(s.months.reduce((a,m)=>a+m.jogos+m.midias,0),1)});
test('banner preserva posição e zoom no formato usado pelo site',()=>{const c=rendererHelpers();const url=c.bannerSave('https://example.com/banner.jpg',20,80,150),data=c.bannerData(url);assert.equal(data.url,'https://example.com/banner.jpg');assert.equal(data.x,20);assert.equal(data.y,80);assert.equal(data.z,150);assert.equal(c.coverUrl('/poster.jpg'),'https://image.tmdb.org/t/p/w500/poster.jpg')});

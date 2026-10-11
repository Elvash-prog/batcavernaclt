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

test('Rust acessa Supabase diretamente e não referencia o Worker', () => {
  const rust = read('src-tauri/src/main.rs');
  assert.match(rust, /\.supabase\.co/);
  assert.match(rust, /email_login_por_usuario/);
  assert.doesNotMatch(rust, /workers\.dev|\/api\//);
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

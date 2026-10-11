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
  assert.doesNotMatch(script, /fetch\(|workers\.dev|supabase\.co/);
});

test('Rust acessa Supabase diretamente e não referencia o Worker', () => {
  const rust = read('src-tauri/src/main.rs');
  assert.match(rust, /\.supabase\.co/);
  assert.match(rust, /email_login_por_usuario/);
  assert.doesNotMatch(rust, /workers\.dev|\/api\//);
  assert.match(rust, /timeout\(Duration::from_secs\(25\)\)/);
});

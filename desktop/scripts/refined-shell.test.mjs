import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../src/'+file,import.meta.url),'utf8');

test('visual refinado carrega por último e sobrepõe as camadas anteriores',()=>{
 const main=read('main.tsx');
 assert.ok(main.indexOf("import './refined-shell.css'")>main.indexOf("import './card-layout.css'"));
 assert.match(main,/\{name:'Visual refinado',src:refinedShell\}\n?\];/);
});
test('painel de amigos vira gaveta acessível, com botão fora do rodapé redesenhado',()=>{
 const js=read('refined-shell.js'),css=read('refined-shell.css');
 for(const marker of ["aria-controls","aria-expanded","toggleAttribute('inert'","event.key==='Escape'","foot.before(button)"])assert.ok(js.includes(marker),marker);
 assert.match(css,/friends-open \.app-shell > \.cavern-rail \{ transform: none/);
 assert.match(css,/prefers-reduced-motion/);
 assert.deepEqual([...new Set(css.match(/#[0-9a-f]{3,8}\b/gi))],['#4ade80'],'só o verde de online é fixo; o resto vem do tema');
});
test('versão aparece com um único v',()=>{
 assert.doesNotMatch(read('journey.js'),/<small>v<span id="appVersion">/);
});

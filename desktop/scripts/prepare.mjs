import {readFile, writeFile, mkdir, cp, rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import images from '../../image-assets.js';
const desktop = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(desktop, 'dist');
await rm(dist, {recursive:true, force:true});
await mkdir(dist, {recursive:true});
await cp(path.join(desktop, '../public'), dist, {recursive:true});
let html = await readFile(path.join(dist, 'index.html'), 'utf8');
function replaceOne(from, to) {
  if (!html.includes(from)) throw new Error('A base web mudou; revise a adaptação desktop: '+from.slice(0,90));
  html = html.replace(from,to);
}
replaceOne('<script src="/config.js"></script>', '<script src="/desktop-bridge.js"></script>');
replaceOne("function standalone(){return ", "function standalone(){return window.BC_DESKTOP||");
replaceOne("if('serviceWorker' in navigator){window.addEventListener('load'", "if(!window.BC_DESKTOP&&'serviceWorker' in navigator){window.addEventListener('load'");
replaceOne("function pushDisponivel(){return ", "function pushDisponivel(){return !window.BC_DESKTOP&&");
html = html.replaceAll("redirectTo:location.origin+'/'", "redirectTo:window.BC_WEB_ORIGIN+'/'")
  .replaceAll("emailRedirectTo:location.origin+'/'", "emailRedirectTo:window.BC_WEB_ORIGIN+'/'");
html = html.replace(/<button type="button" class="btn primary" data-settings-action="push">[^<]*<\/button>/g, '')
  .replace(/<h3>📱 Instalar BatCaverna<\/h3><p>[^<]*<\/p><div class="settings-actions">[\s\S]*?data-settings-action="pwa">[^<]*<\/button><\/div>/g,
    '<h3>BatCaverna para Windows</h3><p>Versão desktop 0.1.0. Use o ícone na bandeja para ocultar ou abrir a janela.</p>')
  .replace('O aplicativo usa Service Worker para manter o PWA e notificações funcionando.', 'Nesta versão, instale uma nova versão do programa para atualizar. As notificações ficam na central interna.')
  .replace('✓ PWA ativo', 'Windows · versão inicial')
  .replace("'+esc(pushText)+'", 'As notificações desta versão ficam na central interna do programa.');
replaceOne('</head>', '<style>#pwaInstallBtn,#pwaInstallModal,[data-settings-action="pwa"],[data-settings-action="push"]{display:none!important}</style></head>');
await writeFile(path.join(dist,'app.html'),html);
await cp(path.join(desktop,'src'),dist,{recursive:true});
for (const [name, base64] of Object.entries(images)) {
  if (!/^\/[\w.-]+\.png$/.test(name)) throw new Error('Nome de imagem inválido');
  await writeFile(path.join(dist,name.slice(1)),Buffer.from(base64,'base64'));
}
await rm(path.join(dist,'sw.js'),{force:true});
console.log('Interface desktop preparada; os arquivos web originais foram preservados.');

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?files(path.join(dir,x.name)):[path.join(dir,x.name)]);}
for(const root of ['desktop/src','desktop/src-tauri/src','android-native/app/src/main/java']){
 for(const file of files(root).filter(x=>/\.(js|ts|tsx|rs|java)$/.test(x))){
  const source=fs.readFileSync(file,'utf8').replaceAll('https://batcavernaclt.gamersclt.workers.dev/privacidade','PUBLIC_PRIVACY_NOTICE');
  assert.doesNotMatch(source,/https?:[^\s"']*\.(?:workers|pages)\.dev/i,file+' still depends on a retired app host');
 }
}
assert.match(fs.readFileSync('desktop/src-tauri/src/main.rs','utf8'),/supabase\.co\/functions\/v1\/native-api/);
assert.match(fs.readFileSync('android-native/app/src/main/java/dev/gamersclt/batcaverna/nativeapp/NativeBackend.java','utf8'),/BuildConfig.SUPABASE_URL\+"\/functions\/v1\/native-api"/);
console.log('Native source dependency check: no application Workers/Pages endpoints remain in Windows or Android');

const site = (await import('../worker.js')).default;
for (const route of ['/config.js', '/app.js', '/api/account/login', '/sw.js', '/journey.js', '/manifest.webmanifest']) {
 const response = await site.fetch(new Request('https://presentation.test' + route));
 assert.equal(response.status, 410);
 assert.equal(response.headers.get('Cache-Control'), 'no-store');
}
let served;
const assets = {ASSETS: {async fetch(request) {served = new URL(request.url).pathname; return new Response('presentation');}}};
const landing = await site.fetch(new Request('https://presentation.test/'), assets);
assert.equal(landing.status, 200);
assert.equal(served, '/index.html');
assert.match(landing.headers.get('Content-Security-Policy'), /connect-src 'none'/);
assert.equal((await site.fetch(new Request('https://presentation.test/', {method:'POST'}), assets)).status, 410);
const html = fs.readFileSync('public/index.html', 'utf8');
assert.doesNotMatch(html, /supabase|config\.js|app\.js|manifest\.webmanifest/i);
for (const match of html.matchAll(/(?:src|href)="(\/marketing\/[^"#]+)"/g)) assert.ok(fs.existsSync('public' + match[1]), match[1]);
const downloads=[...html.matchAll(/<a class="download-option(?: android)?" href="([^"]+)"/g)].map(match=>new URL(match[1].replaceAll('&amp;','&')));
assert.equal(downloads.length,2,'Windows and Android downloads must remain available');
const officialFiles=['1tWVxsv3OJj_6HYZNcPPjcKT0MjEb_uT-','1_8zuBmrjxylWpMGSFDpDriu5axgvLvAe'];
for(const [index,url] of downloads.entries()){
 assert.equal(url.protocol,'https:');
 assert.equal(url.hostname,'drive.usercontent.google.com');
 assert.equal(url.pathname,'/download');
 assert.equal(url.searchParams.get('id'),officialFiles[index],'download must use the configured official Drive file');
 assert.equal(url.searchParams.get('export'),'download');
 assert.equal(url.username,'');assert.equal(url.password,'');assert.equal(url.port,'');
}
console.log('Public presentation serves approved assets; legacy web application and APIs remain unavailable');

const privacy=await site.fetch(new Request('https://presentation.test/privacidade'),assets);assert.equal(privacy.status,200);assert.equal(served,'/privacidade.html');assert.match(html,/href="\/privacidade"/);

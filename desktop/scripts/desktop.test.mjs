import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const read = name => fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
function bridge() {
  const calls=[],network=[];
  const context={URL,Request,Response,Headers,Uint8Array,DOMException,btoa,location:{href:'http://tauri.localhost/app.html',origin:'http://tauri.localhost'},sessionStorage:{getItem:()=>'{"SUPABASE_URL":"https://example.supabase.co"}'},document:{addEventListener:()=>{}}};
  context.window={fetch:async(...args)=>{network.push(args);return new Response('network')},__TAURI__:{core:{invoke:async(command,args)=>{calls.push({command,args});return {status:200,headers:{'content-type':'application/json'},body:'{"ok":true}'}}}}};
  vm.runInNewContext(read('src/desktop-bridge.js'),context);
  return {window:context.window,calls,network};
}
test('login e uploads preservam corpo, cabeçalhos e rota',async()=>{
  const {window,calls}=bridge();
  const response=await window.fetch('/api/account/login',{method:'POST',headers:{'content-type':'application/json'},body:'{"username":"teste"}'});
  assert.equal((await response.json()).ok,true);
  assert.equal(calls[0].args.request.path,'/api/account/login');
  assert.equal(Buffer.from(calls[0].args.request.bodyBase64,'base64').toString(),'{"username":"teste"}');
  const body=new Uint8Array([0,255,127,10]);
  await window.fetch('/api/media/upload?bucket=avatars&path=a',{method:'POST',headers:{Authorization:'Bearer teste'},body});
  assert.deepEqual(Buffer.from(calls[1].args.request.bodyBase64,'base64'),Buffer.from(body));
  assert.equal(calls[1].args.request.headers.authorization,'Bearer teste');
});
test('Supabase continua no fetch do navegador; Request e cancelamento são respeitados',async()=>{
  const {window,calls,network}=bridge();
  await window.fetch('https://example.supabase.co/rest/v1/perfis');
  assert.equal(network.length,1);assert.equal(calls.length,0);
  await window.fetch(new Request('http://tauri.localhost/api/steam-free'));
  assert.equal(calls[0].args.request.path,'/api/steam-free');
  const control=new AbortController();control.abort();
  await assert.rejects(window.fetch('/api/steam-free',{signal:control.signal}),{name:'AbortError'});
});
test('interface empacotada mantém scripts válidos e ajustes desktop',()=>{
  const html=read('dist/app.html');
  let count=0;
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if(/\bsrc=|application\/ld\+json/.test(match[1]))continue;
    new vm.Script(match[2]);count++;
  }
  assert.ok(count>10);
  assert.ok(!html.includes('<script src="/config.js">'));
  assert.ok(html.includes('redirectTo:window.BC_WEB_ORIGIN'));
  assert.ok(html.includes("if(!window.BC_DESKTOP&&'serviceWorker'"));
  assert.ok(html.includes('!window.BC_DESKTOP&&'));
  assert.ok(!html.includes('✓ PWA ativo'));
});
test('configuração é analisada como JSON, sem executar JavaScript remoto',async()=>{
  const stored=[];let destination;let handler;
  const button={hidden:true,addEventListener:(type,fn)=>{handler=fn}};
  const status={textContent:''};
  let source='window.BC_CONFIG={"SUPABASE_URL":"https://sample.supabase.co","SUPABASE_ANON_KEY":"sb_publishable_test"};';
  const context={URL,atob,document:{getElementById:id=>id==='retry'?button:status},sessionStorage:{setItem:(...x)=>stored.push(x)},location:{replace:x=>{destination=x}},window:{bcBackendRequest:async()=>new Response(source)}};
  vm.runInNewContext(read('src/startup.js'),context);
  await new Promise(r=>setTimeout(r,10));
  assert.equal(destination,'./app.html');assert.equal(stored.length,1);
  source='window.BC_CONFIG={};alert("unexpected")';destination=null;
  await handler();assert.equal(destination,null);assert.equal(button.hidden,false);
  source='window.BC_CONFIG={"SUPABASE_URL":"https://sample.supabase.co","SUPABASE_ANON_KEY":"sb_secret_bad"};';
  await handler();assert.equal(destination,null);assert.equal(stored.length,1);
});

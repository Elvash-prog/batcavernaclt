// Render the actual desktop UI using an isolated demo bridge, never a real account.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const desktop=path.resolve('desktop');
const version=JSON.parse(fs.readFileSync(path.join(desktop,'package.json'),'utf8')).version;
const dataUrl=(file,type)=>'data:'+type+';base64,'+fs.readFileSync(file).toString('base64');
const fallback=dataUrl(path.join(desktop,'src/brand.jpg'),'image/jpeg');
const wallpaper=dataUrl(path.join(desktop,'src/login-cave.jpg'),'image/jpeg');
const specs=[
 [1145360,'Hades','🎮 Em Progresso',24,'Ação • Roguelike'],
 [367520,'Hollow Knight','✅ Zerado',42,'Metroidvania • Aventura'],
 [504230,'Celeste','🏆 100% (Platina)',18,'Plataforma'],
 [413150,'Stardew Valley','🎮 Em Progresso',86,'Simulação • RPG'],
 [620,'Portal 2','✅ Zerado',12,'Quebra-cabeça'],
 [870780,'Control','📌 Backlog',0,'Ação • Aventura']
];
const assets={};
const games=await Promise.all(specs.map(async([appid,nome,status,horas,generos],i)=>{
 const base='https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/'+appid+'/';
 let picture;
 for(const name of ['library_600x900_2x.jpg','header.jpg']){
  try{const r=await fetch(base+name,{signal:AbortSignal.timeout(15000)});if(r.ok&&r.headers.get('content-type')?.startsWith('image/')){picture='data:image/jpeg;base64,'+Buffer.from(await r.arrayBuffer()).toString('base64');break}}catch{}
 }
 if(!picture)throw Error('Official public artwork unavailable for '+nome);
 const capa=base+'library_600x900_2x.jpg';assets[capa]=picture;
 return {id:i+1,nome,categoria:'jogos',status,horas,generos,plataforma:'💻 PC',loja:'🟦 Steam',steam_appid:appid,capa,nota:'❤️ Excelente',ano:2020,data:'2026-10-15',conquistas:status.includes('Platina')?100:status.includes('Zerado')?85:35};
}));
const demo={version,fallback,wallpaper,assets,games};
const original=fs.readFileSync(path.join(desktop,'scripts/ui-smoke.mjs'),'utf8');
const cutoff=original.indexOf('  await page.goto(origin);');
if(cutoff<0)throw Error('Desktop smoke setup changed; review the demo renderer.');
let setup=original.slice(0,cutoff);
setup=setup.replace('await page.addInitScript(() => {','await page.addInitScript((presentation) => {');
const close=setup.lastIndexOf('  });');
if(close<0)throw Error('Demo setup boundary not found.');
const bridge=`
    const originalInvoke=window.__TAURI__.core.invoke;
    const profileDemo={...profile,nome:'Perfil de demonstração',bio:'Jogos, histórias e novas jornadas.',avatar_url:'',banner_url:'',retroachievements_user:'RetroDemo',jogos_destaque:presentation.games.slice(0,4).map(g=>g.nome),stats:{total:6,finished:3,hours:182}};
    window.__TAURI__.core.invoke=async(c,p={})=>{
      if(c==='app_state')return {authenticated:true,version:presentation.version,user:{id:'test'}};
      if(c==='check_for_updates')return {available:false,version:presentation.version};
      if(c==='dashboard')return {profile:profileDemo,counts:{totalGames:6,playing:2,finished:3,totalMedia:0,unread:0},recent:presentation.games,updates:presentation.games.slice(0,2)};
      if(c==='profile'&&!p.userId)return profileDemo;
      if(c==='library'&&p.category==='jogos')return presentation.games;
      if(c==='cover_image'){const game=presentation.games.find(g=>(p.url||'').includes('/apps/'+g.steam_appid+'/'));return (game?presentation.assets[game.capa]:presentation.assets[p.url])||((p.url||'').includes('banner')||(p.url||'').includes('background')?presentation.wallpaper:presentation.fallback);}
      if(c==='media_url')return presentation.wallpaper;
      if(c==='notifications')return [];
      if(c==='catalog'&&p.input?.provider==='igdb')return {results:presentation.games.map(g=>({id:g.steam_appid,name:g.nome,background_image:g.capa,cover_image:g.capa,genres:g.generos.split(' • ').map(name=>({name}))}))};
      return originalInvoke(c,p);
    };
`;
setup=setup.slice(0,close)+bridge+'  }, '+JSON.stringify(demo)+');\n';
const captures=`
  await page.goto(origin);
  await page.locator('.home-hero-content h2').waitFor();
  await page.waitForTimeout(1300);
  const stable=async()=>{
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(900);
    await page.evaluate(()=>Promise.all([...document.images].filter(i=>!i.complete).map(i=>new Promise(r=>{i.addEventListener('load',r,{once:true});i.addEventListener('error',r,{once:true});setTimeout(r,2500)}))));
  };
  await stable();await page.screenshot({path:'preview/apresentacao-inicio.png',animations:'disabled'});
  await page.locator('[data-view="library"]').first().click();
  await page.locator('#libraryGroups').waitFor();await stable();
  await page.screenshot({path:'preview/apresentacao-biblioteca.png',animations:'disabled'});
  await page.locator('#mainNav [data-view="settings"]').click();
  await page.locator('[data-settings-tab="appearance"]').click();await stable();
  await page.screenshot({path:'preview/apresentacao-personalizacao.png',animations:'disabled'});
  if(errors.length)throw Error(errors.join('\\n'));
} finally {
  if(browser)await browser.close();
  server.close();
}
`;
const generated=path.join(desktop,'scripts/.presentation-captures.mjs');
try{
 fs.writeFileSync(generated,setup+captures);
 const result=spawnSync(process.execPath,[generated],{cwd:desktop,stdio:'inherit',timeout:180000});
 if(result.status!==0)throw Error('Presentation capture failed: '+result.status);
}finally{fs.rmSync(generated,{force:true});}

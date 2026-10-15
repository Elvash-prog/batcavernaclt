import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = path => fs.readFileSync(new URL('../'+path, import.meta.url), 'utf8');

test('interface desktop é própria e não carrega o site', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url),'utf8'),shell=read('src/AppShell.tsx');
  assert.match(shell, /BATCAVERNA DOS CLTs/);
  assert.match(shell, /\['library','▦','Biblioteca'\]/);
  assert.doesNotMatch(html, /iframe|workers\.dev|config\.js/i);
});

test('login e aplicativo respeitam o estado oculto', () => {
  const html = read('src/main.tsx');
  const css = read('src/visibility.css');
  assert.match(html, /import '\.\/visibility\.css'/);
  assert.match(html, /import '\.\/phase03\.css'/);
  assert.match(css, /\[hidden\]\s*\{\s*display\s*:\s*none\s*!important\s*;?\s*\}/i);
});

test('camada visual profissional preserva temas, foco acessível e movimento reduzido', () => {
  const shell=read('src/main.tsx'),css=read('src/professional.css');
  assert.match(shell,/import '\.\/professional\.css'/);
  assert.match(css,/color-mix\(in srgb, var\(--accent\)/);
  assert.match(css,/\.reference-ui button:focus-visible/);
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css,/\.reference-ui \.sidebar nav button\.active/);
  assert.match(css,/\.reference-ui \.complete-profile/);
  assert.match(css,/::-webkit-progress-value/);
});

test('início Neon Underground mantém conteúdo real e cards responsivos', () => {
  const shell=read('src/main.tsx'),script=read('src/reference.js'),css=read('src/cavern-home.css');
  assert.match(shell,/import '\.\/cavern-home\.css'/);
  assert.match(script,/classList\.add\('reference-home','cavern-home'\)/);
  assert.match(script,/Progresso da jornada/);
  assert.match(script,/Recomendados para você/);
  assert.match(script,/Continuar jogando/);
  assert.match(css,/grid-template-columns:\s*minmax\(0, 1fr\) clamp\(280px, 20vw, 330px\)/);
  assert.match(css,/object-fit:\s*cover/);
  assert.match(css,/@media \(max-width: 1120px\)/);
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
});

test('instalador NSIS usa identidade BatCaverna e atalhos por usuário em português', () => {
  const config=JSON.parse(read('src-tauri/tauri.conf.json')),nsis=config.bundle.windows.nsis;
  assert.equal(nsis.installMode,'currentUser');
  assert.equal(nsis.languages[0],'PortugueseBR');
  assert.equal(nsis.displayLanguageSelector,false);
  assert.equal(nsis.startMenuFolder,'BatCaverna CLT');
  for(const [key,width,height] of [['headerImage',150,57],['sidebarImage',164,314]]){
    const bitmap=fs.readFileSync(new URL('../src-tauri/'+nsis[key],import.meta.url));
    assert.equal(bitmap.toString('ascii',0,2),'BM');
    assert.equal(bitmap.readInt32LE(18),width);
    assert.equal(Math.abs(bitmap.readInt32LE(22)),height);
  }
});

test('login informa andamento e nunca falha silenciosamente', () => {
  const html = read('src/AppShell.tsx');
  const script = read('src/app.js');
  assert.match(html, /data-idle-label="Entrar na BatCaverna"/);
  assert.match(script, /Entrando…/);
  assert.match(script, /failureMessage\(failure\)/);
  assert.match(script, /new FormData\(form\)/);
});

test('tela de login não apresenta referência à versão desktop', () => {
  const html = read('src/AppShell.tsx');
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
  assert.match(script, /command!=='cover_image'/);
  assert.match(script, /if\(!url\)\{n\.src='brand\.jpg'/);
  assert.match(script, /stage:'SLOW_VIEW'/);
  assert.match(script, /stage:'SLOW_COMMAND'/);
  assert.match(script, /now-last>=60000/);
  assert.match(read('src/refinement.js'), /COVER_RETRY_MS=300000/);
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
  const html=read('src/AppShell.tsx'),script=read('src/app.js'),rust=read('src-tauri/src/main.rs');
  assert.match(html,/id="registerForm"/);
  assert.match(html,/id="recoverForm"/);
  assert.match(html,/\['profile','◎','Meu perfil'\]/);
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

test('conquistas usam os mesmos 32 critérios do site com a biblioteca do perfil',()=>{
 const script=read('src/redesign.js'),start=script.indexOf('function siteAchievements('),end=script.indexOf('function cltTitle(',start),ctx={Set};vm.createContext(ctx);vm.runInContext(script.slice(start,end),ctx);
 const empty=ctx.siteAchievements([],[],[],0,0,0);assert.equal(empty.length,32);assert.equal(empty.filter(a=>a[3]).length,0);
 const games=Array.from({length:25},(_,i)=>({nome:'Jogo '+i,nota:9,plataforma:'PC',generos:'Ação',status:'Zerado',conquistas:i<5?100:0}));const result=ctx.siteAchievements(games,games,[],1000,25,5);assert.equal(result.find(a=>a[1]==='Mil horas')[3],true);assert.equal(result.find(a=>a[1]==='Biblioteca lendária')[3],false);assert.equal(result.find(a=>a[1]==='Caçador de 100%')[3],true);
});
test('SQL do desktop restringe limpeza à conta e personalização às amizades',()=>{
 const sql=fs.readFileSync(new URL('../../supabase/patch-1.44-desktop-0.6.sql',import.meta.url),'utf8');assert.match(sql,/delete from public\.notificacoes where destinatario_id=auth\.uid\(\)/i);assert.match(sql,/u=p_id or clt_private\.friends\(u,p_id\)/i);assert.doesNotMatch(sql,/disable row level security|grant.*to anon/i);assert.match(sql,/alter publication supabase_realtime add table/);
});


test('gêneros preservam listas da API e convertem campos do editor para arrays',()=>{
 const source=read('src/app.js').match(/function normalizeGenres\(value\)\{[^\n]+/)[0];
 const parse=vm.runInNewContext('('+source+')');
 assert.deepEqual(JSON.parse(JSON.stringify(parse('Ação • Aventura • RPG • Ação'))),['Ação','Aventura','RPG']);
 assert.deepEqual(JSON.parse(JSON.stringify(parse([{description:'Ação'},{name:'RPG'}]))),['Ação','RPG']);
 assert.deepEqual(JSON.parse(JSON.stringify(parse(null))),[]);
});


test('histórico mantém datas de calendário sem deslocamento de fuso',()=>{
 const source=read('src/reference.js').match(/function referenceDate\(value\)\{[^\n]+/)[0];
 const format=vm.runInNewContext('('+source+')',{date:()=> 'timestamp formatado'});
 assert.equal(format('2026-10-11'),'11/10/2026');
 assert.equal(format('2026-10-11T20:00:00Z'),'timestamp formatado');
});


test('fundo global vincula a conta Elvash ao UUID e impede acesso direto',()=>{const sql=fs.readFileSync(new URL('../../supabase/patch-1.45-desktop-0.9.sql',import.meta.url),'utf8');assert.match(sql,/insert into public.clt_launcher_admins\(user_id\) values\(owner_id\)/);assert.match(sql,/revoke all on public.clt_launcher_admins from anon, authenticated/);assert.match(sql,/user_id=auth.uid\(\)/);assert.match(sql,/if not public.clt_launcher_can_edit\(\)/);assert.match(sql,/grant execute on function public.clt_launcher_public\(\) to anon,authenticated/);});

test('detalhes não confundem sequências, edições ou remakes',()=>{
 const source=read('src/app.js'),start=source.indexOf('function catalogTitleKey'),end=source.indexOf('async function searchCatalog',start),context=vm.createContext({});vm.runInContext(source.slice(start,end),context);
 const match=(rows,item)=>context.matchCatalogTitle(rows,item);
 assert.equal(match([{id:1,name:'Dark Souls II'},{id:2,name:'Dark Souls III'}],{nome:'Dark Souls III'}).id,2);
 assert.equal(match([{id:1,name:'Dark Souls III Deluxe Edition'}],{nome:'Dark Souls III'}),null);
 assert.equal(match([{id:1,title:'Duna',release_date:'1984-01-01'},{id:2,title:'Duna',release_date:'2021-01-01'}],{nome:'Duna',ano:2021}).id,2);
 assert.equal(match([{id:1,title:'Duna'},{id:2,title:'Duna'}],{nome:'Duna'}),null);
 assert.equal(match([{id:1,title:{english:'Anime de teste'}}],{nome:'Anime de teste'}).id,1);
});

test('desktop 0.10 expõe os recursos compartilhados do site e do APK',()=>{
 const html=read('src/main.tsx'),journey=read('src/journey.js'),rust=read('src-tauri/src/v06.rs'),css=read('src/journey.css');
 new vm.Script(journey);
 assert.match(html,/journey\.css/);assert.match(html,/journey\.js/);
 for(const action of ['lists','recommendations','preferences','save_preferences'])assert.match(rust,new RegExp('"'+action+'"'));
 for(const action of ['stats','progress','save_progress','next_episode','next_season'])assert.match(rust,new RegExp('"'+action+'"'));
 for(const view of ['lists','recommendations','statistics','preferences'])assert.match(journey,new RegExp("view==='"+view+"'"));
 assert.match(journey,/bc-desktop-draft:/);assert.match(journey,/batcaverna:item-details/);
 assert.match(css,/\.sidebar-account/);assert.match(css,/\.statistics-layout/);assert.doesNotMatch(journey,/fetch\(/);
});

test('desktop 0.11 alinha perfil, biblioteca, comunidade, chat e presença',()=>{
 const html=read('src/main.tsx'),script=read('src/alignment.js'),css=read('src/alignment.css'),rust=read('src-tauri/src/main.rs'),realtime=read('src-tauri/src/v06.rs');
 new vm.Script(script);
 assert.match(html,/alignment\.css/);assert.match(html,/alignment\.js/);
 assert.doesNotMatch(script,/category-library-card|renderCollectionHub|initialPatchNotes|Novidades da versão/);assert.match(script,/friends-compact/);assert.match(script,/community-reference-layout/);assert.match(script,/data-dock-status/);assert.match(script,/unifiedAddFriend/);
 assert.match(script,/data-profile-section="library"/);assert.match(script,/state\.settingsTab!==['"]appearance['"]/);
 assert.match(css,/grid-template-columns:\s*210px minmax\(420px,\s*760px\) 260px/);assert.match(css,/grid-template-columns:\s*230px minmax\(0,\s*1fr\)\s*!important/);
 const chatQuery=rust.match(/async fn chat_messages[\s\S]*?(?=async fn send_message)/)?.[0]||'';
 assert.doesNotMatch(chatQuery,/select=[^"\n]*updated_at/);assert.match(chatQuery,/created_at,lida/);
 assert.match(realtime,/interval\(Duration::from_secs\(5\)\)/);
});

test('desktop 0.12.1 envia indicação da biblioteca e mantém atividades à direita',()=>{
 const journey=read('src/journey.js'),css=read('src/catalog-library.css');
 const sql=fs.readFileSync(new URL('../../supabase/ativar-desktop-0.12.1.sql',import.meta.url),'utf8');
 assert.match(journey,/item_name:selected\.nome/);
 assert.match(journey,/item_category:selected\.categoria/);
 assert.match(journey,/Atualize a biblioteca e escolha o título novamente/);
 assert.match(sql,/i\.user_id=u and lower\(trim\(i\.nome\)\)=lower\(trim\(p_data->>'item_name'\)\)/);
 assert.match(sql,/referencia_id,read\) values\(target,'friend_recommendation',[\s\S]*?,r\.id,false\)/);
 assert.doesNotMatch(sql,/r\.id::text,false/);
 assert.match(css,/dashboard-columns>\.hero-activity\{grid-column:2;justify-self:end/);
 assert.match(css,/@media\(max-width:1050px\)\{\.reference-ui \.reference-home>\.dashboard-columns>\.hero-activity\{grid-column:1/);
});

test('desktop 0.13 usa React e respeita redução de movimento',()=>{
 const main=read('src/main.tsx'),shell=read('src/AppShell.tsx'),motion=read('src/react-motion.css');
 const config=fs.readFileSync(new URL('../vite.config.ts',import.meta.url),'utf8');
 const tauri=JSON.parse(read('src-tauri/tauri.conf.json'));
 assert.match(main,/createRoot/);assert.match(main,/flushSync\(\(\)=>root\.render/);assert.match(main,/void start\(\)/);
 assert.match(read('src/app.js'),/batcaverna:legacy-ready/);
 assert.match(main,/dispatchEvent\(new Event\('batcaverna:legacy-ready'\)\)/);
 assert.match(shell,/MutationObserver/);assert.match(shell,/view-enter/);
 assert.match(motion,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(motion,/@keyframes dialog-in/);assert.match(config,/@vitejs\/plugin-react/);
 assert.equal(tauri.build.frontendDist,'../dist');assert.equal(tauri.version,'0.17.12');
});

test('desktop 0.13.1 diagnostica a etapa de boot e valida o bundle do instalador',()=>{
 const main=read('src/main.tsx'),motion=read('src/react-motion.css'),verify=read('scripts/verify-bundle.mjs'),pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 assert.match(main,/type BootFailure/);assert.match(main,/Copiar diagnóstico/);assert.match(main,/Tentar novamente/);assert.match(main,/stage=module\.name/);
 assert.match(motion,/\.fatal-error-panel/);assert.match(verify,/data:\(\?:text\|application\)/);assert.match(verify,/desktop-fixes/);
 assert.match(pkg.scripts['build:web'],/verify-bundle\.mjs/);assert.equal(pkg.version,'0.17.12');
});

test('SQL base e APK recuperam indicações por nome e preservam UUID',()=>{
 const sql=fs.readFileSync(new URL('../../supabase/patch-1.1.0-listas-indicacoes.sql',import.meta.url),'utf8');
 const android=fs.readFileSync(new URL('../../android-native/app/src/main/java/dev/gamersclt/batcaverna/nativeapp/RecommendationInput.java',import.meta.url),'utf8');
 assert.match(sql,/p_data->>'item_name'/);assert.match(sql,/p_data->>'item_category'/);assert.match(sql,/u,r\.id,false/);assert.doesNotMatch(sql,/r\.id::text,false/);
 assert.match(android,/"item_name"/);assert.match(android,/"item_category"/);
});

test('indicações resolvidas somem e não podem ser respondidas novamente',()=>{
 const journey=read('src/journey.js');
 const sql=fs.readFileSync(new URL('../../supabase/patch-1.1.0-listas-indicacoes.sql',import.meta.url),'utf8');
 const migration=fs.readFileSync(new URL('../../supabase/patch-1.3.2-indicacoes-resolvidas.sql',import.meta.url),'utf8');
 assert.match(journey,/function pendingRecommendation/);
 assert.match(journey,/allRows\.filter\(pendingRecommendation\)/);
 assert.match(journey,/rows\.splice\(index,1\)/);
 assert.match(sql,/recipient_id=u and estado='pendente'/);
 assert.match(sql,/c\.recipient_id=u and c\.estado='pendente'/);
 assert.match(migration,/pg_get_functiondef/);
});

test('estabilidade exporta diagnóstico e o pipeline abre o Tauri real',()=>{
 const main=read('src/main.tsx'),runtime=read('src-tauri/src/desktop_runtime.rs');
 const workflow=fs.readFileSync(new URL('../../.github/workflows/desktop-windows.yml',import.meta.url),'utf8');
 for(const marker of ['BOOT_MODULE','BOOT_READY','BOOT_FAILURE'])assert.match(main,new RegExp(marker));
 for(const command of ['client_log','diagnostic_status','diagnostic_clear','diagnostic_export'])assert.match(runtime,new RegExp('fn '+command));
 assert.match(runtime,/DIAGNOSTIC_LIMIT/);assert.match(runtime,/\[dado-protegido\]/);
 const logger=runtime.slice(runtime.indexOf('fn clean_log'),runtime.indexOf('#[derive(Clone',runtime.indexOf('fn clean_log')));
 assert.doesNotMatch(logger,/access_token|refresh_token|password/);
 assert.match(workflow,/Smoke test do Tauri real/);assert.match(workflow,/batcaverna-clt-desktop\.exe/);assert.match(workflow,/BOOT_READY/);assert.match(workflow,/BOOT_FAILURE/);
});

test('início mantém atividades à direita e não mostra novidades da versão',()=>{
 const alignment=read('src/alignment.js'),styles=read('src/alignment.css');
 assert.doesNotMatch(alignment,/initialPatchNotes|Novidades da versão/);
 assert.doesNotMatch(styles,/initial-patch-notes|initialPatchNotes/);
 assert.match(styles,/grid-template-columns:\s*minmax\(0,\s*1fr\) clamp\(280px,\s*22vw,\s*340px\)/);
 assert.match(styles,/\.reference-home \.home-hero[^}]*min-height:\s*300px/);
});

test('desktop 0.15 entrega notificação realtime sem duplicar o polling',()=>{
 const runtime=read('src-tauri/src/desktop_runtime.rs'),realtime=read('src-tauri/src/v06.rs');
 assert.match(runtime,/NOTIFICATION_MEMORY/);assert.match(runtime,/pub fn realtime_notification/);
 assert.match(runtime,/register_notification\(&owner, notice\)/);assert.match(runtime,/fingerprints\.retain/);
 assert.match(realtime,/data\["table"\]=="notificacoes"&&data\["type"\]=="INSERT"/);
 assert.match(realtime,/desktop_runtime::realtime_notification\(&app,&owner,&data\["record"\]\)/);
});

test('presença mantém o último estado durante reconexões curtas',()=>{
 const script=read('src/redesign.js');
 assert.match(script,/presenceReady:false/);
 assert.match(script,/ui\.presenceReady=true/);
 assert.doesNotMatch(script,/p\.status!==['"]connected['"]\)ui\.presence=\{\}/);
 assert.doesNotMatch(script,/Presença indisponível/);
});

test('desktop 0.16 restaura pela bandeja e usa gaveta de amigos',()=>{
 const rust=read('src-tauri/src/main.rs'),alignment=read('src/alignment.js'),css=read('src/alignment.css');
 assert.match(rust,/on_tray_icon_event/);assert.match(rust,/MouseButton::Left/);assert.match(rust,/desktop_runtime::show_main\(tray\.app_handle\(\)\)/);
 assert.match(alignment,/chatNav\?\.remove\(\)/);assert.match(alignment,/id='friendsDock'/);assert.match(alignment,/id=\"friendsDockClose\"/);assert.match(alignment,/data-dock-friend/);
 assert.match(css,/\.friends-dock\s*\{/);assert.match(css,/profile-cover-complete \.profile-cover-art[^{]*\{[^}]*opacity:\s*1\s*!important/);assert.match(alignment,/Abrir meu perfil/);assert.match(alignment,/friendsDockStatuses/);
});

test('desktop 0.17 mantém XP, diversifica missões e combina ofertas Steam',()=>{
 const fixes=read('src/desktop-fixes.js'),alignment=read('src/alignment.js'),rust=read('src-tauri/src/main.rs'),community=read('src-tauri/src/v06.rs'),worker=fs.readFileSync(new URL('../../worker.js',import.meta.url),'utf8'),sql=fs.readFileSync(new URL('../../supabase/patch-1.47-progressao-missoes.sql',import.meta.url),'utf8');
 assert.match(fixes,/missions_v2/);assert.match(fixes,/\+\$\{Number\(m\.xp\)/);assert.match(fixes,/library-collection-hero/);
 assert.match(fixes,/collection-overview['"]\)\?\.remove\(\)/);assert.doesNotMatch(alignment,/sidebarCommunity['"]\)\?\.remove\(\)/);
 assert.match(community,/clt_progression_v2/);assert.match(community,/clt_claim_mission_v2/);assert.match(rust,/\/api\/steam-free/);
 assert.match(worker,/\['21','DLC'\]/);assert.match(sql,/clt_xp_events/);assert.match(sql,/watch_episode/);assert.match(sql,/revoke all on function clt_private\.ensure_missions/);assert.doesNotMatch(sql,/delete from public\.clt_xp_events/i);
});

test('perfil desktop centraliza conteúdo e inicia dados independentes em paralelo',()=>{
 const script=read('src/app.js'),styles=read('src/desktop-fixes.css'),refinement=read('src/refinement.css'),profile=script.slice(script.indexOf('async function renderProfile'),script.indexOf('\nfunction fileData')),redesign=read('src/redesign.js'),rust=read('src-tauri/src/v06.rs'),android=fs.readFileSync(new URL('../../android-native/app/src/main/java/dev/gamersclt/batcaverna/nativeapp/AccountRepository.java',import.meta.url),'utf8');
 assert.match(profile,/profile-page/);assert.match(styles,/\.profile-page\s*\{[^}]*width:\s*min\(100%,\s*1800px\)[^}]*margin-inline:\s*auto/s);
 assert.match(styles,/\.complete-profile,\s*\.profile-tabs,\s*\[data-profile-page\]\s*\{[^}]*width:\s*min\(100%,\s*1800px\)[^}]*margin-inline:\s*auto/s);
 assert.match(styles,/\.reference-ui \.profile-overview-columns\s*\{[^}]*grid-template-columns:\s*minmax\(240px,\s*300px\)\s+minmax\(0,\s*1fr\)/s);
 assert.match(styles,/@media\s*\(max-width:\s*1000px\)[\s\S]*\.reference-ui \.profile-overview-columns\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
 assert.match(styles,/@media\s*\(max-width:\s*820px\)[\s\S]*\.reference-ui\s*\{\s*--sidebar:\s*68px/);
 assert.match(styles,/@media\s*\(max-width:\s*1100px\)[\s\S]*\.complete-profile \.profile-body\s*\{[^}]*grid-template-columns:\s*80px minmax\(0,\s*1fr\)/);
 assert.match(refinement,/\.reference-ui #content\.screen-pending\{visibility:visible!important;opacity:\.72;pointer-events:none\}/);
 assert.ok(profile.indexOf('Promise.all([loadStats(),api.library')<profile.indexOf('await api.profile'));
 assert.match(profile,/error=>\(\{error\}\)/);assert.match(profile,/Estatísticas indisponíveis/);
 assert.match(redesign,/Promise\.all\(\[api\.profile\(own\?null:id\),xapi\(\{op:'profile_bundle',id\}\)\]\)/);
 assert.match(rust,/tokio::try_join!\([\s\S]*clt_desktop_profile[\s\S]*perfil_detalhes_autorizado/);
 assert.match(rust,/tokio::try_join!\([\s\S]*let mut items=Vec::new\(\)[\s\S]*clt_progression_v2/);
 assert.doesNotMatch(rust,/ranking_clt"\),token\)\.await\.unwrap_or\(json!\(\[\]\)\)/);
 assert.match(android,/Executors\.newFixedThreadPool\(4\)/);
});

test('updater Windows verifica releases, exige confirmação e publica bundles assinados',()=>{
 const script=read('src/app.js'),guide=fs.readFileSync(new URL('../../docs/ATUALIZACOES-IN-APP.md',import.meta.url),'utf8');
 const rust=read('src-tauri/src/main.rs'),config=JSON.parse(read('src-tauri/tauri.conf.json'));
 const workflow=fs.readFileSync(new URL('../../.github/workflows/desktop-release.yml',import.meta.url),'utf8');
 assert.match(script,/Verificar atualizações/);assert.match(script,/Deseja baixar e instalar agora/);assert.match(script,/check_for_updates/);assert.match(script,/install_update/);
 assert.match(rust,/UpdaterExt/);assert.match(rust,/download_and_install/);assert.match(rust,/A atualização mudou ou não está mais disponível/);
 assert.equal(config.plugins.updater.endpoints[0],'https://github.com/Elvash-prog/batcavernaclt/releases/latest/download/latest.json');
 assert.ok(config.plugins.updater.pubkey);
 assert.match(workflow,/desktop-v\*/);assert.match(workflow,/TAURI_SIGNING_PRIVATE_KEY/);assert.match(workflow,/latest\.json/);assert.match(workflow,/windows-x86_64/);assert.match(workflow,/softprops\/action-gh-release/);assert.match(workflow,/RELEASE_TAG: \$\{\{ github\.ref_name \}\}/);assert.match(workflow,/package-lock\.json/);assert.match(workflow,/Windows-setup\.exe\.sig/);assert.doesNotMatch(workflow,/nsis\.zip/);
 assert.match(guide,/signer generate/);assert.match(guide,/TAURI_SIGNING_PRIVATE_KEY/);assert.match(guide,/nenhuma release foi publicada/i);
});

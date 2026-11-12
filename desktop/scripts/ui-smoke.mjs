import {testSensitiveCovers} from './sensitive-covers-ui.mjs';
import { chromium } from "playwright";
import {benchmarkLibrary} from "./library-benchmark.mjs";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
fs.mkdirSync("preview", { recursive: true });
const server = http.createServer((req, res) => {
  const name =
      new URL(req.url, "http://local").pathname === "/"
        ? "index.html"
        : new URL(req.url, "http://local").pathname.slice(1),
    root = path.resolve("dist"),
    file = path.resolve(root, name);
  if (
    !file.startsWith(root) ||
    !fs.existsSync(file) ||
    !fs.statSync(file).isFile()
  ) {
    res.writeHead(404).end();
    return;
  }
  res.setHeader(
    "Content-Type",
    name.endsWith(".js")
      ? "text/javascript"
      : name.endsWith(".css")
        ? "text/css"
        : name.endsWith(".png")
          ? "image/png"
          : name.endsWith(".jpg")
            ? "image/jpeg"
            : "text/html",
  );
  res.end(fs.readFileSync(file));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser, testPage;
try {
  browser = await chromium.launch({ headless: true });
  await testSensitiveCovers(browser);
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });
  testPage = page;
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://**", (r) => r.abort());
  await page.route('https://example.test/list-preview-*.jpg',route=>{const warm=route.request().url().includes('-2.');return route.fulfill({status:200,contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450"><defs><linearGradient id="a" x2="1" y2="1"><stop stop-color="${warm?'#642c62':'#164658'}"/><stop offset="1" stop-color="${warm?'#db8c63':'#253c5e'}"/></linearGradient></defs><rect width="600" height="450" fill="url(#a)"/><circle cx="440" cy="100" r="85" fill="#e7b677" opacity=".6"/><path d="M0 450 170 160 300 350 440 200 600 450Z" fill="#101925"/></svg>`});});
  await page.addInitScript(() => {
    const image =
      "data:image/svg+xml;base64," +
      btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#164658"/><stop offset=".6" stop-color="#253c5e"/><stop offset="1" stop-color="#e26438"/></linearGradient></defs><rect width="600" height="900" fill="url(#g)"/><circle cx="405" cy="210" r="140" fill="#d4a76b" opacity=".35"/><path d="M0 690 200 320 380 660 460 510 600 750V900H0Z" fill="#071621"/><path d="M290 340 340 340 375 770 260 770Z" fill="#102532"/></svg>',
      );
    const profile = {
        id: "test",
        nome: "Conta de teste",
        slug: "teste",
        avatar_url: "",
        banner_url:
          "https://luoqlhgfmixvfqbfcdoc.supabase.co/storage/v1/object/public/avatars/test/banner.webp",
        status_personalizado: "online",
        bio: "Perfil de teste",
        steam_id: "",
        retroachievements_user: "RetroTester",
        jogos_destaque: ["Jogo zerado"],
        conquistas_destaque: [0],
        amigos_em_comum: ["friend"],
        fundo: { url: "https://luoqlhgfmixvfqbfcdoc.supabase.co/storage/v1/object/public/avatars/test/background.webp", escuro: 65, desfoque: 0 },
        stats: { total: 5, finished: 2, hours: 30 },
      },
      friend = {
        id: "friend",
        nome: "Amigo",
        slug: "amigo",
        avatar_url: "friend/avatar.webp",
      };
    const rows = [
      {
        id: 1,
        nome: "Jogo zerado",
        categoria: "jogos",
        status: "✅ Zerado",
        horas: 20,
        nota: "🤔 A considerar",
        data: "2026-10-11",
        generos: "Ação",
        loja: "Steam",
        capa: "https://media.rawg.io/game.jpg",
      },
      {
        id: 2,
        nome: "Jogo platinado",
        categoria: "jogos",
        status: "🏆 100% (Platina)",
        horas: 10,
      },
      {
        id: 3,
        nome: "Jogo em progresso",
        categoria: "jogos",
        status: "🎮 Em Progresso",
        conquistas:25,horas:3.775,
      },
      { id: 4, nome: "Jogo backlog", categoria: "jogos", status: "📌 Backlog" },
      {
        id: 5,
        nome: "Jogo Steam",
        categoria: "jogos",
        status: "🟦 Biblioteca Steam",
      },
    ];
    let messages = [
        {
          id: "m1",
          remetente_id: "friend",
          destinatario_id: "test",
          texto: "Olá!",
          created_at: "2026-10-11T10:00:00Z",
        },
        {
          id: "m2",
          remetente_id: "test",
          destinatario_id: "friend",
          texto: "Bom dia",
          created_at: "2026-10-11T10:01:00Z",
          midia_url: "test/image.webp",
        },
      ],
      reactions = [],
      notices = [
        {
          id: "n1",
          tipo: "mensagem",
          mensagem: "Mensagem do amigo",
          actor_id: "friend",
          read: false,
          created_at: "2026-10-11T10:02:00Z",
        },
        {
          id: "n2",
          tipo: "post",
          mensagem: "Nova publicação",
          referencia_id: "post1",
          read: false,
          created_at: "2026-10-11T10:03:00Z",
        },
      ],
      customLists = [
        {
          id: "list1",
          nome: "Fim de semana",
          mine: true,
          compartilhada: false,
          count: 1,
          preview:[{nome:'Jogo zerado',capa:'https://example.test/list-preview-1.jpg'}],
        },
        {id:'friend-list',nome:'Férias com ficção',owner_name:'João',mine:false,compartilhada:true,count:4,preview:[{capa:'https://example.test/list-preview-1.jpg'},{capa:'https://example.test/list-preview-2.jpg'},{capa:'https://example.test/list-preview-2.jpg'},{capa:'https://example.test/list-preview-1.jpg'}]},
        {id:'empty-list',nome:'Próxima aventura',mine:true,compartilhada:false,count:0},
      ],
      recommendations = [
        {
          id: "rec1",
          received: true,
          sender_name: "Amigo",
          estado: "pendente",
          mensagem: "Você vai gostar.",
          titulo: {
            id: "sender-item",
            user_id: "friend",
            nome: "Indicação nova",
            categoria: "jogos",
            horas: 999,
            status: "✅ Zerado",
            nota: 10,
          },
        },
      ],
      preferences = {
        mensagens: true,
        social: true,
        amizades: true,
        indicacoes: true,
        progresso: true,
      };
    window.missionRows = [];
    window.coverCalls = 0;
    window.coverFailureCalls = 0;
    window.failCoverImage = false;
    window.mediaDelay = 0;
    window.mediaCalls = 0;
    window.mediaResolved = 0;
    window.slowSocialMedia = false;
    window.diagnostics = [];
    window.saved = [];
    window.updateChecks = 0;
    window.listeners = {};
    window.unhandledRejections = [];
    window.addEventListener("unhandledrejection", (event) =>
      window.unhandledRejections.push(String(event.reason)),
    );
    window.emitIncoming = () => {
      messages.push({
        id: "incoming",
        remetente_id: "friend",
        destinatario_id: "test",
        texto: "Mensagem em tempo real",
        created_at: new Date().toISOString(),
      });
      window.listeners["desktop-change"]({
        payload: { userId: "test", data: { table: "clt_chat_messages" } },
      });
    };
    window.__TAURI__ = {
      event: {
        listen: async (name, cb) => {
          window.listeners[name] = cb;
          return () => delete window.listeners[name];
        },
      },
      core: {
        Channel: class { onmessage() {} },
        invoke: async (c, p) => {
        if(window.savedCoverProbe&&["cover_image","catalog","bright_api"].includes(c))window.savedCoverProbe.push({c,p});
        if(c==='pc_game_preferences'){window.nativePcPreferences=window.nativePcPreferences||{};if(p.input.preferences){if(window.failNativePcPreferences)throw Error('disk full');window.nativePcPreferences[p.input.owner]=structuredClone(p.input.preferences);window.saved.push({c,p});}return window.nativePcPreferences[p.input.owner]||null;}
        if (c === "progress_sync") {
          if(p.input.op==='record')window.saved.push({c,p});
          if(p.input.op==='flush'&&!window.holdProgressPending)window.progressPending=false;
          return {plays:window.progressPending?[{item_id:1,seconds:3600}]:[],synced:window.progressPending?{}:{'1':{hours:11,at:'2026-10-29T12:00:00Z'}},achievements:{}};
        }
        if (c === "running_processes") return ["Control_DX12","game_executable","explorer"];
        if (c === "detect_pc_game") return {name:window.detectedPcGame||null,source:window.detectedPcSource||"mapping",process:window.detectedPcProcess||null,confidence:100};
        if(c==='realtime_presence'){window.saved.push({c,p});return {};}
        if(c==='bright_api'&&p.input.op==='agora'){window.steamPresenceQueries=(window.steamPresenceQueries||0)+1;return {jogando:window.detectedSteamGame?{nome:window.detectedSteamGame}:null};}
        if (c === "check_for_updates") {
          window.updateChecks++;
          return {
            available: true,
            version: "0.17.21",
            notes: "Melhorias de estabilidade e interface.",
          };
        }
        if (c === "install_update") {
          window.saved.push({ c, p });
          if(window.holdUpdateDownload)return await new Promise((resolve,reject)=>{window.updateTransfer={channel:p.onProgress,resolve,reject};});
          return { installed: true };
        }
        if (c === "client_log") {
            if (
              p.input?.stage === "SLOW_VIEW" ||
              p.input?.stage === "SLOW_COMMAND"
            )
              window.diagnostics.push(p.input);
            return {};
          }
          if (c === "diagnostic_status") return { size: 2048 };
          if (c === "diagnostic_export") {
            window.saved.push({ c, p });
            return { path: "C:\\Downloads\\BatCaverna-Diagnostico.txt" };
          }
          if (c === "diagnostic_clear") {
            window.saved.push({ c, p });
            return {};
          }
          if (c === "desktop_preferences") {
            window.saved.push({ c, p });
            return p.input || { background: true, notifications: true, sound:true, autostart:false, start_minimized:false };
          }
          if (c === "test_windows_notification") {
            window.saved.push({ c, p });
            return {};
          }
          if(c === "register" && window.passwordSafetyError) throw new Error(window.passwordSafetyError);
          if(c === "register") return {confirmationRequired:!window.autoConfirm,message:"Conta criada. Você já pode entrar."};
          if(c === "verify_email_proof") { window.saved.push({c,p});return {message:p.input.recovery?"Senha atualizada. Entre com sua nova senha.":"E-mail confirmado. Você já pode entrar."}; }
          if(c === "resend_confirmation" || c === "recover_password") return {sent:true};
          if (c === "launcher_settings") return { wallpaper: null };
          if (c === "launcher_permission") return !!window.adminMode;
          if (c === "set_login_background") {
            window.saved.push({ c, p });
            return { wallpaper: p.url };
          }
          if(c === "verify_email_change") {
            window.saved.push({c,p});const complete=window.saved.filter(x=>x.c===c).length===2;
            return {complete,email:complete?'novo@exemplo.com':'old@exemplo.com',message:complete?'E-mail alterado. Use o novo endereço no próximo login.':'Código aceito. Confirme também o código enviado ao outro endereço.'};
          }
          if (c === "change_email" || c === "link_steam") {
            if(c==="link_steam")profile.steam_id=p.steamId;
            window.saved.push({ c, p });
            return { message: "Confirme o e-mail" };
          }
          if (c === "friend_activity")
            return [
              {
                id: "a1",
                user_id: "friend",
                item_id: 1,
                nome: "Jogo zerado",
                status: "✅ Zerado",
                created_at: "2026-10-12",
                author: friend,
              },
            ];
          if (c === "app_state")
            return {
              authenticated: true,
              version: "0.17.0",
              user: { id: "test" },
            };
          if (c === "dashboard")
            return {
              profile,
              counts: {
                totalGames: 5,
                playing: 1,
                finished: 2,
                totalMedia: 0,
                unread: 1,
              },
              recent: rows,
              updates: rows.slice(0, 2),
            };
          if (c === "journey_stats") throw "RPC ausente";
          if(c==="library"&&window.libraryFailure)throw Error("Falha temporária de conexão. Tente novamente.");
          if (c === "library" && window.delayLibrary)
            await new Promise((r) =>
              setTimeout(r, window.libraryDelay || 120),
            );
          if(c==='library'&&p.category==='jogos'&&window.largeLibrary)return Array.from({length:1200},(_,i)=>({id:'large-'+i,nome:'Coleção '+String(i).padStart(4,'0'),categoria:'jogos',status:i<1000?'📌 Backlog':'✅ Zerado',capa:image}));
          if(c==='library'&&window.libraryQueryRows)return window.libraryQueryRows.filter(row=>p.category==='jogos'?row.categoria==='jogos':row.categoria!=='jogos');
          if(c==='library'&&window.catalogLibraryRows)return window.catalogLibraryRows;
          if (c === "library")
            return p.category === "jogos"
              ? rows
              : p.category === "filmes"
                ? [
                    {
                      id: "f1",
                      nome: "Filme TMDB",
                      categoria: "filmes",
                      tipo: "filme",
                      status: "✅ Concluído",
                      capa: "https://image.tmdb.org/t/p/w500/cover.jpg",
                    },
                  ]
                : p.category === "series"
                  ? [
                      {
                        id: "serie1",
                        nome: "Série de teste",
                        categoria: "filmes",
                        tipo: "serie",
                        status: "▶️ Assistindo",
                      },
                    ]
                  : p.category === "animes"
                    ? [
                        {
                          id: "anime1",
                          nome: "Anime de teste",
                          categoria: "filmes",
                          tipo: "anime",
                          status: "⏳ Para Assistir",
                        },
                      ]
                    : [];
          if(c === "profile" && window.holdProfilePreparation)await new Promise(resolve=>{(window.pendingProfileRequests||=[]).push(resolve);window.releaseProfilePreparation=()=>{window.pendingProfileRequests.splice(0).forEach(done=>done())};});
          if (c === "profile")
            return p.userId
              ? { ...friend, stats: { total: 5, finished: 2, hours: 30 } }
              : window.presenceTestProfile?{...profile,...window.presenceTestProfile}:profile;
          if (c === "friends" || c === "search_people") return [friend];
          if (c === "cover_image") {
            window.coverCalls++;
            if (window.failCoverImage) {
              window.coverFailureCalls++;
              throw new Error("Falha simulada ao carregar capa");
            }
            return image;
          }
          if (c === "media_url") {
            if (!p.url) throw new TypeError("URL de mídia vazia");
            window.mediaCalls++;
            if (window.mediaDelay)
              await new Promise((resolve) =>
                setTimeout(resolve, window.mediaDelay),
              );
            window.mediaResolved++;
            return image;
          }
          if(c === "upload_profile_image"){
            window.saved.push({c,p});
            if(window.failProfileUpload)throw Error("Falha simulada ao enviar imagem");
            return {url:"https://example.invalid/avatars/demo/"+p.input.name+".webp"};
          }
          if(c==='set_home_status'){window.saved.push({c,p});if(window.failHomeStatus)throw Error('O título mudou em outra tela. Atualize o início.');return [{id:p.id,status:p.status,updated_at:new Date().toISOString()}];}
          if (c === "save_item" || c === "update_profile") {
            if(c==='save_item'&&window.batchFixture&&p.item.status==='⏸️ Pausado'){
              window.batchAttempts.push(String(p.item.id));
              if(window.holdBatchSave)await new Promise(resolve=>window.releaseBatchSave=resolve);
              if(window.batchFailureIds.includes(String(p.item.id)))throw Error('Falha simulada em um título');
            }
            if(c==='save_item'&&window.delayItemSave)await new Promise(r=>setTimeout(r,800));
            if(c==='save_item'&&window.failCatalogSave)throw Error('Falha simulada de conexão');
            if(c==='update_profile'&&p.input.status)profile.status_personalizado=p.input.status;
            if(c==='save_item'&&window.libraryQueryRows){const row=window.libraryQueryRows.find(row=>String(row.id)===String(p.item.id));if(row)Object.assign(row,p.item,{updated_at:new Date().toISOString()});}
            window.saved.push({ c, p });
            return {};
          }
          if (c === "notifications") return window.layoutNotices || notices;
          if (c === "mark_notifications_read") {
            notices.forEach((n) => (n.read = true));
            return {};
          }
          if(c==='bright_api'&&p.input.op==='jogos')return {jogos:[{appid:123,nome:'Jogo Steam com muitas horas',horas:1234.567},{appid:124,nome:'Jogo Steam sem tempo',horas:0}]};
          if(c==='bright_api'&&p.input.op==='capas'&&p.input.nomes?.[0]==='Red Dead Redemption')return {capas:[null]};
          if (c === "bright_api" && p.input.op === "conquistas")
            return {
              lista: [
                {
                  nome: "Conquista do jogo",
                  desc: "Objetivo público",
                  got: null,
                  progressKnown: false,
                },
              ],
              progressKnown: false,
            };
          if(c==='bright_api'&&p.input.op==='raCollection')return {cover_url:'https://luoqlhgfmixvfqbfcdoc.supabase.co/storage/v1/object/public/avatars/test/retro-private.webp',game_ids:[],hidden_game_ids:window.hiddenRetro||[]};
          if(c==='bright_api'&&p.input.op==='raSaveCollection'){window.saved.push({c,p});window.hiddenRetro=p.input.removeGameId?[p.input.removeGameId]:[];return {game_ids:[],hidden_game_ids:window.hiddenRetro};}
          if(c==='bright_api'&&p.input.op==='gratis')return {epic:[{nome:'Oferta teste',capa:'https://cdn2.epicgames.com/offer.jpg',url:'https://store.epicgames.com/p/test'}],steam:[{nome:'DLC teste',appid:10,tipo:'DLC',capa:'https://shared.cloudflare.steamstatic.com/header.jpg',url:'https://store.steampowered.com/app/10/'}]};
          if (c === "bright_api" && p.input.op === "raPerfil")
            return {
              usuario: "RetroTester",
              avatar: "",
              pontos: 120,
              pontosHardcore: 45,
            };
          if (c === "bright_api" && p.input.op === "raJogos")
            return {
              total: 1,
              recentes: [],
              jogos: [
                {
                  gameId: 77,
                  nome: "Aventura Retrô",
                  console: "SNES",
                  desbloqueadas: 3,
                  total: 10,
                  hardcore: 1,
                  capa: "https://shared.cloudflare.steamstatic.com/retro-cover.jpg",
                },
              ],
            };
          if (c === "bright_api" && p.input.op === "raConquistas")
            if (window.failRetroAchievements)
              throw new Error("Falha de rede simulada.");
          if (c === "bright_api" && p.input.op === "raConquistas")
            return {
              nome: "Aventura Retrô",
              console: "SNES",
              lista: [
                {
                  nome: "Primeira jornada",
                  desc: "Comece uma aventura.",
                  pontos: 5,
                  got: true,
                },
              ],
            };
          if(c==='bright_api'&&p.input.op==='capaOpcoes'&&p.input.format==='landscape')return {opcoes:[{url:'https://cdn2.steamgriddb.com/grid/landscape-one.png',width:920,height:430}]};
          if(c==='bright_api'&&p.input.op==='capaOpcoes')return {opcoes:[{url:'https://cdn2.steamgriddb.com/grid/portrait-one.png',width:600,height:900,score:10},{url:'https://cdn2.steamgriddb.com/grid/portrait-two.png',width:600,height:900,score:8}]};
          if (c === "bright_api")
            return {
              capas: ["https://images.igdb.com/igdb/image/upload/t_cover_big/test.jpg"],
              amigos: [],
            };
          if (c === "chat_messages") return window.testPrivateMessages||messages;
          if(c==='upload_chat_image'){window.saved.push({c,p});return {path:p.group?'test/group-photo.png':'test/photo.png'};}
          if(c==='save_chat_image'){window.saved.push({c,p});return {name:'BatCaverna-imagem.png'};}
          if (c === "send_message") {
            window.saved.push({c,p});await new Promise(r=>setTimeout(r,100));
            if(window.sendFailure==='before'){window.sendFailure='';throw Error('Conexão interrompida');}
            if(!messages.some(m=>m.id===p.input.messageId))messages.push({id:p.input.messageId||'m'+(messages.length+1),remetente_id:'test',destinatario_id:'friend',texto:p.input.text,midia_url:p.input.media,created_at:new Date().toISOString()});
            if(window.sendFailure==='after'){window.sendFailure='';throw Error('Resposta perdida');}return {};
          }
          if (c === "community") {
            const i = p.input;
            if(i.op==='game_feed'){
              const d=i.data||{};window.gameFeedRows??=Array.from({length:22},(_,n)=>({id:String(8000+n),user_id:'friend',created_at:new Date(Date.UTC(2026,10,9,12,0,22-n)).toISOString(),status:'🎮 Em Progresso',meta:{acao:n===0?'recommend':'started'},title:{nome:n===0?'Prince of Persia':'Aventura '+n,categoria:'jogos',capa:'https://example.com/cover.jpg',plataforma:'PC',ano:2024},author:{nome:'Amigo CLT',avatar_url:''},liked:false,like_count:0}));
              if(i.action==='list'){if(window.delayFeed)await new Promise(r=>setTimeout(r,180));const start=d.before_id?window.gameFeedRows.findIndex(x=>x.id===d.before_id)+1:0;return structuredClone(window.gameFeedRows.slice(start,start+20));}
              window.saved.push({c,p});
              if(i.action==='like'){const row=window.gameFeedRows.find(x=>x.id===d.id);row.liked=d.liked;row.like_count=d.liked?1:0;return [{liked:row.liked,like_count:row.like_count}]}
              if(i.action==='share'){window.gameFeedRows.unshift({...window.gameFeedRows[0],id:'9999',user_id:profile.id,meta:{acao:d.action},title:{...rows[0],nome:rows[0].nome},author:{nome:profile.nome}});return [{id:'9999'}]}
              if(i.action==='delete'){window.gameFeedRows=window.gameFeedRows.filter(x=>x.id!==d.id);return []}
            }
            if (i.op === "features") {
              const d = i.data || {};
              if (i.action === "lists") return customLists;
              if (i.action === "list_items")
                return [{ list_id: "list1", item_id: "1", titulo: rows[0] }];
              if (i.action === "recommendations")
                return window.testRecommendations || recommendations;
              if (i.action === "preferences") return [preferences];
              if (i.action === "create_list") {
                customLists.push({
                  id: "list2",
                  nome: d.nome,
                  mine: true,
                  compartilhada: false,
                  count: 0,
                });
                return [];
              }
              if (i.action === "share_list") {
                customLists[0].compartilhada = d.compartilhada;
                return [];
              }
              if (i.action === "save_preferences") {
                preferences = { ...d };
                return [preferences];
              }
              if (i.action === "recommend") {
                window.saved.push({ c: "recommend", p: d });
                return [];
              }
              if (i.action === "recommendation_state") {
                window.saved.push({ c: "recommendation_state", p: d });
                recommendations[0].estado = d.estado;
                return [];
              }
              return [];
            }
            if (i.op === "journey") {
              if (window.missingJourney)
                throw "Could not find the function public.clt_journey(p_action, p_data) in the schema cache";
              if(i.action==="stats"&&window.statisticsFixture)return [window.statisticsFixture];
              if (i.action === "stats")
                return [
                  {
                    total: 6,
                    concluidos: 2,
                    horas: 30,
                    jogos: 5,
                    filmes: 1,
                    series: 0,
                    animes: 0,
                    sem_data: 0,
                    months: Array.from({ length: 12 }, (_, n) => ({
                      mes: `2026-${String(n + 1).padStart(2, "0")}`,
                      jogos: n === 9 ? 1 : 0,
                      midias: 0,
                    })),
                  },
                ];
              if (i.action === "progress")
                return [
                  {
                    item_id: "f1",
                    nome: "Filme TMDB",
                    temporada: 1,
                    episodio: 2,
                    total: 10,
                    revision: 1,
                  },
                ];
              window.saved.push({ c: i.action, p: i.data });
              return [
                {
                  item_id: "serie1",
                  nome: "Série de teste",
                  temporada: 1,
                  episodio: 3,
                  total: 10,
                  revision: 2,
                },
              ];
            }
            if (i.op === "profile_bundle")
              return {
                detail: [
                  i.id === "test"
                    ? profile
                    : {
                        ...friend,
                        bio: "Bio do amigo",
                        banner_url: "",
                        jogos_destaque: ["Jogo zerado"],
                      },
                ],
                items: rows,
                ranking: [
                  { id: "test", nome: "Conta de teste", xp: 1000, nivel: 4 },
                  { id: "friend", nome: "Amigo", xp: 400, nivel: 3 },
                ],
              };
            if (i.op === "ranking")
              return [
                { id: "test", nome: "Conta de teste", xp: 1000, nivel: 4 },
              ];
            if (i.op === "prepare_missions") {
              window.missionRows = window.missionRows
                .filter((m) => m.periodo !== i.period)
                .concat(
                  i.ids.map((id, n) => ({
                    id: window.missionRows.length + n + 1,
                    missao_id: id,
                    periodo: i.period,
                    meta: Number(id.slice(-1)),
                    progresso: 0,
                  })),
                );
              return [];
            }
            if (i.op === "missions") return window.missionRows;
            if (i.op === "missions_v2")
              return [
                ["daily-game", "2026-10-14", "add_game", "Nova jornada", "Adicione 1 jogo à biblioteca.", 1, 0, 25],
                ["daily-episode", "2026-10-14", "watch_episode", "Maratona de episódios", "Assista e registre 2 episódios.", 2, 1, 30],
                ["daily-rate", "2026-10-14", "rate_content", "Crítico da caverna", "Avalie 1 título.", 1, 1, 25],
                ["weekly-finish", "semana:2026-10-12", "finish_game", "Missão cumprida", "Finalize 3 jogos.", 3, 1, 120],
                ["weekly-media", "semana:2026-10-12", "finish_media", "Créditos finais", "Conclua 3 filmes, séries ou animes.", 3, 0, 90],
                ["weekly-hours", "semana:2026-10-12", "play_hours", "Tempo de jogo", "Registre 8 novas horas jogadas.", 8, 4, 85],
              ].map(([id, periodo, missao_id, nome, objetivo, meta, progresso, xp]) => ({ id, periodo, missao_id, nome, objetivo, meta, progresso, xp, reivindicada: false }));
            if (i.op === "groups") return window.testGroups||[];
            if (i.op === 'group_messages') return window.testGroupMessages||[];
            if(i.op==='group_send'){window.saved.push({c:'group_send',p:i});await new Promise(r=>setTimeout(r,100));(window.testGroupMessages||=[]).push({id:'g-sent',remetente_id:'test',texto:i.text,created_at:new Date().toISOString()});return {};}

            if (i.op === 'group_manage') { window.saved.push({c:'group_manage',p:i});if(i.action==='members')return window.testGroupMembers||[{user_id:'test',admin:true},{user_id:'member-2',admin:false}];return []; }
            if (i.op === "reactions") return reactions;
            if (i.op === "react") {
              reactions = i.remove
                ? reactions.filter((r) => r.message_id !== i.id)
                : [
                    ...reactions,
                    { message_id: i.id, user_id: "test", emoji: i.emoji },
                  ];
              return {};
            }
            if (i.op === "clear_notifications") {
              notices = [];
              return {};
            }
            if (i.op === "read_notification") {
              const n = notices.find((n) => n.id === i.id);
              if (n) n.read = true;
              return {};
            }
            if (i.op === "read_chat"||i.op==="read_group"){window.saved.push({c:i.op,p:i});return {};}
            if(i.op==='group_read_state')return [{last_read_at:'2026-10-11T00:00:00Z'}];
            if (i.op === "edit_message") {
              messages.find((m) => m.id === i.id).texto = i.text;
              return {};
            }
            if (i.op === "delete_message") {
              messages = messages.filter((m) => m.id !== i.id);
              return {};
            }
            if(i.op==='steam_search'&&i.query==='Jogo zerado')return {results:[{appid:10,nome:'Jogo zerado'}]};
            if(i.op==='steam_search')return {results:[{appid:601150,nome:'Devil May Cry 5',capa:'https://shared.cloudflare.steamstatic.com/header.jpg'},{appid:220440,nome:'DmC: Devil May Cry',capa:'https://shared.cloudflare.steamstatic.com/header.jpg'}]};
            if(i.op==='steam_details'&&window.missingIgdbDetails)throw Error('Catálogo indisponível');
            if (i.op === "steam_details")
              return {
                nome: i.query || "Resultado Steam",
                steam_appid: i.appid||10,
                generos: [{ description: "Ação" }, { description: "Aventura" }],
                descricao: "Descrição do jogo",
                metacritic: { score: 90 },
                platforms: { windows: true },
                desenvolvedores: ["Estúdio de teste"],
                lancamento: "2025",
                screenshots: [
                  {
                    path_full:
                      "https://shared.cloudflare.steamstatic.com/screenshot.jpg",
                  },
                ],
                capa: "https://shared.cloudflare.steamstatic.com/header.jpg",
              };
            if (i.op === "stickers")
              return [
                {
                  id: "s1",
                  name: "Minha figurinha",
                  path: "test/sticker.webp",
                },
              ];
            return [];
          }
          if (c === "realtime_start") return {};
          if (c === "catalog") {
            const i = p.input;
            if(i.provider==='igdb'&&i.query==='Filtro sexual')return {results:[{id:901,name:'Lords of the Fallen',released:'2023-10-13',adult:false,capa_adulta:false,cover_image:'https://images.igdb.com/ordinary-age-18.jpg'},{id:902,name:'Synthetic explicit',adult:true,capa_adulta:true}]};
            if(i.provider==='igdb'&&i.query==='Seleção múltipla')return {results:[{id:401,name:'Primeiro da fila',released:'2025-01-01'},{id:402,name:'Segundo da fila',released:'2024-01-01'}]};
            if(i.provider==='igdb'&&[401,402].includes(i.id))return {id:i.id,name:i.id===401?'Primeiro da fila':'Segundo da fila',released:i.id===401?'2025-01-01':'2024-01-01',genres:[{name:'Action'}]};
            if(i.provider==='igdb'&&i.query==='Teste')return {results:[{id:210,name:'Novo resultado IGDB',steam_appid:210,released:'2025-01-01'}]};
            if(i.provider==='igdb'&&i.id===210)return {id:210,name:'Novo resultado IGDB',steam_appid:210,released:'2025-01-01',genres:[{name:'Action'}]};
            if(i.provider==='igdb'&&i.query==='Edições de teste')return {results:[{id:201,name:'Control',steam_appid:10,released:'2019-08-27',platforms:[{platform:{name:'PC (Microsoft Windows)'}}]},{id:202,name:'Control Ultimate Edition',steam_appid:11,released:'2020-08-27',platforms:[{platform:{name:'PlayStation 5'}}]},{id:203,name:'Duna',released:'2021-01-01',platforms:[{platform:{name:'PC (Microsoft Windows)'}}]}]};
            if(i.provider==='igdb'&&i.id===203)return {id:203,name:'Duna',released:'2021-01-01',genres:[{name:'Action'}]};

            if(i.provider==='igdb'&&i.query==='Red Dead Redemption')return {results:[{id:1,name:'Red Dead Redemption',released:'2010-05-18',cover_image:'https://images.igdb.com/rdr-portrait.jpg',background_image:'https://images.igdb.com/rdr-landscape.jpg'},{id:2,name:'Red Dead Redemption 2',cover_image:'https://images.igdb.com/wrong-sequel.jpg'}]};
            if (i.provider === "igdb" && i.recommend)
              return {
                results: Array.from({ length: 6 }, (_, n) => ({
                  id: 100 + n,
                  name: [
                    "Vale das Sombras",
                    "Horizonte Azul",
                    "Lendas do Norte",
                    "Crônicas de Aurora",
                    "Além do Tempo",
                    "Última Fronteira",
                  ][n],
                  background_image: "https://media.rawg.io/cover" + n + ".jpg",
                  genres: [{ name: "Action" }],
                })),
              };
            if (i.provider === "igdb")
              return i.id
                ? {
                    id: 10,
                    name: "Resultado IGDB",
                    released: "2025-01-01",
                    background_image: "https://media.rawg.io/cover.jpg",
                    genres: [{ name: "Action" }],
                    stores: [{ store: { name: "Steam" } }],
                    description_raw: "Descrição do jogo",
                    steam_appid:10,rating:4.5,ratings_count:100,
                  }
                : {
                    results: [
                      {
                        id: 10,
                        name: i.query==='Jogo zerado'?i.query:"Resultado IGDB",
                        steam_appid:10,
                        background_image: "https://media.rawg.io/cover.jpg",
                      },
                    ],
                  };
            if (i.provider === "tmdb")
              return i.providers
                ? {
                    results: {
                      BR: { flatrate: [{ provider_name: "Netflix" }] },
                    },
                  }
                : i.id
                  ? {
                      id: 20,
                      title: "Filme TMDB",
                      name: i.kind === "tv" ? "Série de teste" : "Série TMDB",
                      release_date: "2024-01-01",
                      poster_path: "/cover.jpg",
                      genres: [{ name: "Aventura" }],
                      overview: "Descrição",
                      seasons:
                        i.kind === "tv"
                          ? [
                              {
                                season_number: 1,
                                episode_count: 10,
                                name: "Temporada 1",
                              },
                            ]
                          : undefined,
                    }
                  : {
                      results:
                        i.kind === "tv"
                          ? [{ id: 20, name: "Série de teste", poster_path: "/series-cover.jpg" }]
                          : [
                              {
                                id: 20,
                                title: "Filme TMDB",
                                name: "Série TMDB",
                                poster_path: "/movie-cover.jpg",
                              },
                            ],
                    };
            if (i.provider === "anilist")
              return {
                data: {
                  Page: {
                    media: [
                      {
                        id: 30,
                        isAdult: false,
                        title: { english: "Anime de teste" },
                        startDate: { year: 2024 },
                        coverImage: {
                          large: "https://s4.anilist.co/anime.jpg",
                        },
                        genres: ["Action"],
                        description: "Anime",
                      },
                    ],
                  },
                },
              };
          }
          if (c === "feed")
            return [
              {
                id: "post1",
                user_id:friend.id,midias:["community/post.png"],
                texto: "Publicação",
                author: {
                  ...friend,
                  avatar_url: window.slowSocialMedia
                    ? "social-avatar/slow-test.webp"
                    : "social-avatar/test.webp",
                },
                created_at: "2026-10-11",
              },
            ];
          if (c === "social_meta")
            return { userId: "test", likes: [], comments: [] };
          return [];
        },
      },
    };
  });
  const benchmarkBoot=performance.now();
  await page.goto(origin);
  await page.locator(".home-hero-content h2").waitFor();
  if(process.env.BAT_LIBRARY_BENCHMARK){await benchmarkLibrary(page,process.env.BAT_LIBRARY_BENCHMARK,performance.now()-benchmarkBoot);}else{
  // Settings search only locates categories and preserves the currently open controls.
  await page.locator('#mainNav [data-view="settings"]').click();
  await page.locator('.settings-search-label input').fill('SENHA');
  assert.equal(await page.locator('.settings-menu-group button:visible').count(),1);
  assert.equal(await page.locator('[data-settings-tab="account"]').isVisible(),true);
  await page.locator('[data-settings-tab="account"]').click();
  assert.equal(await page.locator('.settings-section-heading h2').innerText(),'Conta');
  await page.locator('[data-settings-tab="integrations"]').click();
  await page.locator('#steamConnection input').fill('76561198000000001');
  await page.locator('.settings-search-label input').fill('NOTIFICAÇÕES');
  assert.equal(await page.locator('[data-settings-tab="notifications"]').isVisible(),true);
  assert.equal(await page.locator('#steamConnection input').inputValue(),'76561198000000001');
  await page.locator('.settings-search-label input').fill('nada-com-este-nome');
  await page.locator('.settings-search-empty').waitFor();
  assert.equal(await page.locator('#steamConnection input').inputValue(),'76561198000000001');
  await page.locator('.settings-search-label input').fill('');
  await page.locator('[data-settings-tab="privacy"]').click();
  assert.equal(await page.locator('.settings-section-heading h2').innerText(),'Privacidade');
  await page.locator('#goFriends').waitFor();
  await page.locator('[data-settings-tab="app"]').click();
  assert.equal(await page.locator('.settings-section-links button').count(),4);
  const settingsViewport=page.viewportSize();
  await page.locator('.list-mosaic img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  for(const width of [1920,1280,820]){
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.locator('.settings-studio').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'Configurações devem caber na janela '+width);
    await page.screenshot({path:'preview/settings-'+width+'.png',animations:'disabled'});
  }
  await page.setViewportSize(settingsViewport);
  await page.evaluate(async()=>await navigate('home'));
  // The dashboard exposes the existing totals and keeps actions after a return visit.
  assert.equal(await page.locator('.studio-welcome').count(),1);
  assert.equal(await page.locator('.studio-metrics>article').count(),4);
  assert.equal(await page.locator('.studio-metric-icon svg').count(),4);
  const dashboardCounts=await page.locator('.studio-metrics strong').allTextContents();
  await page.locator('.studio-add').click();
  await page.locator('.item-editor-modern').waitFor();
  await page.locator('.item-editor-modern [data-close]').first().click();
  await page.evaluate(async()=>await navigate('home'));
  assert.equal(await page.locator('.studio-welcome').count(),1);
  assert.deepEqual(await page.locator('.studio-metrics strong').allTextContents(),dashboardCounts);
  // Read retries retain the collection context and never repeat a save.
  const feedbackSavedBefore=await page.evaluate(()=>window.saved.filter(x=>x.c==='save_item').length);
  await page.evaluate(()=>{state.libraryCategory='jogos';window.delayLibrary=true;window.libraryDelay=900;void navigate('library')});
  await page.locator('.library-loading').waitFor();
  assert.equal(await page.locator('.screen-skeleton-card').count(),6);
  assert.equal(await page.locator('.screen-skeleton-grid').getAttribute('aria-hidden'),'true');
  await page.screenshot({path:'preview/library-loading-check.png',animations:'disabled'});
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.screen-skeleton-art').first().evaluate(el=>getComputedStyle(el).animationName),'none');
  await page.locator('#librarySearch').waitFor();
  await page.evaluate(()=>window.delayLibrary=false);
  await page.locator('#librarySearch').fill('Jogo');
  await page.locator('#librarySort').selectOption('hours');
  await page.evaluate(async()=>{window.libraryFailure=true;await navigate('library')});
  await page.locator('.screen-state-error').waitFor();
  await page.screenshot({path:'preview/read-error-check.png',animations:'disabled'});
  await page.evaluate(()=>window.libraryFailure=false);
  await page.locator('.screen-state-error button').click();
  await page.locator('#librarySearch').waitFor();
  assert.equal(await page.locator('#librarySearch').inputValue(),'Jogo');
  assert.equal(await page.locator('#librarySort').inputValue(),'hours');
  assert.equal(await page.evaluate(()=>window.saved.filter(x=>x.c==='save_item').length),feedbackSavedBefore);
  await page.locator('#librarySearch').fill('nenhum-titulo-com-este-nome');
  await page.locator('.screen-state-empty h3').filter({hasText:'Nenhum resultado por aqui'}).waitFor();
  await page.locator('.screen-state-empty button').click();
  assert.equal(await page.locator('#librarySearch').inputValue(),'');
  assert.equal(await page.locator('#librarySort').inputValue(),'hours');
  await page.evaluate(async()=>{window.catalogLibraryRows=[];await navigate('library')});
  await page.locator('.screen-state-empty h3').filter({hasText:'Sua coleção começa aqui'}).waitFor();
  await page.screenshot({path:'preview/empty-library-check.png',animations:'disabled'});
  await page.locator('.screen-state-empty button').click();
  await page.locator('.item-editor-modern').waitFor();
  await page.locator('.item-editor-modern [data-close]').first().click();
  await page.evaluate(async()=>{delete window.catalogLibraryRows;state.librarySort='recent';await navigate('home')});
  await page.emulateMedia({reducedMotion:'no-preference'});
  assert.equal(await page.locator('.journey-progress progress').getAttribute('value'),'25');
  assert.match(await page.locator('.journey-progress').innerText(),/25%/);
  assert.equal(await page.locator('.friend-activity').count(),0);
  await page.locator(".recommendation-row .cover-wrap").first().waitFor();
  const formatCover = page.locator(".recommendation-row .cover-wrap").first();
  let formatBox = await formatCover.boundingBox();
  assert.ok(
    formatBox.height > formatBox.width * 1.4,
    "O formato vertical deve exibir a capa em proporção de pôster.",
  );
  await page.evaluate(() => {
    document.body.dataset.cardFormat = "landscape";
  });
  formatBox = await formatCover.boundingBox();
  assert.ok(
    formatBox.width > formatBox.height * 1.6,
    "O formato horizontal deve exibir a capa em proporção widescreen.",
  );
  await page.evaluate(() => {
    document.body.dataset.cardFormat = "poster";
    document.documentElement.style.setProperty("--reference-card-width", "420px");
  });
  assert.ok(
    (await page.locator(".recommendation-row .cinema-card").first().boundingBox()).width >= 400,
    "A largura configurada em Aparência deve dimensionar os cards do início.",
  );
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--reference-card-width", "300px");
  });
  const visualSystem = await page.evaluate(() => {
    const sidebar = getComputedStyle(document.querySelector(".sidebar"));
    const activeNavigation = getComputedStyle(
      document.querySelector(".sidebar nav button.active"),
    );
    const card = getComputedStyle(document.querySelector(".reference-card"));
    return {
      sidebarBackground: sidebar.backgroundColor,
      navigationBorder: activeNavigation.borderColor,
      cardRadius: card.borderRadius,
    };
  });
  assert.notEqual(visualSystem.sidebarBackground, "rgba(0, 0, 0, 0)");
  assert.notEqual(visualSystem.navigationBorder, "rgba(0, 0, 0, 0)");
  assert.notEqual(visualSystem.cardRadius, "0px");
  await page.keyboard.press("Tab");
  await page.locator(".home-hero-content .primary").focus();
  assert.equal(
    await page.locator(".home-hero-content .primary").evaluate(
      (button) => getComputedStyle(button).outlineStyle,
    ),
    "solid",
    "A navegação por teclado deve exibir um foco visível.",
  );
  await page.locator(".home-hero-content .primary").evaluate((button) => button.blur());
  assert.equal(await page.locator('#mainNav [data-view="game-feed"]').count(),1);
  assert.equal(await page.locator(".ranking-podium").count(), 1);
  await page.locator("#updateToast [data-update-later]").click({ timeout: 15000 });
  assert.equal(await page.locator("#updateToast").count(), 0);
  assert.match(await page.locator("#updateLink").innerText(), /Atualizar para/);
  assert.equal(
    (await page.locator(".home-hero-content h2").innerText()).toLowerCase(),
    "jogo em progresso",
  );
  assert.equal(
    await page.locator("#initialPatchNotes,.initial-patch-notes").count(),
    0,
  );
  assert.equal(
    await page.locator(".dashboard-columns").evaluate((n) => n.children.length),
    1,
  );
  await page.getByRole('heading',{name:'Continuar de onde parei',exact:true}).waitFor();
  await page.locator('.continuity-card').filter({hasText:'Série de teste'}).waitFor();
  await page.waitForFunction(()=>document.querySelector('.continuity')?.textContent.includes('Temporada 1 · Episódio 2'));
  assert.equal(await page.locator('.continuity-card').filter({hasText:'Jogo zerado'}).count(),0);
  await page.locator('[data-resume-filter="series"]').click();
  assert.equal(await page.locator('.continuity-card').filter({hasText:'Jogo em progresso'}).count(),0);
  await page.locator('.continuity-card').filter({hasText:'Série de teste'}).waitFor();
  await page.locator('[data-resume-filter="filmes"]').click();
  await page.getByText('Nenhum título em andamento nesta categoria.',{exact:true}).waitFor();
  await page.locator('[data-resume-filter="all"]').click();
  const resumeGame=page.locator('.continuity-card').filter({hasText:'Jogo em progresso'});
  await resumeGame.getByRole('button',{name:'Alterar status',exact:true}).click();
  await page.evaluate(()=>window.failHomeStatus=true);
  await resumeGame.getByRole('button',{name:'Salvar status',exact:true}).click();
  await resumeGame.locator('[role="status"]').filter({hasText:'mudou em outra tela'}).waitFor();
  assert.equal(await resumeGame.count(),1);
  const statusCall=await page.evaluate(()=>window.saved.find(x=>x.c==='set_home_status').p);
  assert.deepEqual(Object.keys(statusCall).sort(),['category','expected','id','status']);
  await page.evaluate(()=>window.failHomeStatus=false);
  await page.locator('[data-resume-filter="all"]').click();
  const resumeSeries=page.locator('.continuity-card').filter({hasText:'Série de teste'});
  await resumeSeries.getByRole('button',{name:'Atualizar episódios',exact:true}).click();
  await page.locator('.episode-progress [data-progress-action="next_episode"]').click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.continuity-meta')].some(n=>n.textContent.includes('Episódio 3')));
  await page.locator('.episode-progress [data-close]').click();
  await page.locator('.continuity').screenshot({path:'preview/home-resume-check.png'});
  await resumeSeries.getByRole('button',{name:'Alterar status',exact:true}).click();
  await resumeSeries.getByRole('button',{name:'Salvar status',exact:true}).click();
  await resumeSeries.waitFor({state:'detached'});
  assert.ok(await page.evaluate(()=>window.saved.filter(x=>x.c==='set_home_status').length===2));
  await page.getByRole('button',{name:'Escolher destaque',exact:true}).click();
  const highlight=page.locator('[data-highlight]');
  assert.equal(await highlight.inputValue(),'');
  await highlight.selectOption({label:'Jogo em progresso'});
  await page.locator('[data-save-highlight]').click();
  await page.locator('.highlight-picker').waitFor({state:'detached'});
  await page.getByRole('button',{name:'Escolher destaque',exact:true}).click();
  assert.notEqual(await page.locator('[data-highlight]').inputValue(),'');
  await page.locator('[data-highlight]').selectOption('');
  await page.locator('[data-save-highlight]').click();
  await page.locator('.continuity-card').filter({hasText:'Jogo em progresso'}).getByRole('button',{name:'Ver detalhes',exact:true}).click();
  await page.locator('.detail-title-row h2').filter({hasText:'Jogo em progresso'}).waitFor();
  await page.getByRole('button',{name:'Editar informações',exact:false}).click();
  assert.equal(await page.locator('[data-play-hours]').inputValue(),'3');
  assert.equal(await page.locator('[data-play-minutes]').inputValue(),'47');
  assert.equal(await page.locator('[name="horas"]').inputValue(),'3.775');
  await page.locator('[data-play-minutes]').fill('30');
  assert.equal(await page.locator('[name="horas"]').inputValue(),'3.5');
  await page.locator('.editor-overlay [data-close]').first().click();
  await page.locator('.continuity-card').filter({hasText:'Jogo em progresso'}).getByRole('button',{name:'Ver detalhes',exact:true}).click();
  await page.locator('.detail-title-row h2').filter({hasText:'Jogo em progresso'}).waitFor();

  await page.locator('.reference-detail [data-close]').click();
  // Feedback follows real selection and task state; reduced motion stays static.
  await page.locator('#mainNav [data-collection="animes"]').click();
  await page.locator('#librarySearch').waitFor();
  await page.waitForFunction(()=>{const m=document.querySelector('.nav-motion-marker'),a=document.querySelector('#mainNav button.active');return m&&a&&!m.hidden&&Math.abs(m.getBoundingClientRect().top-a.getBoundingClientRect().top)<4});
  const marker=await page.locator('.nav-motion-marker').boundingBox(),selectedNav=await page.locator('#mainNav button.active').boundingBox();
  assert.ok(marker&&Math.abs(marker.y-selectedNav.y)<4,'O marcador deve acompanhar o item selecionado');
  await page.evaluate(()=>{const f=document.createElement('form');f.id='motion-test';f.innerHTML='<p class="form-error"></p>';document.body.append(f);window.BatMotion.uploadState(f,'pending')});
  assert.equal(await page.locator('#motion-test [role="progressbar"]').getAttribute('aria-valuenow'),null,'Envio indeterminado não inventa porcentagem');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.ok(await page.locator('.nav-motion-marker').evaluate(n=>parseFloat(getComputedStyle(n).transitionDuration)<=.001));
  assert.equal(await page.locator('.save-feedback-track').evaluate(n=>getComputedStyle(n,'::after').animationName),'none');
  await page.evaluate(()=>window.BatMotion.uploadState(document.querySelector('#motion-test'),'error'));
  assert.equal(await page.locator('#motion-test [role="progressbar"]').count(),0,'Erro deve interromper progresso');
  await page.evaluate(()=>{toast('Favorito salvo.');window.BatMotion.favoriteSaved()});
  assert.equal(await page.locator('#toast').evaluate(n=>n.classList.contains('favorite-confirmed')),true);
  await page.evaluate(()=>toast('Outra mensagem'));
  assert.equal(await page.locator('#toast').evaluate(n=>n.classList.contains('favorite-confirmed')),false,'Confirmação não deve vazar para a próxima mensagem');
  await page.evaluate(()=>document.querySelector('#motion-test').remove());
  // Functional flows below stay stable; motion itself was checked above.
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(async()=>{state.libraryCategory='jogos';await navigate('home')});
  // Card feedback must preserve cover geometry, adjacent layout and reduced motion.
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('#mainNav [data-collection="jogos"]').click();
  await page.locator('#libraryGroups .reference-card').first().waitFor();
  await page.evaluate(async()=>await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{}))));
  const libraryCard=page.locator('#libraryGroups .reference-card').first();
  const previousFormat=await page.locator('body').getAttribute('data-card-format');
  for(const [format,ratio] of [['poster',2/3],['landscape',16/9]]){
    await page.evaluate(format=>document.body.dataset.cardFormat=format,format);
    const art=await libraryCard.locator('.cover-wrap').boundingBox(),card=await libraryCard.boundingBox(),title=await libraryCard.locator('h3').boundingBox(),status=await libraryCard.locator('.card-status').boundingBox();
    assert.ok(Math.abs(art.width/art.height-ratio)<.03,'Preservar proporção da capa');
    assert.ok(title.y>=art.y+art.height-1&&status.y+status.height<=card.y+card.height+1,'Informações fora da capa e dentro do cartão');
  }
  await page.evaluate(format=>document.body.dataset.cardFormat=format,previousFormat);
  await page.keyboard.press('Tab');await libraryCard.focus();assert.equal(await libraryCard.evaluate(n=>getComputedStyle(n).outlineStyle),'solid');
  await page.evaluate(async()=>await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{}))));
  const nextCard=page.locator('#libraryGroups .reference-card').nth(1),nextBefore=await nextCard.boundingBox();
  await libraryCard.hover();
  await page.evaluate(async()=>await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{}))));
  const nextAfter=await nextCard.boundingBox();assert.ok(Math.abs(nextAfter.y-nextBefore.y)<1&&Math.abs(nextAfter.x-nextBefore.x)<1,'Hover não desloca vizinhos');
  await page.screenshot({path:'preview/library-cards-finish.png',animations:'disabled'});
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await libraryCard.evaluate(n=>getComputedStyle(n).transform),'none');
  await page.evaluate(async()=>{state.libraryCategory='jogos';await navigate('home')});
  // Windowed layouts must keep actions below metrics, including compact mode and UI scaling.
  for(const compact of [false,true]) {
    if((await page.locator('.sidebar-toggle').getAttribute('aria-expanded')==='false')!==compact)await page.locator('.sidebar-toggle').click();
    for(const [width,scale] of [[1100,1],[1280,1.25],[1440,1]]) {
      await page.setViewportSize({width,height:720});
      await page.evaluate(scale=>document.documentElement.style.setProperty('--ui-scale',String(scale)),scale);
      for(const category of ['jogos','animes']) {
        await page.evaluate(async category=>{state.libraryCategory=category;await navigate('library')},category);
        const hero=await page.locator('#libraryCollectionHero').boundingBox(),add=await page.locator('#addItem').boundingBox(),metrics=await page.locator('.library-hero-metrics').boundingBox();
        assert.ok(add.y>=hero.y+hero.height-1,`Adicionar sobrepõe resumo: ${category}, ${width}px, escala ${scale}, compacto ${compact}`);
        assert.ok(metrics.x+metrics.width<=hero.x+hero.width+1);
        const contentBounds=await page.locator('#content').boundingBox();
        assert.ok(add.x+add.width<=contentBounds.x+contentBounds.width+1);
        for(const field of await page.locator('.library-controls input,.library-controls select').all()){const bounds=await field.boundingBox();assert.ok(bounds.x+bounds.width<=contentBounds.x+contentBounds.width+1,'Filtro fora do conteúdo');}
        const longList=width===1280&&category==='animes';
        if(longList)await page.evaluate(()=>window.layoutNotices=Array.from({length:30},(_,i)=>({id:'layout-'+i,tipo:'mensagem',mensagem:'Mensagem com um título extenso para verificar a quebra de linha e a rolagem das notificações.',created_at:'2026-11-06T12:00:00Z',read:false})));
        await page.locator('#notificationBell').click();
        await page.locator('#notificationPopup header').waitFor();
        const popup=await page.locator('#notificationPopup').boundingBox(),side=await page.locator('.sidebar').boundingBox();
        assert.ok(popup.x>=side.x+side.width-1);
        assert.ok(popup.x+popup.width<=width&&popup.y+popup.height<=720);
        if(longList){const list=page.locator('#notificationPopup .notification-list');assert.ok(await list.evaluate(n=>n.scrollHeight>n.clientHeight));const close=await page.locator('#closeNotifications').boundingBox();assert.ok(close.y+close.height<=popup.y+popup.height);}
        if(width===1280&&category==='animes')await page.screenshot({path:`preview/windowed-animes-${compact?'compact':'expanded'}.png`,animations:'disabled'});
        await page.locator('#closeNotifications').click();
        await page.evaluate(()=>window.layoutNotices=null);
      }
    }
  }
  await page.setViewportSize({width:1920,height:1080});
  await page.locator('.sidebar-toggle').click();
  await page.evaluate(async()=>{document.documentElement.style.setProperty('--ui-scale','1');state.libraryCategory='jogos';await navigate('home')});
  for (const [width, height, name] of [
    [1920, 1080, "home-check.png"],
    [2560, 1440, "home-qhd-check.png"],
    [1280, 720, "home-hd-check.png"],
  ]) {
    await page.setViewportSize({ width, height });
    const hero = await page.locator(".home-hero").boundingBox(), dashboard = await page.locator(".dashboard-columns").boundingBox();
    assert.equal(await page.locator('.hero-activity,.cavern-recent').count(),0,'Activities belong in the feed.');
    assert.equal(await page.locator('#mainNav [data-view="game-feed"]').count(),1);
    assert.ok(
      dashboard.height < 460,
      `Início alto demais em ${width}px: ${Math.round(dashboard.height)}px`,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    const welcome=await page.locator('.studio-welcome').boundingBox(),metrics=await page.locator('.studio-metrics').boundingBox(),continuity=await page.locator('.continuity').boundingBox();
    assert.ok(welcome.y+welcome.height<=hero.y+1,'A saudação deve vir antes do destaque');
    assert.ok(metrics.y>=hero.y+hero.height,'Indicadores devem vir depois do destaque');
    assert.ok(metrics.y+metrics.height<=continuity.y+1,'Indicadores devem anteceder a continuação');
    for(const card of await page.locator('.studio-metrics>article').all()){
      assert.equal(await card.evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'Indicador não deve ultrapassar o cartão');
    }
    await page.screenshot({ path: "preview/" + name });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.locator(".ranking-showcase").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "preview/ranking-check.png" });
  assert.equal(await page.locator(".topbar .account").isVisible(), false);
  assert.equal(await page.locator("#sidebarAccount").isVisible(), true);
  assert.match(
    await page.locator("#sidebarAccount").innerText(),
    /Conta de teste/,
  );
  await page.locator('[data-view="lists"]').click();
  await page.locator('[data-list="list1"]').waitFor();
  assert.match(
    await page.locator('[data-list="list1"]').innerText(),
    /Fim de semana/,
  );
  assert.equal(await page.locator('.list-studio-card').count(),3);
  assert.equal(await page.locator('[data-list="friend-list"] .list-visibility').innerText(),'Compartilhada com amigos');
  await page.locator('#listSearch').fill('JOAO ficcao');
  assert.equal(await page.locator('.list-studio-card').count(),1);
  await page.locator('[data-list-scope="mine"]').click();
  assert.equal(await page.locator('.list-studio-card').count(),0);
  await page.locator('.lists-empty button').click();
  assert.equal(await page.locator('.list-studio-card').count(),3);
  for(const width of [1920,1280,820]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`preview/lists-${width}.png`,animations:'disabled'});assert.equal(await page.locator('.lists-studio').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);}
  await page.setViewportSize({width:1920,height:1000});
  await page.locator('#listSearch').fill('Fim');
  await page.locator('[data-list="list1"]').click();
  await page.locator(".journey-title-card").waitFor();
  assert.match(
    await page.locator(".journey-title-card").innerText(),
    /Jogo zerado/,
  );
  await page.locator('#backLists').click();
  assert.equal(await page.locator('#listSearch').inputValue(),'Fim');
  assert.equal(await page.locator('.list-studio-card').count(),1);
  await page.locator('#listSearch').fill('');
  await page.locator('[data-view="recommendations"]').click();
  await page.locator(".recommendation-card").waitFor();
  await page.locator('#recommendCategory').selectOption('Filme');
  assert.equal(await page.locator('.recommendation-card').count(),0);
  await page.locator('#recommendCategory').selectOption('');
  await page.locator('#recommendSearch').fill('inexistente-123');
  assert.equal(await page.locator('.recommendation-card').count(),0);
  await page.locator('#recommendSearch').fill('');
  await page.screenshot({path:'preview/recommendations-check.png'});
  await page.locator('#newRecommendation').click();
  await page.locator('.journey-dialog-form [name="item"]').waitFor();
  await page.locator('.journey-dialog-form [name="category"]').selectOption('Jogo');
  await page.locator('.journey-dialog-form [name="titleSearch"]').fill('zerado');
  assert.ok((await page.locator('.journey-dialog-form [name="item"] option').allTextContents()).every(t=>/zerado/i.test(t)&&/Jogo/.test(t)));
  await page.locator('.journey-dialog-form [name="titleSearch"]').fill('inexistente-123');
  assert.equal(await page.locator('.journey-dialog-form button.primary').isEnabled(),false);
  await page.locator('.journey-dialog-form [name="titleSearch"]').fill('');
  await page.locator('.recommend-composer').evaluate(n=>Promise.all(n.getAnimations({subtree:true}).map(a=>a.finished)));
  const composerBounds=await page.locator('.recommend-composer').boundingBox(),composerDialogBounds=await page.locator('.journey-dialog').boundingBox();
  assert.ok(composerBounds.x>=composerDialogBounds.x-1&&composerBounds.x+composerBounds.width<=composerDialogBounds.x+composerDialogBounds.width+1,'Compositor deve caber na janela externa');
  await page.screenshot({path:'preview/recommendation-composer-check.png',animations:'disabled'});
  await page.locator('.journey-dialog-form button.primary').click();
  await page.waitForFunction(()=>window.saved.some(s=>s.c==='recommend'&&s.p.item_id));
  await page.locator(".recommendation-card").waitFor();
  assert.match(
    await page.locator(".recommendation-card").innerText(),
    /Você vai gostar/,
  );
  await page.locator('[data-rec-interest="rec1"]').click();
  await page.locator(".editor-overlay form").waitFor();
  assert.equal(
    await page.locator('.editor-overlay [name="nome"]').inputValue(),
    "Indicação nova",
  );
  await page.locator(".editor-overlay button.primary").click();
  await page.waitForFunction(() =>
    window.saved.some(
      (s) => s.c === "save_item" && s.p.item.nome === "Indicação nova",
    ),
  );
  const accepted = await page.evaluate(
    () =>
      window.saved.find(
        (s) => s.c === "save_item" && s.p.item.nome === "Indicação nova",
      ).p.item,
  );
  assert.equal(accepted.id, undefined);
  assert.equal(accepted.user_id, undefined);
  assert.equal(accepted.horas, null);
  assert.equal(accepted.status, "📌 Backlog");
  await page.waitForFunction(() =>
    window.saved.some(
      (s) =>
        s.c === "recommendation_state" &&
        s.p.id === "rec1" &&
        s.p.estado === "interesse",
    ),
  );
  await page.locator('[data-view="recommendations"]').click();
  await page.locator("#recommendationRows").waitFor();
  assert.equal(await page.locator(".recommendation-card").count(), 0);
  for (const [tipo, category] of [
    ["filme", "filmes"],
    ["serie", "series"],
    ["anime", "animes"],
  ]) {
    await page.evaluate(
      (tipo) =>
        (window.testRecommendations = [
          {
            id: "new-" + tipo,
            received: true,
            estado: "enviada",
            titulo: {
              id: "sender-id",
              user_id: "friend",
              nome: "Indicação " + tipo,
              categoria: "filmes",
              tipo,
              status: "✅ Concluído",
              nota: 10,
            },
          },
        ]),
      tipo,
    );
    await page.locator('[data-view="recommendations"]').click();
    await page.locator("[data-rec-interest]").click();
    await page.locator('.editor-overlay [name="nome"]').waitFor();
    assert.equal(
      await page.locator('.editor-overlay [name="tipo"]').inputValue(),
      tipo,
    );
    assert.equal(
      await page.locator('.editor-overlay [name="status"]').inputValue(),
      "⏳ Para Assistir",
    );
    await page.locator(".editor-overlay button.primary").click();
    await page.waitForFunction(
      (tipo) =>
        window.saved.some(
          (s) => s.c === "save_item" && s.p.item.nome === "Indicação " + tipo,
        ),
      tipo,
    );
    const media = await page.evaluate(
      (tipo) =>
        window.saved.find(
          (s) => s.c === "save_item" && s.p.item.nome === "Indicação " + tipo,
        ).p.item,
      tipo,
    );
    assert.equal(media.id, undefined);
    assert.equal(media.categoria, "filmes");
    assert.equal(media.nota, null);
  }
  await page.evaluate(() => (window.testRecommendations = null));
  await page.evaluate(async()=>await navigate('statistics'));
  await page.locator(".statistics-summary").waitFor();
  assert.equal(await page.locator(".sidebar").evaluate((n) => n.scrollTop), 0);
  assert.match(await page.locator(".statistics-summary").innerText(), /30h/);
  assert.equal(await page.locator(".bar-chart>div").count(), 12);
  await page.locator('[data-stats-span="6"]').click();
  assert.equal(await page.locator('.bar-chart>div').count(),6);
  assert.match(await page.locator('.statistics-summary').innerText(),/30h/);
  await page.locator('[data-stats-month="2026-10"]').click();
  assert.match(await page.locator('.stats-month-detail').innerText(),/outubro de 2026/);
  assert.match(await page.locator('.stats-month-detail').innerText(),/1 jogo ·/);
  await page.locator('[data-stats-span="12"]').click();
  assert.equal(await page.locator('.bar-chart>div').count(),12);
  const statsViewport=page.viewportSize();
  for(const width of [1920,1280,820]){
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.locator('.statistics-studio').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'Estatísticas devem caber na janela '+width);
    await page.screenshot({path:'preview/statistics-'+width+'.png',animations:'disabled'});
  }
  await page.setViewportSize(statsViewport);
  await page.screenshot({ path: "preview/journey-check.png" });
  await page.evaluate(() => (window.missingJourney = true));
  await page.evaluate(async()=>await navigate('statistics'));
  await page.locator(".statistics-summary").waitFor();
  assert.match(await page.locator(".statistics-summary").innerText(), /33,8h/);
  assert.equal(await page.locator(".bar-chart>div").count(), 12);
  await page.evaluate(async()=>{window.missingJourney=false;window.statisticsFixture={total:0,concluidos:0,horas:0,months:[]};await navigate('statistics')});
  await page.locator('.stats-empty').waitFor();
  assert.equal(await page.locator('[data-stats-month]').count(),0);
  assert.match(await page.locator('.stats-chart-empty').innerText(),/houver dados mensais/);
  await page.locator('[data-stats-explore]').click();
  await page.locator('#librarySearch').waitFor();
  await page.evaluate(()=>delete window.statisticsFixture);
  await page.locator('#mainNav [data-view="settings"]').click();
  await page.locator('[data-settings-tab="notifications"]').click();
  await page.locator("#openNotificationPreferences").click();
  await page.locator("#preferenceForm").waitFor();
  await page.locator('#preferenceForm [name="social"]').uncheck();
  await page.locator("#preferenceForm button.primary").click();
  await page.locator("#preferenceForm").waitFor();
  assert.equal(
    await page.locator('#preferenceForm [name="social"]').isChecked(),
    false,
  );
  assert.equal(await page.locator('#mainNav [data-view="social"]').count(),0,'A Comunidade deve permanecer oculta enquanto estiver desativada.');
  await page.evaluate(async()=>await navigate('social'));
  await page.locator('.friends-compact,.reference-friends,.friend-grid').first().waitFor();
  await page.locator('#mainNav [data-view="game-feed"]').click();
  await page.locator('.game-feed-card').first().waitFor();
  assert.equal(await page.locator('.game-feed-card').count(),20);
  await page.locator('[data-feed-like]').first().click();
  await page.waitForFunction(()=>document.querySelector('[data-feed-like]')?.getAttribute('aria-pressed')==='true');
  await page.locator('[data-feed-like]').first().click();
  await page.waitForFunction(()=>document.querySelector('[data-feed-like]')?.getAttribute('aria-pressed')==='false');
  await page.locator('[data-feed-more]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.game-feed-card').length===22);
  assert.equal(await page.locator('[data-feed-more]').isHidden(),true);
  await page.locator('[data-feed-details]').first().click();
  await page.locator('.reference-detail').waitFor();
  assert.equal(await page.locator('[data-feed-detail-add]').count(),1);
  assert.equal(await page.locator('#editInformation').count(),0);
  await page.locator('.detail-close').click();
  for(const width of [1920,1280,1024]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`preview/game-feed-${width}.png`,animations:'disabled'});}
  await page.setViewportSize({width:1920,height:1080});
  await page.locator('[data-share-game]').click();
  await page.locator('[data-game-choice]').first().waitFor();
  await page.locator('[data-game-choice]').first().click();
  await page.locator('[data-share-action]').selectOption('started');
  await page.locator('[data-share-submit]').click();
  await page.waitForFunction(()=>document.querySelector('[data-game-feed-list] .game-feed-card')?.dataset.feedId==='9999');
  await page.locator('[data-feed-delete]').click();
  await page.locator('.app-confirm-dialog [data-confirm]').click();
  await page.waitForFunction(()=>!document.querySelector('[data-feed-id="9999"]'));
  await page.locator('[data-feed-add]').first().click();
  await page.locator('.editor-overlay form').waitFor();
  assert.equal(await page.locator('.editor-overlay form [name="nome"]').inputValue(),'Prince of Persia');
  assert.match(await page.locator('.editor-overlay form header').innerText(),/Adicionar/i);
  assert.equal(await page.locator('.editor-overlay form [name="id"]').count(),0);
  await page.locator('.editor-overlay [data-close]').first().click();
  await page.evaluate(async()=>{window.delayFeed=true;const pending=navigate('game-feed');await navigate('friends');await pending;delete window.delayFeed;});
  assert.equal(await page.locator('.game-feed-card').count(),0,'Delayed feed must not overwrite another screen.');
  await page.locator('[data-view="home"]').click();
  await page.evaluate(() => (window.delayLibrary = true));
  await page.locator('[data-view="library"]').click();
  await page.locator("#sidebarAccount").click();
  await page.locator(".complete-profile").waitFor();
  await page.waitForTimeout(200);
  assert.equal(await page.locator(".complete-profile").count(), 1);
  assert.equal(await page.locator("#libraryGroups").count(), 0);
  await page.evaluate(() => (window.delayLibrary = false));
  await page.locator('[data-view="library"]').click();
  await page.locator("#libraryGroups").waitFor();
  await page.waitForTimeout(800);
  const featured=page.locator('.cavern-featured-card').first();
  if(await featured.count()){
    let bounds=await featured.boundingBox();assert.ok(bounds.height>bounds.width*1.4,'Destaques devem seguir o formato vertical');
    await page.evaluate(()=>document.body.dataset.cardFormat='landscape');
    bounds=await featured.boundingBox();assert.ok(bounds.width>bounds.height*1.6,'Destaques devem seguir o formato horizontal');
    await page.evaluate(()=>document.body.dataset.cardFormat='poster');
  }
  await page.screenshot({ path: "preview/library-check.png" });
  const libraryLeftEdges = await page.evaluate(() =>
    ["#libraryCollectionHero", ".library-controls", "#libraryGroups"].map(
      (selector) =>
        Math.round(document.querySelector(selector).getBoundingClientRect().left),
    ),
  );
  assert.ok(
    Math.max(...libraryLeftEdges) - Math.min(...libraryLeftEdges) <= 1,
    `Biblioteca desalinhada: ${libraryLeftEdges.join(", ")}`,
  );
  await page.evaluate(() => {
    window.failCoverImage = true;
    window.mediaCallsBeforePublicCoverFallback = window.mediaCalls;
    const root = document.createElement("div");
    root.innerHTML =
      '<img data-cover="https://media.rawg.io/failing-cover-smoke-test.jpg" data-cover-name="Falha simulada" data-cover-game="0">';
    document.body.append(root);
    window.coverFailureRoot = root;
    hydrateCovers(root);
    root.querySelector("img").dispatchEvent(new Event("error"));
  });
  await page.waitForFunction(() => window.coverFailureCalls > 0);
  assert.equal(
    await page.evaluate(() => window.mediaCalls),
    await page.evaluate(() => window.mediaCallsBeforePublicCoverFallback),
    "O fallback de uma capa pública não deve tentar assiná-la como mídia privada.",
  );
  await page.evaluate(() => {
    window.coverFailureRoot.remove();
    window.failCoverImage = false;
  });
  const failures = await page.evaluate(() => window.coverFailureCalls);
  await page.evaluate(() => {
    const root = document.createElement("div");
    root.innerHTML =
      '<img data-cover="https://media.rawg.io/failing-cover-smoke-test.jpg" data-cover-name="Falha simulada" data-cover-game="0">';
    document.body.append(root);
    hydrateCovers(root);
    root.remove();
  });
  await page.waitForTimeout(100);
  assert.equal(
    await page.evaluate(() => window.coverFailureCalls),
    failures,
    "Uma capa com falha recente não deve ser requisitada novamente.",
  );
  await page.route("https://example.test/direct-cover.jpg", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
    }),
  );
  const directCoverCalls = await page.evaluate(async () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<img data-cover="https://example.test/direct-cover.jpg" data-cover-name="Capa direta">';
    document.body.append(root);
    const before = window.coverCalls;
    hydrateCovers(root);
    await new Promise((resolve) => {
      const image = root.querySelector("img");
      if (image.complete && image.naturalWidth) resolve();
      else image.addEventListener("load", resolve, { once: true });
    });
    root.remove();
    return window.coverCalls - before;
  });
  assert.equal(
    directCoverCalls,
    0,
    "Imagens externas válidas devem carregar direto, sem duplicar o download no Tauri.",
  );
  for (const category of ["filmes", "series", "animes"]) {
    await page.evaluate(async (value) => {
      state.libraryCategory = value;
      state.libraryStatus = "all";
      await renderLibrary();
    }, category);
    await page.locator("#libraryGroups").waitFor();
    await page.waitForFunction(() =>
      document.querySelector("#libraryGroups [data-cover-kind]")?.getAttribute("src")?.startsWith("data:image/"),
    );
    const categoryLeftEdges = await page.evaluate(() =>
      ["#libraryCollectionHero", ".library-controls", "#libraryGroups"].map(
        (selector) =>
          Math.round(document.querySelector(selector).getBoundingClientRect().left),
      ),
    );
    assert.ok(
      Math.max(...categoryLeftEdges) - Math.min(...categoryLeftEdges) <= 1,
      `${category} desalinhada: ${categoryLeftEdges.join(", ")}`,
    );
  }
  await page.evaluate(async () => {
    window.delayLibrary = true;
    window.libraryDelay = 800;
    await navigate("library");
  });
  assert.ok(
    await page.evaluate(() =>
      window.diagnostics.some((entry) => entry.message.includes("ms")),
    ),
    "Uma troca de aba lenta deve registrar sua duração.",
  );
  assert.ok(
    await page.evaluate(() =>
      window.diagnostics.some(
        (entry) =>
          entry.stage === "SLOW_COMMAND" &&
          entry.message.startsWith("library:"),
      ),
    ),
    "A chamada lenta da biblioteca deve ser identificada no diagnóstico.",
  );
  await page.evaluate(() => {
    window.delayLibrary = false;
    window.libraryDelay = 120;
  });
  await page.evaluate(async () => {
    state.libraryCategory = "jogos";
    state.libraryStatus = "all";
    await renderLibrary();
  });
  await page.locator("#libraryGroups").waitFor();
  assert.equal(await page.locator(".category-library-card").count(), 0);
  assert.equal(await page.locator(".cavern-lib-tabs").isVisible(), true);
  await page.locator('[data-lib-filter="progress"]').click();
  assert.equal(await page.locator("#libraryGroups .cinema-card").count(), 1);
  await page.locator('[data-lib-filter="all"]').click();
  assert.equal(await page.locator("#content.reference-library").count(), 1);
  assert.equal(
    await page.locator("#libraryGroups .cinema-card > .body").count(),
    5,
  );
  assert.equal(
    await page
      .locator("#libraryGroups .cinema-card > .body")
      .first()
      .evaluate((n) => getComputedStyle(n).position),
    "static",
  );
  assert.match(await page.locator('#libraryGroups [data-detail="1"] .playtime-badge').innerText(),/20 h/);
  await page.locator('#libraryGroups [data-detail="1"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:'preview/playtime-card-check.png'});
  const libraryCover = page.locator("#libraryGroups .cover-wrap").first();
  let libraryCoverBox = await libraryCover.boundingBox();
  assert.ok(
    libraryCoverBox.height > libraryCoverBox.width * 1.4,
    "A biblioteca deve respeitar o formato vertical selecionado.",
  );
  await page.evaluate(() => {
    document.body.dataset.cardFormat = "landscape";
  });
  libraryCoverBox = await libraryCover.boundingBox();
  assert.ok(
    libraryCoverBox.width > libraryCoverBox.height * 1.6,
    "A biblioteca deve respeitar o formato horizontal selecionado.",
  );
  await page.evaluate(() => {
    document.body.dataset.cardFormat = "poster";
    document.documentElement.style.setProperty("--reference-card-width", "420px");
  });
  assert.ok(
    (await page.locator("#libraryGroups .cinema-card").first().boundingBox()).width >= 400,
    "A largura configurada em Aparência deve dimensionar os cards da biblioteca.",
  );
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--reference-card-width", "300px");
  });
  await page.locator("#libraryStatusFilter").selectOption("platinum");
  assert.equal(await page.locator("#libraryGroups .cinema-card").count(), 1);
  await page.locator("#libraryStatusFilter").selectOption("all");
  await page.locator("#libraryGenre").selectOption("Ação");
  assert.equal(await page.locator("#libraryGroups .cinema-card").count(), 1);
  await page.locator("#libraryGenre").selectOption("");
  await page.locator("#libraryStatusFilter").selectOption("finished");
  await page.locator("#libraryStatusFilter").selectOption("all");
  assert.equal(await page.locator(".cinema-tabs").count(), 0);
  assert.equal(await page.locator(".collection-section").count(), 5);
  assert.equal(await page.locator(".collection-overview").count(), 0);
  assert.equal(await page.locator(".library-hero-metrics article").count(), 3);
  await page.locator("#selectItems").click();
  await page.locator("#selectVisible").click();
  assert.match(
    await page.locator("#selectionCount").innerText(),
    /5 selecionados/,
  );
  await page.locator('[data-bulk-action="edit"]').click();
  await page.locator('#bulkConfirm').click();
  assert.match(await page.locator('#bulkProgress').innerText(),/Selecione um campo/);
  await page.locator("#bulkStatus").selectOption("⏸️ Pausado");
  await page.evaluate(()=>{window.batchFixture=true;window.batchAttempts=[];window.holdBatchSave=true;window.batchFailureIds=['2'];});
  await page.locator("#bulkConfirm").click();
  await page.waitForFunction(()=>typeof window.releaseBatchSave==='function');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.batch-operation-dialog').count(),1);
  await page.evaluate(()=>document.activeElement.blur());
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.batch-operation-dialog').count(),1);
  await page.locator('[data-batch-stop]').click();
  await page.evaluate(()=>{window.holdBatchSave=false;window.releaseBatchSave();});
  await page.locator('[data-batch-resume]').waitFor({state:'visible'});
  assert.match(await page.locator('#bulkProgress').innerText(),/1 concluídos.*4 pendentes/);
  assert.equal(await page.evaluate(()=>window.batchAttempts.length),1);
  await page.locator('.batch-operation-dialog .bulk-dialog').screenshot({path:'preview/library-batch-paused-check.png'});
  await page.locator('[data-batch-resume]').click();
  await page.locator('[data-batch-retry]').waitFor({state:'visible'});
  assert.match(await page.locator('#bulkProgress').innerText(),/4 concluídos.*1 não atualizados/);
  assert.equal(await page.locator('#bulkErrors li').count(),1);
  await page.locator('.batch-operation-dialog .bulk-dialog').screenshot({path:'preview/library-batch-retry-check.png'});
  await page.evaluate(()=>{window.batchFailureIds=[];});
  await page.locator('[data-batch-retry]').click();
  await page.waitForFunction(()=>document.querySelector('#bulkProgress')?.textContent==='5 concluídos · 0 não atualizados');
  assert.equal(await page.evaluate(()=>window.batchAttempts.filter(id=>id==='2').length),2);
  assert.equal(await page.evaluate(()=>window.batchAttempts.length),6);
  await page.evaluate(()=>{window.batchFixture=false;});
  await page.locator("[data-finish]").waitFor();
  assert.equal(
    await page.evaluate(
      () =>
        window.saved.filter(
          (x) => x.c === "save_item" && x.p.item.status === "⏸️ Pausado",
        ).length,
    ),
    5,
  );
  await page.locator("[data-finish]").click();
  await page.locator("#selectVisible").click();
  await page.locator('[data-bulk-action="update"]').click();
  await page.locator("#bulkFormat").selectOption("landscape");
  await page.locator("#bulkConfirm").click();
  await page.locator("[data-finish]").waitFor();
  assert.match(
    await page.locator("#bulkProgress").innerText(),
    /1 concluídos.*4 não atualizados/,
  );
  assert.equal(await page.locator("#bulkErrors li").count(), 4);
  await page.locator("[data-finish]").click();
  await page.locator("#selectItems").click();
  assert.equal(await page.locator("#selectItems").innerText(), "Selecionar títulos");
  assert.equal(await page.locator("#bulkBar").isHidden(), true);
  assert.equal(await page.locator(".card-select").count(), 0);
  assert.equal(await page.locator('#libraryGroups [data-detail]').count(),5,'A primeira página acompanha o grupo que cresceu durante a operação');
  await page.evaluate(()=>{window.progressPending=true;window.holdProgressPending=true});
  await page.locator('[data-detail="1"]').click();
  await page.locator("#editInformation").waitFor();
  await page.waitForFunction(()=>document.querySelector('.progress-sync-status')?.textContent.includes('envio pendente'));
  await page.evaluate(()=>window.holdProgressPending=false);
  await page.locator('.progress-sync-status button').click();
  await page.waitForFunction(()=>document.querySelector('.progress-sync-status')?.textContent.includes('Horas sincronizadas em'));

  assert.equal(
    await page.locator(".reference-detail [data-detail-tab]").count(),
    6,
  );
  assert.equal(await page.locator(".journey-detail-actions button").count(), 2);
  await page.waitForFunction(
    () =>
      document.querySelector("#detailDescription").textContent ===
      "Descrição do jogo",
  );
  assert.match(await page.locator("#catalogRating").innerText(), /9.0/);
  await page.locator("#autoGenres").click();
  await page.waitForFunction(() =>
    window.saved.some(
      (s) =>
        s.c === "save_item" &&
        Array.isArray(s.p.item.generos) &&
        s.p.item.generos[0] === "Action",
    ),
  );
  await page.locator('[data-detail-tab="achievements"]').click();
  await page
    .locator(".achievement h3")
    .filter({ hasText: "Conquista do jogo" })
    .waitFor();
  assert.match(
    await page.locator("#achievementsDetail").innerText(),
    /disponível/,
  );
  await page.locator('[data-detail-tab="media"]').click();
  assert.ok((await page.locator("#detailMedia img").count()) > 0);
  await page.locator('[data-detail-tab="notes"]').click();
  await page.locator("#detailNotesForm textarea").fill("Notas de teste");
  await page.locator("#detailNotesForm button").click();
  await page.waitForFunction(() =>
    window.saved.some(
      (s) => s.c === "save_item" && s.p.item.review === "Notas de teste",
    ),
  );
  await page.locator('[data-detail-tab="history"]').click();
  assert.match(
    await page.locator("#detailHistory").innerText(),
    /11\/10\/2026/,
  );
  await page.locator('[data-detail-tab="about"]').click();
  const editBounds=await page.locator('#editInformation').boundingBox(),listBounds=await page.locator('[data-detail-list]').boundingBox(),dialogBounds=await page.locator('.reference-detail').boundingBox(),closeBounds=await page.locator('.reference-detail .detail-close').boundingBox();
  assert.ok(listBounds.y>=editBounds.y+editBounds.height,'Ações secundárias devem ficar abaixo da ação principal');
  assert.equal(await page.locator('.detail-poster #editInformation').count(),1);
  await page.evaluate(()=>document.querySelector('#detailDescription').textContent='Descrição longa de teste. '.repeat(200));
  await page.locator('.description-toggle').click();
  assert.equal(await page.locator('#detailDescription.description-expanded').count(),1);
  assert.equal(await page.locator('#detailDescription').evaluate(el=>el.scrollHeight<=el.clientHeight+2),true,'A descrição expandida deve mostrar o texto completo');
  await page.locator('.description-toggle').click();
  await page.evaluate(()=>document.querySelector('#detailDescription').textContent='Descrição do jogo');
  assert.ok(closeBounds.x>=dialogBounds.x&&closeBounds.x+closeBounds.width<=dialogBounds.x+dialogBounds.width&&closeBounds.y>=dialogBounds.y,'Fechar deve permanecer dentro da janela');
  assert.equal(await page.locator('.detail-personal-metrics [data-detail-edit]').count(),2);
  assert.equal(await page.locator('[data-detail-panel="about"] .detail-catalog-meta').count(),1);
  assert.equal(await page.locator('.reference-detail-summary #catalogRating').count(),0);
  const detailsViewport=page.viewportSize();
  for(const width of [980,740,480]){
    await page.setViewportSize({width,height:900});
    assert.equal(await page.locator('.reference-detail-main').evaluate(el=>el.scrollWidth<=el.clientWidth+2),true,'Detalhes devem caber na janela '+width);
    const select=await page.locator('#detailStatus').boundingBox(),dialog=await page.locator('.reference-detail').boundingBox();
    assert.ok(select.x>=dialog.x&&select.x+select.width<=dialog.x+dialog.width,'Status deve permanecer dentro da janela');
    assert.ok(dialog.x>=0&&dialog.x+dialog.width<=width+1,'O modal deve caber na área visível '+width);
    await page.screenshot({path:'preview/details-'+width+'.png',animations:'disabled'});
  }
  await page.setViewportSize(detailsViewport);
  await page.screenshot({ path: "preview/details-check.png" });
  await page.locator('[data-detail-edit="horas"]').click();
  assert.equal(await page.locator('[data-item-panel="collection"]').isVisible(),true);
  assert.equal(await page.locator('[data-play-hours]').evaluate(el=>el===document.activeElement),true);
  await page.locator('[data-item-tab="collection"]').click();
  await page
    .getByRole("button", { name: "Associar Steam App ID", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelector('[name="steam_appid"]').value === "10",
  );
  assert.equal(
    await page.locator('[name="generos"]').inputValue(),
    "Action",
  );
  assert.equal(await page.locator('[name="loja"], [name="preco"]').count(),0);
  const previousName=await page.locator('[name="nome"]').inputValue();
  await page.locator('[name="nome"]').fill('Devil May Cry V Special Edition');
  await page.evaluate(()=>document.querySelector('[name="steam_appid"]').value='');
  await page.getByRole('button',{name:'Associar Steam App ID',exact:true}).click();
  await page.locator('.steam-search-dialog [data-steam-result="601150"]').click();
  await page.waitForFunction(()=>document.querySelector('[name="steam_appid"]').value==='601150');
  await page.locator('[name="nome"]').fill(previousName);
  await page.evaluate(()=>document.querySelector('[name="steam_appid"]').value='10');
  await page.locator(".item-editor-modern button.primary").click();
  await page.waitForFunction(() =>
    window.saved.some(
      (s) => s.c === "save_item" && s.p.item.nota === "🤔 A considerar",
    ),
  );
  await page.locator("#addItem").waitFor();
  await page.locator("#addItem").click();
  await page.evaluate(()=>window.catalogLibraryRows=[{id:301,nome:'Control',ano:2019,categoria:'jogos',steam_appid:10},{id:302,nome:'Duna',ano:1984,categoria:'jogos'}]);
  await page.locator('#catalogQuery').fill('Filtro sexual');await page.locator('#catalogSearch').click();await page.locator('#catalogResults [data-result]').first().waitFor();
  assert.equal(await page.locator('#catalogResults [data-result]').count(),1);assert.match(await page.locator('#catalogResults').innerText(),/Lords of the Fallen/);
  assert.equal(await page.locator('#catalogResults img').first().evaluate(img=>getComputedStyle(img).opacity),'1');
  await page.locator('.catalog-search [data-explicit-filter]').check();await page.waitForFunction(()=>document.querySelectorAll('#catalogResults [data-result]').length===2);
  assert.equal(await page.locator('#catalogResults .sensitive-cover-guard').count(),0);await page.locator('.catalog-search [data-explicit-filter]').uncheck();await page.waitForFunction(()=>document.querySelectorAll('#catalogResults [data-result]').length===1);
  await page.screenshot({path:'preview/ordinary-age-18-search.png'});
  await page.locator('#catalogQuery').fill('Edições de teste');
  await page.locator('#catalogSearch').click();
  await page.locator('[data-result="0"]').filter({hasText:'Já na biblioteca'}).waitFor();
  assert.match(await page.locator('[data-result="1"]').innerText(),/2020.*Jogo.*Edição especial.*PlayStation 5/s);
  assert.match(await page.locator('[data-result="2"]').innerText(),/Outra versão/);
  await page.locator('.catalog-search').screenshot({path:'preview/catalog-selection-check.png'});
  await page.locator('[data-result="0"]').click();
  await page.locator('.detail-title-row h2').filter({hasText:'Control'}).waitFor();
  await page.locator('.editor-overlay').last().locator('[data-close]').first().click();
  await page.locator('[data-result="2"]').click();
  await page.waitForFunction(()=>document.querySelector('[name="nome"]').value==='Duna (2021)');
  await page.locator('[name="status"]').selectOption({label:'🎮 Em Progresso'});
  await page.evaluate(()=>{window.failCatalogSave=true;window.delayItemSave=true;});
  await page.locator('.item-editor-modern button.primary').click();
  await page.locator('.save-feedback[data-phase="pending"] [role="progressbar"]').waitFor();
  await page.locator('.form-error').filter({hasText:'campos foram mantidos'}).waitFor();
  assert.equal(await page.locator('.save-feedback[data-phase="error"] .save-feedback-track').isHidden(),true);
  assert.equal(await page.locator('[name="nome"]').inputValue(),'Duna (2021)');
  assert.equal(await page.locator('[name="status"]').inputValue(),'🎮 Em Progresso');
  await page.evaluate(()=>{window.failCatalogSave=false;window.delayItemSave=false;window.catalogLibraryRows=null;});
  await page.locator("#catalogQuery").fill("Teste");
  await page.locator("#catalogSearch").click();
  await page.locator("[data-result]").click();
  await page.waitForFunction(
    () => document.querySelector('[name="generos"]').value === "Action"&&document.querySelector('[name="nome"]').value==='Novo resultado IGDB',
  );
  await page.locator('[data-item-tab="cover"]').click();
  await page.screenshot({ path: "preview/add-check.png" });
  await page.locator(".editor button.primary").click();
  await page.waitForFunction(() =>
    window.saved.some((s) => s.c === "save_item"),
  );
  await page.locator('#addItem').waitFor();
  await page.locator('#addItem').click();
  await page.locator('#catalogQuery').fill('Seleção múltipla');
  await page.locator('#catalogSearch').click();
  await page.locator('[data-catalog-select]').first().waitFor();
  assert.equal(await page.locator('.catalog-optional').getAttribute('open'),null);
  await page.locator('[data-catalog-select]').nth(0).check();
  await page.locator('#catalogQuery').fill('Teste');
  await page.locator('#catalogSearch').click();
  await page.locator('[data-result]').waitFor();
  assert.match(await page.locator('.catalog-queue [role="status"]').innerText(),/1 selecionado/);
  await page.locator('#catalogQuery').fill('Seleção múltipla');
  await page.locator('#catalogSearch').click();
  await page.locator('[data-catalog-select]').nth(1).waitFor();
  assert.equal(await page.locator('[data-catalog-select]').nth(0).isChecked(),true);
  await page.locator('[data-catalog-select]').nth(1).check();
  assert.match(await page.locator('.catalog-queue [role="status"]').innerText(),/2 selecionados/);
  await page.locator('[data-queue-start]').click();
  await page.waitForFunction(()=>document.querySelector('[name="nome"]').value==='Primeiro da fila');
  for(const width of [1920,1280,820]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`preview/catalog-studio-${width}.png`,animations:'disabled'});assert.equal(await page.locator('.catalog-studio').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);const bounds=await page.locator('.catalog-studio>footer button.primary').boundingBox();assert.ok(bounds.y>=0&&bounds.y+bounds.height<=1000,'A ação de adicionar deve estar visível');}
  await page.setViewportSize({width:1920,height:1000});
  await page.locator('.catalog-studio button.primary').click();
  await page.waitForFunction(()=>document.querySelector('[name="nome"]').value==='Segundo da fila');
  assert.match(await page.locator('.catalog-queue [role="status"]').innerText(),/1 adicionado.*1 restante/);
  await page.evaluate(()=>window.failCatalogSave=true);
  await page.locator('.catalog-studio button.primary').click();
  await page.locator('.form-error').filter({hasText:'campos foram mantidos'}).waitFor();
  assert.equal(await page.locator('[name="nome"]').inputValue(),'Segundo da fila');
  assert.equal(await page.evaluate(()=>window.saved.filter(s=>s.c==='save_item'&&s.p.item.nome==='Primeiro da fila').length),1);
  await page.evaluate(()=>window.failCatalogSave=false);
  await page.locator('.catalog-studio button.primary').click();
  await page.locator('#addItem').waitFor();
  assert.equal(await page.evaluate(()=>window.saved.filter(s=>s.c==='save_item'&&s.p.item.nome==='Primeiro da fila').length),1);
  assert.equal(await page.evaluate(()=>window.saved.filter(s=>s.c==='save_item'&&s.p.item.nome==='Segundo da fila').length),1);
  await page.locator('#mainNav [data-view="settings"]').click();
  await page.locator('[data-settings-tab="appearance"]').click();
  await page.locator('[data-theme-range="cardWidth"]').evaluate((el) => {
    el.value = "420";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  assert.equal(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--reference-card-width")
        .trim(),
    ),
    "420px",
  );
  await page.locator('[data-swatch="#29c4e0"]').click();
  assert.equal(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim(),
    ),
    "#29c4e0",
  );
  await page.locator('[data-theme-preset="Caverna"]').click();
  await page.locator("#referenceCardFormat").selectOption("landscape");
  assert.equal(
    await page.evaluate(() => document.body.dataset.cardFormat),
    "landscape",
  );
  await page.locator("#referenceCardFormat").selectOption("poster");
  await page.screenshot({ path: "preview/appearance-check.png" });
  assert.equal(await page.locator('[data-settings-tab="theme"]').count(), 0);
  await page.locator('[data-settings-tab="integrations"]').click();
  await page.locator("#steamConnection input").fill("76561198000000001");
  await page.locator("#steamConnection button").click();
  await page.waitForFunction(() =>
    window.saved.some((s) => s.c === "link_steam"),
  );
  assert.deepEqual(
    await page.locator('#mainNav [data-discover-kind] span').allTextContents(),
    ["Minha Steam", "Meu Retrô"],
  );
  assert.equal(await page.locator('#mainNav [data-discover-kind="free"]').count(),0);
  await page.locator('#mainNav [data-discover-kind="steam"]').click();
  await page.waitForFunction(() =>
    document.querySelector('#mainNav [data-discover-kind="steam"].active'),
  );
  const steamTime=page.locator('.steam-library-grid .playtime-badge');await steamTime.waitFor();assert.equal(await steamTime.count(),1);assert.match(await steamTime.innerText(),/1\.234 h 34 min/);
  assert.equal(await steamTime.evaluate(n=>{const b=n.getBoundingClientRect(),t=n.querySelector('strong').getBoundingClientRect();return b.width>0&&t.width>0&&t.left>=b.left&&t.right<=b.right+1&&t.bottom<=b.bottom}),true,'Tempo Steam deve caber no indicador sem corte ou sobreposição');
  await page.waitForFunction(()=>[...document.querySelectorAll('.steam-library-grid .cover-wrap img')].every(img=>img.complete&&img.naturalWidth>1));
  await page.screenshot({path:'preview/steam-playtime-check.png',animations:'disabled'});
  await page.evaluate(()=>window.missingIgdbDetails=true);
  await page.locator('[data-steam-add="steam-123"]').click();
  await page.waitForFunction(()=>window.saved.some(s=>s.c==='save_item'&&s.p.item.steam_appid===123));
  const importedSteam=await page.evaluate(()=>window.saved.find(s=>s.c==='save_item'&&s.p.item.steam_appid===123).p.item);
  assert.equal(importedSteam.nome,'Jogo Steam com muitas horas');assert.equal(importedSteam.loja,undefined);assert.equal(importedSteam.preco,undefined);
  await page.evaluate(()=>window.missingIgdbDetails=false);

  await page.locator('#mainNav [data-discover-kind="retro"]').click();
  await page.locator(".retro-game-card").waitFor();
  await page.waitForFunction(() =>
    document.querySelector('#mainNav [data-discover-kind="retro"].active'),
  );
  await page.waitForTimeout(800);
  assert.match(await page.locator('.retro-profile').evaluate(n=>getComputedStyle(n).backgroundImage),/data:image/,'A capa privada do Retrô deve ser carregada autenticada');
  assert.deepEqual(await page.locator('.cavern-retro-stats .cavern-stat b').allTextContents(),['120','45','1','3/10','1'],'O resumo Retrô deve refletir os desbloqueios dos jogos, não o texto do status');
  await page.evaluate(()=>{const p=document.createElement('p');p.id='translationAttributionProbe';document.body.append(p);window.batcavernaRenderDescription(p,'a'.repeat(2000)+'\n\nTradução automática por DeepL.com — https://www.deepl.com',1800)});
  assert.equal(await page.locator('#translationAttributionProbe').textContent(),'a'.repeat(1800));
  assert.equal(await page.locator('#translationAttributionProbe + [data-translation-credit] button').textContent(),'DeepL.com','Crédito permanece visível mesmo quando a prévia é truncada');
  await page.evaluate(()=>window.batcavernaRenderDescription(document.querySelector('#translationAttributionProbe'),'Descrição original em português.'));
  assert.equal(await page.locator('#translationAttributionProbe + [data-translation-credit]').count(),0,'Texto original não deve receber crédito de tradução');
  await page.locator('#translationAttributionProbe').evaluate(n=>n.remove());
  await page.screenshot({ path: "preview/retro-check.png" });
  await page.evaluate(() => (window.failRetroAchievements = true));
  assert.equal(await page.locator('.retro-actions [data-retro-achievements]').count(),0);
  await page.locator('.retro-toolbar input').fill('inexistente');
  assert.equal(await page.locator('.retro-library-item:visible').count(),0);
  await page.locator('.retro-toolbar input').fill('');
  await page.locator('.retro-game-card').click();
  await page.locator('.reference-detail [data-detail-tab="achievements"]').click();
  await page.getByText('Falha de rede simulada.').waitFor();
  await page.evaluate(() => {window.failRetroAchievements=false});
  await page.locator('.reference-detail [data-detail-tab="achievements"]').click();
  await page.getByText('Primeira jornada').waitFor();
  await page.locator('.reference-detail .detail-close').click();
  await page.evaluate(async () => await navigate("settings"));
  await page.locator('[data-settings-tab="app"]').click();
  await page.locator('[data-pc-map]').click();
  await page.locator('.pc-game-dialog').waitFor();
  await page.locator('[name="gameSearch"]').fill('zerado');
  await page.locator('[data-game]').first().click();
  await page.locator('[name="processSearch"]').fill('control');
  assert.equal(await page.locator('[data-process]').count(),1);
  await page.locator('[data-process]').click();
  await page.screenshot({path:'preview/pc-association-check.png'});
  await page.locator('.pc-game-dialog [type="submit"]').click();
  assert.equal(await page.locator('.pc-game-dialog').count(),0);
  await page.locator('[data-map-search]').fill('control');
  assert.equal(await page.locator('.pc-mapping-row').count(),1);
  await page.locator('[data-map-search]').fill('nao-encontrado');
  assert.equal(await page.locator('.pc-mapping-row').count(),0);
  await page.locator('[data-map-search]').fill('');
  await page.screenshot({path:'preview/pc-settings-check.png'});
  await page.locator('[data-pc-remove]').click();
  assert.equal(await page.locator('.pc-mapping-row').count(),0);

  await page.evaluate(()=>{window.libraryQueryRows=[{id:909,nome:'Phantom Blade Zero',categoria:'jogos',status:'🎮 Em Progresso'}];window.detectedPcGame='Phantom Blade Zero';window.detectedPcSource='automatic';window.detectedPcProcess='PhantomBladeZero-Win64-Shipping';window.storageWrite=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('Setting the value exceeded the quota','QuotaExceededError')};});
  await page.locator('[data-pc-detect-now]').click();
  await page.waitForFunction(()=>window.nativePcPreferences?.test?.mappings.some(m=>m.name==='Phantom Blade Zero'));
  await page.waitForFunction(()=>window.saved.some(s=>s.c==='progress_sync'&&s.p.input.op==='record'&&s.p.input.item_id===909));
  await page.locator('.pc-mapping-row').filter({hasText:'Phantom Blade Zero'}).waitFor();
  await page.locator('.pc-detection-note').filter({hasText:'Jogo detectado: Phantom Blade Zero'}).waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-pc-detect-now]')].every(b=>!b.disabled));
  await page.locator('.pc-game-settings').screenshot({path:'preview/pc-quota-check.png'});
  await page.evaluate(()=>{Storage.prototype.setItem=window.storageWrite;window.libraryQueryRows=null;window.detectedPcGame=null;window.detectedPcSource=null;window.detectedPcProcess=null;});
  await page.locator("#checkUpdates").click();
  await page.getByRole("dialog", { name: "Atualização disponível" }).waitFor();
  assert.match(
    await page.locator(".update-confirm-modal").innerText(),
    /0\.17\.21/,
  );
  await page.locator(".update-confirm-modal [data-update-cancel]").first().click();
  await page.locator("#checkUpdates").click();
  await page.getByRole("dialog", { name: "Atualização disponível" }).waitFor();
  await page.evaluate(()=>{window.holdUpdateDownload=true;});
  await page.locator(".update-confirm-modal [data-update-install]").click();
  await page.waitForFunction(() =>
    window.saved.some((s) => s.c === "install_update"),
  );
  await page.waitForFunction(()=>!!window.updateTransfer);
  await page.evaluate(()=>window.updateTransfer.channel.onmessage({phase:'downloading',downloaded:1048576,total:null}));
  assert.match(await page.locator('.update-progress-modal [data-transfer]').innerText(),/1 MB recebidos/);
  assert.equal(await page.locator('.update-progress-modal progress').getAttribute('value'),null);
  await page.evaluate(()=>window.updateTransfer.channel.onmessage({phase:'downloading',downloaded:1048576,total:2097152}));
  assert.match(await page.locator('.update-progress-modal [data-transfer]').innerText(),/50%/);
  assert.equal(await page.locator('#checkUpdates').isDisabled(),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.update-progress-modal').count(),1);
  await page.locator('.update-progress-modal').screenshot({path:'preview/update-download-check.png'});
  await page.evaluate(()=>window.updateTransfer.channel.onmessage({phase:'installing'}));
  assert.match(await page.locator('.update-progress-modal [data-update-stage]').innerText(),/assinatura/);
  await page.evaluate(()=>window.updateTransfer.reject(Error('Conexão interrompida durante o download.')));
  await page.locator('.update-progress-modal [data-retry]').waitFor({state:'visible'});
  assert.match(await page.locator('.update-progress-modal [data-update-stage]').innerText(),/Conexão interrompida/);
  await page.locator('.update-progress-modal').screenshot({path:'preview/update-retry-check.png'});
  await page.evaluate(()=>{window.holdUpdateDownload=false;});
  await page.locator('.update-progress-modal [data-retry]').click();
  await page.getByRole('heading',{name:'Atualização preparada',exact:true}).waitFor();
  await page.locator('.update-progress-modal [data-dismiss]').click();
  await page.evaluate(async()=>await navigate('lists'));
  await page.locator('[data-list="list1"]').click();
  await page.locator('[data-list-library]').first().click();
  await page.locator('.editor-overlay form [name="nome"]').waitFor();
  assert.equal(await page.locator('.editor-overlay form [name="nome"]').inputValue(),'Jogo zerado');
  await page.locator('.editor-overlay [data-close]').first().click();
  // Finish the list/editor scenario through the UI before checking Appearance.
  for(let remaining=0;remaining<3&&await page.locator('.editor-overlay').count();remaining++){
    await page.locator('.editor-overlay').last().locator('[data-close]').first().click();
  }
  await page.waitForFunction(()=>document.querySelectorAll('.editor-overlay').length===0);
  await page.evaluate(async()=>{await navigate('settings');state.settingsTab='appearance';await renderSettings()});
  await page.locator('[data-theme-preset="Claro"]').click();
  assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('light-theme')),true);
  const light=await page.locator('#settingsPanel').evaluate(n=>({background:getComputedStyle(n).backgroundColor,color:getComputedStyle(n).color}));
  assert.match(light.background,/255, 255, 255/);
  assert.notEqual(light.color,'rgb(255, 255, 255)');
  await page.evaluate(async()=>await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{}))));
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#mainNav [data-view="home"]')).color===getComputedStyle(document.body).color);
  assert.equal(await page.locator('#mainNav [data-view="home"]').evaluate(n=>getComputedStyle(n).color),await page.locator('body').evaluate(n=>getComputedStyle(n).color),'Navegação do tema claro precisa de contraste');
  await page.screenshot({path:'preview/light-settings-check.png'});
  await page.locator('[data-theme-preset="Caverna"]').click();
  await page.evaluate(async()=>{state.settingsTab='app';await renderSettings()});
  await page.locator('[data-credits]').click();
  await page.getByText('Créditos e serviços',{exact:true}).last().waitFor();
  assert.equal(await page.locator('#settingsPanel img[alt="TMDB"]').count(),1);
  assert.match(await page.locator('#settingsPanel').innerText(),/not endorsed or certified by TMDB/);
  await page.evaluate(async()=>await navigate('home'));
  assert.equal(await page.locator('[data-clear-activity],.cavern-recent,.hero-activity').count(),0);
  await page.evaluate(async()=>{state.discoverTab='retro';await navigate('discover')});
  assert.equal(await page.locator('[data-retro-remove]').count(),0);
  await page.locator('.retro-game-card').click();
  await page.locator('.reference-detail [data-retro-remove]').click();
  await page.locator('.app-confirm-dialog [data-confirm]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.retro-game-card').length===0);
  assert.ok(await page.evaluate(()=>window.saved.some(s=>s.c==='bright_api'&&s.p.input.removeGameId)));
  await page.evaluate(async()=>await navigate('settings'));
  await page.locator(".diagnostic-settings").waitFor();
  assert.match(
    await page.locator(".diagnostic-summary").innerText(),
    /2.048 bytes/,
  );
  await page.locator("#exportDiagnostics").click();
  await page.waitForFunction(() =>
    window.saved.some((s) => s.c === "diagnostic_export"),
  );
  await page.locator('[data-settings-tab="account"]').click();
  assert.equal(await page.locator(".launcher-admin").count(), 0);
  await page.locator('[data-settings-tab="app"]').click();
  await page.locator("#desktopBackground").uncheck();
  await page.locator("#desktopSound").uncheck();
  await page.locator("#desktopAutostart").check();
  await page.locator("#desktopStartMinimized").check();
  await page.locator("#saveDesktopPreferences").click();
  await page.waitForFunction(() =>
    window.saved.some(
      (s) => s.c === "desktop_preferences" && s.p.input?.background === false && s.p.input.sound===false && s.p.input.autostart===true && s.p.input.start_minimized===true,
    ),
  );
  await page.locator("#testWindowsNotification").click();
  await page.waitForFunction(() =>
    window.saved.some((s) => s.c === "test_windows_notification"),
  );
  await page.locator('[data-settings-tab="account"]').click();
  await page.locator("#changeEmail").click();
  await page.locator('#emailForm [name="email"]').fill("novo@exemplo.com");
  await page.locator('#emailForm [name="current"]').fill("mock");
  await page.locator("#emailForm button.primary").click();
  await page.waitForFunction(() =>
    window.saved.some((s) => s.c === "change_email"),
  );
  await page.locator('#emailChangeProof [name="code"]').fill('123456');
  await page.locator('#emailChangeProof .primary').click();
  await page.getByText('Código aceito. Confirme também o código enviado ao outro endereço.',{exact:true}).waitFor();
  assert.equal(await page.locator('#emailChangeProof [name="code"]').inputValue(),'');
  await page.locator('#emailChangeProof [name="email"]').fill('old@exemplo.com');
  await page.locator('#emailChangeProof [name="code"]').fill('654321');
  await page.locator('#emailChangeProof .primary').click();
  await page.getByText('E-mail alterado. Use o novo endereço no próximo login.',{exact:true}).waitFor();
  assert.equal(await page.locator('#emailChangeProof .primary').isVisible(),false);
  assert.equal(await page.evaluate(()=>window.saved.filter(x=>x.c==='verify_email_change').length),2);
  await page.screenshot({path:'preview/email-change-check.png'});
  await page.locator('#emailChangeProof [data-close]').click();
  await page.evaluate(() => (window.adminMode = true));
  await page.locator('[data-settings-tab="appearance"]').click();
  await page.locator(".launcher-admin").waitFor();
  const explicitSetting=page.locator('#settingsPanel [data-explicit-filter]');await explicitSetting.waitFor();await explicitSetting.check();assert.equal(await page.locator('html').getAttribute('data-explicit-content'),'show');await explicitSetting.uncheck();
  assert.equal(await page.locator(".launcher-admin").count(), 1);
  await page.locator("#resetLoginBackground").click();
  await page.waitForFunction(() =>
    window.saved.some((s) => s.c === "set_login_background"),
  );
  await page.evaluate(() => (window.adminMode = false));
  assert.equal(
    await page.locator('#mainNav [data-view="chat"],#mainNav [data-view="friends"],#mainNav [data-view="profile"]').count(),
    0,
  );
  await page.locator("#friendsDockToggle").click();
  await page.locator("#friendsDockPanel").waitFor();
  await page.locator("#friendsDockSearch").fill("inexistente");
  assert.equal(
    await page.locator("#friendsDockList [data-dock-friend]:visible").count(),
    0,
  );
  await page.locator("#friendsDockSearch").fill("Amigo");
  assert.equal(
    await page.locator("#friendsDockList [data-dock-friend]:visible").count(),
    1,
  );
  await page.locator("#friendsDockAdd").click();
  await page.locator("#unifiedFriendSearch input").fill("Amigo");
  await page.locator("#unifiedFriendSearch button").click();
  await page.locator('[data-unified-invite="friend"]').waitFor();
  await page.locator(".friend-search-dialog [data-close]").click();
  await page.locator("#friendsDockToggle").click();
  await page.screenshot({ path: "preview/friends-reference.png" });
  await page.locator('[data-dock-friend="friend"]').click();
  await page.locator('[data-message="m2"]').waitFor();
  await page.locator('[data-message="m2"] .message-media').click();await page.locator('.chat-image-viewer').waitFor();await page.evaluate(()=>{window.testPrivateMessages=[{id:'m1',remetente_id:'friend',texto:'Olá!',created_at:'2026-10-11T10:00:00Z',lida:false},{id:'m2',remetente_id:'test',texto:'Bom dia',midia_url:'test/image.webp',created_at:'2026-10-11T10:01:00Z'},{id:'viewer-unread',remetente_id:'friend',texto:'Chegou enquanto a imagem estava aberta',created_at:'2026-11-05T11:00:00Z',lida:false}];window.saved=window.saved.filter(x=>x.c!=='read_chat');window.listeners['desktop-change']({payload:{userId:'test',data:{table:'clt_chat_messages'}}});});await page.locator('[data-message="viewer-unread"]').waitFor({state:'attached'});assert.equal(await page.evaluate(()=>window.saved.filter(x=>x.c==='read_chat').length),0);await page.locator('.chat-image-viewer img').evaluate(image=>image.decode());await page.locator('[data-zoom="in"]').click();assert.equal(await page.locator('.chat-image-viewer output').textContent(),'125%');await page.locator('[data-zoom="reset"]').click();assert.equal(await page.locator('.chat-image-viewer output').textContent(),'100%');await page.locator('[data-save-image]').click();await page.waitForFunction(()=>window.saved.some(x=>x.c==='save_chat_image'&&x.p.messageId==='m2'&&!x.p.group));await page.screenshot({path:'preview/chat-image-viewer-check.png',animations:'disabled'});await page.locator('.chat-image-viewer [data-close]').click();await page.evaluate(()=>{window.testPrivateMessages=null;window.listeners['desktop-change']({payload:{userId:'test',data:{table:'clt_chat_messages'}}})});await page.locator('[data-message="viewer-unread"]').waitFor({state:'detached'});
  const imageBytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2EsAAAAASUVORK5CYII=','base64');await page.locator('#chatImageFile').setInputFiles({name:'Foto da partida.png',mimeType:'image/png',buffer:imageBytes});await page.locator('#chatAttachment img').waitFor();assert.match(await page.locator('#chatAttachment').innerText(),/legenda opcional/);await page.locator('#chatAttachment button').click();assert.equal(await page.locator('#chatAttachment').isHidden(),true);await page.locator('#chatImageFile').setInputFiles({name:'Foto da partida.png',mimeType:'image/png',buffer:imageBytes});await page.locator('#chatAttachment img').waitFor();await page.locator('#liveChatText').fill('Legenda da partida');await page.screenshot({path:'preview/chat-image-preview-check.png',animations:'disabled'});await page.evaluate(()=>window.sendFailure='after');await page.locator('#liveMessageForm button.primary').click();await page.locator('#chatDeliveryState[data-state="failed"] button').waitFor();assert.equal(await page.locator('#chatAttachment').isVisible(),true);await page.locator('#chatDeliveryState button').click();await page.waitForFunction(()=>document.querySelector('#chatDeliveryState')?.dataset.state==='sent');const photoSend=await page.evaluate(()=>window.saved.filter(x=>x.c==='send_message'&&x.p.input.text==='Legenda da partida').map(x=>x.p.input));assert.equal(new Set(photoSend.map(x=>x.messageId)).size,1);assert.equal(new Set(photoSend.map(x=>x.media)).size,1);assert.equal(photoSend[0].media,'test/photo.png');assert.equal(await page.evaluate(()=>window.saved.filter(x=>x.c==='upload_chat_image').length),1);

  for(const mode of ['before','after']){
    const message='Tentativa segura '+mode;await page.evaluate(mode=>window.sendFailure=mode,mode);await page.locator('#liveChatText').fill(message);await page.locator('#liveMessageForm').evaluate(f=>{f.requestSubmit();f.requestSubmit()});
    await page.locator('#chatDeliveryState[data-state="failed"] button').waitFor();assert.equal(await page.locator('#liveChatText').inputValue(),message);const attempt=await page.evaluate(message=>window.saved.filter(x=>x.c==='send_message'&&x.p.input.text===message).at(-1).p.input.messageId,message);
    assert.match(attempt,/^[0-9a-f-]{36}$/i);await page.locator('#chatDeliveryState button').click();await page.waitForFunction(()=>document.querySelector('#chatDeliveryState')?.dataset.state==='sent');
    assert.equal(await page.evaluate(message=>new Set(window.saved.filter(x=>x.c==='send_message'&&x.p.input.text===message).map(x=>x.p.input.messageId)).size,message),1);assert.equal(await page.locator(`[data-message="${attempt}"]`).count(),1);
  }

  await page.locator('[data-message="m1"] .message-menu summary').click();
  await page.locator('[data-reply="m1"]').click();
  await page.locator("#liveChatText").fill("Resposta");
  await page.locator("#liveMessageForm button.primary").click();
  await page.waitForFunction(() =>
    window.saved.some(
      (s) => s.c === "send_message" && s.p.input.text === "> Olá!\nResposta",
    ),
  );
  await page.waitForFunction(()=>document.querySelector("#liveChatText").value===''&&document.querySelector("#liveMessageForm").dataset.sending!=='true');
  await page.locator('[data-message="m1"] .message-menu summary').click();
  await page.locator('[data-react="m1"][data-emoji="❤️"]').click();
  await page.locator('.message-reactions [data-react="m1"]').waitFor();
  await page.locator("#stickerButton").click();
  await page.locator('[data-sticker-send="s1"]').click();
  await page.waitForFunction(() =>
    window.saved.some(
      (s) => s.c === "send_message" && s.p.input.media === "test/sticker.webp",
    ),
  );
  await page.evaluate(() =>
    window.listeners["desktop-connection"]({
      payload: { userId: "test", status: "connected" },
    }),
  );
  const stablePresence=await page.evaluate(()=>{const emit=(event,data)=>window.listeners['desktop-presence']({payload:{userId:'test',event,data}});emit('presence_state',{friend:{metas:[{phx_ref:'first',status:'online',jogo:'Hades'}]}});const row=document.querySelector('#sidebarCommunity [data-sidebar-chat="friend"]'),image=row?.querySelector('img');emit('presence_diff',{joins:{friend:{metas:[{phx_ref:'second',phx_ref_prev:'first',status:'online',jogo:'Hades'}]}},leaves:{friend:{metas:[{phx_ref:'first'}]}}});const unchanged=row===document.querySelector('#sidebarCommunity [data-sidebar-chat="friend"]')&&image===row?.querySelector('img');emit('presence_diff',{leaves:{friend:{metas:[{phx_ref:'second'}]}}});const retained=window.batcavernaFriendPresence({id:'friend'}).online;emit('presence_diff',{joins:{friend:{metas:[{phx_ref:'third',status:'online',jogo:'Hades'}]}}});emit('presence_state',{});const reconnect=window.batcavernaFriendPresence({id:'friend'}).online;emit('presence_state',{friend:{metas:[{phx_ref:'hidden',status:'invisivel'}]}});const invisible=!window.batcavernaFriendPresence({id:'friend'}).online;return {unchanged,retained,reconnect,invisible}});
  assert.deepEqual(stablePresence,{unchanged:true,retained:true,reconnect:true,invisible:true});
  const unifiedActivity=await page.evaluate(()=>{window.listeners['desktop-presence']({payload:{userId:'test',event:'presence_state',data:{friend:{metas:[{phx_ref:'mobile',status:'online'},{phx_ref:'pc',status:'online',jogo:'Minecraft',jogo_fonte:'pc'}]}}}});const rows=[...document.querySelectorAll('#sidebarCommunity [data-sidebar-chat="friend"]')];return {rows:rows.length,text:rows[0]?.textContent,steamSection:document.querySelector('#sidebarCommunity').textContent.includes('Jogando na Steam')};});
  assert.equal(unifiedActivity.rows,1);assert.match(unifiedActivity.text,/Minecraft/);assert.equal(unifiedActivity.steamSection,false);
  const ownTransitions=await page.evaluate(async()=>{const prefs='bc-pc-games:test';window.presenceTestProfile={steam_id:'76561198000000000'};await pcGamePreferences.update('test',{enabled:true,mappings:[]});window.detectedPcGame='Control';window.detectedSteamGame='Control';await window.batcavernaRefreshPresence();const playing=window.saved.filter(x=>x.c==='realtime_presence').at(-1).p.input;const before=window.steamPresenceQueries||0;window.detectedPcGame=null;window.detectedSteamGame=null;await window.batcavernaRefreshPresence();const stopped=window.saved.filter(x=>x.c==='realtime_presence').at(-1).p.input;const refreshed=(window.steamPresenceQueries||0)>before;window.detectedPcGame='Control';window.detectedSteamGame='Hades';await pcGamePreferences.update('test',{enabled:false,mappings:[]});await window.batcavernaRefreshPresence();const privateActivity=window.saved.filter(x=>x.c==='realtime_presence').at(-1).p.input;await pcGamePreferences.update('test',{enabled:true,mappings:[]});window.detectedPcGame=null;window.detectedSteamGame=null;window.presenceTestProfile=null;await window.batcavernaRefreshPresence();return {playing,stopped,refreshed,privateActivity};});
  assert.equal(ownTransitions.playing.jogo,'Control');assert.equal(ownTransitions.playing.jogo_fonte,'pc');assert.equal(ownTransitions.stopped.jogo,'');assert.equal(ownTransitions.refreshed,true);assert.equal(ownTransitions.privateActivity.jogo,'');assert.equal(ownTransitions.privateActivity.activity_shared,false);
  const clearedFriend=await page.evaluate(()=>{const emit=data=>window.listeners['desktop-presence']({payload:{userId:'test',event:'presence_diff',data}});emit({joins:{friend:{metas:[{phx_ref:'pc-clear',phx_ref_prev:'pc',status:'ausente',jogo:'',jogo_fonte:'',online_at:Date.now(),device:'desktop'}]}},leaves:{friend:{metas:[{phx_ref:'pc'}]}}});return document.querySelector('#sidebarCommunity [data-sidebar-chat="friend"]').textContent;});assert.doesNotMatch(clearedFriend,/Minecraft/);assert.match(clearedFriend,/Ausente/);
  const disconnectedPresence=await page.evaluate(()=>{window.listeners['desktop-presence']({payload:{userId:'test',ready:false}});return window.batcavernaFriendPresence({id:'friend'});});
  assert.equal(disconnectedPresence.online,false);assert.equal(disconnectedPresence.game,'');assert.match(disconnectedPresence.text,/Sincronizando/);
  await page.screenshot({path:'preview/friend-presence-check.png',animations:'disabled'});

  await page.locator('#conversationSearch').fill('nenhum-contato-regressao');
  assert.equal(await page.locator('.chat-search-empty').isVisible(),true);
  await page.locator('#conversationSearch').fill('Amigo');
  assert.equal(await page.locator('[data-chat-user="friend"]').isVisible(),true);
  await page.locator('#conversationSearch').fill('');

  assert.equal(await page.locator(".community-tabs").count(), 0);
  await page.evaluate(() => window.emitIncoming());
  await page.locator('[data-message="incoming"]').waitFor();
  const chatBox = await page.locator(".modern-chat").boundingBox(),
    contentBox = await page.locator("#content").boundingBox(),
    compose = await page.locator("#liveMessageForm").boundingBox();
  assert.ok(chatBox.width >= contentBox.width - 40);
  assert.ok(chatBox.height >= contentBox.height - 100);
  assert.ok(compose.y + compose.height <= 1080);
  await page.screenshot({ path: "preview/chat-check.png" });
  await page.locator("#notificationBell").click();
  const bellBox=await page.locator('#notificationBell').boundingBox(),noticeBox=await page.locator('#notificationPopup').boundingBox();
  assert.ok(noticeBox.x >= (await page.locator('.sidebar').boundingBox()).width,'Notificações não devem cobrir o menu');
  assert.ok(Math.abs(noticeBox.y-bellBox.y)<16,'Notificações devem acompanhar a altura do sininho');
  await page.screenshot({ path: "preview/notifications-reference.png" });
  await page.locator('[data-notice="n1"]').click();
  await page.locator("#liveMessages").waitFor();
  await page.locator("#notificationBell").click();
  await page.locator("#clearNotices").click();
  await page.locator("#notificationPopup .empty").waitFor();
  await page.locator("#closeNotifications").click();
  await page.locator("#friendsDockToggle").click();
  await page.locator('[data-dock-status="ausente"]').click();
  await page.waitForFunction(() =>
    window.saved.some(
      (s) => s.c === "update_profile" && s.p.input.status === "ausente",
    ),
  );
  const friendsDockClose = page.locator("#friendsDockClose");
  if (await friendsDockClose.isVisible()) await friendsDockClose.click();
  await page.locator("#sidebarAccount").click();
  await page.locator(".complete-profile").waitFor();
  await page.locator("#content.profile-user-background").waitFor();
  await page.locator("#profile-featured").waitFor();
  assert.equal(await page.locator("#profile-featured").isVisible(),true);
  await page.evaluate(()=>{window.holdProfilePreparation=true;window.profilePreparation=renderProfile()});
  assert.equal(await page.locator('#content').evaluate(n=>getComputedStyle(n).visibility),'hidden');
  await page.locator('#viewPreparation').waitFor();
  await page.evaluate(()=>{window.holdProfilePreparation=false;window.releaseProfilePreparation()});
  await page.evaluate(()=>window.profilePreparation);
  assert.equal(await page.locator('#content').evaluate(n=>getComputedStyle(n).visibility),'visible');
  assert.equal(await page.locator("#appShell").evaluate((n) => n.classList.contains("profile-background-active")), true);
  assert.notEqual(
    await page.locator(".complete-profile").evaluate(
      (n) => getComputedStyle(n).boxShadow,
    ),
    "none",
    "O cabeçalho do perfil deve ter uma elevação visual sutil.",
  );
  assert.notEqual(
    await page.locator("#profileOverview .level-card progress").evaluate(
      (n) => getComputedStyle(n).borderRadius,
    ),
    "0px",
    "A barra de progressão deve usar o estilo arredondado do tema.",
  );
  assert.equal(
    await page.locator(".sidebar").evaluate((n) => {
      const color=getComputedStyle(n).backgroundColor;
      return color.startsWith('rgb(')||/rgba\([^)]*,\s*1\)$/.test(color);
    }),
    true,
    "A barra lateral deve manter fundo opaco independente da cor do tema",
  );
  await page.setViewportSize({ width: 980, height: 860 });
  const minimumWidthProfile = await page.locator(".complete-profile").boundingBox(),
    minimumWidthContent = await page.locator("#content").boundingBox(),
    minimumWidthBody = await page.locator(".complete-profile .profile-body").boundingBox(),
    minimumWidthInfo = await page.locator(".complete-profile .profile-info").boundingBox(),
    minimumWidthActions = await page.locator(".complete-profile .profile-actions").boundingBox();
  assert.ok(minimumWidthProfile.x >= minimumWidthContent.x);
  assert.ok(minimumWidthProfile.x + minimumWidthProfile.width <= minimumWidthContent.x + minimumWidthContent.width);
  assert.ok(minimumWidthInfo.x + minimumWidthInfo.width <= minimumWidthBody.x + minimumWidthBody.width);
  assert.ok(minimumWidthActions.x + minimumWidthActions.width <= minimumWidthBody.x + minimumWidthBody.width);
  await page.setViewportSize({ width: 800, height: 900 });
  assert.equal(
    Math.round(await page.locator(".sidebar").evaluate((n) => n.getBoundingClientRect().width)),
    68,
    "A barra lateral deve compactar em janelas estreitas",
  );
  const narrowContent = await page.locator("#content").boundingBox(),
    narrowProfile = await page.locator(".complete-profile").boundingBox(),
    narrowOverview = await page.locator(".profile-overview-columns").boundingBox();
  assert.ok(narrowProfile.x >= narrowContent.x);
  assert.ok(narrowProfile.x + narrowProfile.width <= narrowContent.x + narrowContent.width);
  assert.ok(narrowOverview.x >= narrowContent.x);
  assert.equal(
    await page.locator(".profile-overview-columns").evaluate((n) => getComputedStyle(n).gridTemplateColumns.split(" ").length),
    1,
    "A progressão deve ficar acima do conteúdo em janelas estreitas",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  assert.equal(
    await page
      .locator(
        '[data-profile-section="library"],[data-profile-section="statistics"]',
      )
      .count(),
    0,
  );
  await page.locator("#profileAction").click();
  await page.locator(".profile-editor").waitFor();
  await page.locator('[data-profile-tab="appearance"]').click();
  assert.equal(await page.locator("#desktopProfileBackground").count(), 1);
  assert.equal(await page.locator('.profile-image-studio input[type="range"], .profile-editor input[type="url"]').count(), 0);
  const imageFixture=path.resolve('../tests/fixtures/profile-images/valid.png');
  await page.locator('[name="bannerFile"]').setInputFiles(imageFixture);
  await page.locator('[data-image-crop="cover"].has-image').waitFor();
  const cropCover=page.locator('[data-image-crop="cover"]');
  await page.locator('[data-image-plus="cover"]').click();
  await page.locator('[data-image-plus="cover"]').click();
  const cb=await cropCover.boundingBox(),oldY=Number(await page.locator('[name="coverY"]').inputValue());
  await page.mouse.move(cb.x+cb.width/2,cb.y+cb.height/2);await page.mouse.down();await page.mouse.move(cb.x+cb.width/2+24,cb.y+cb.height/2+30,{steps:6});await page.mouse.up();
  assert.ok(Number(await page.locator('[name="coverY"]').inputValue())<oldY,'Arrastar a capa para baixo deve mover o recorte');
  const beforeWheel=Number(await page.locator('[name="coverZoom"]').inputValue());
  await page.mouse.wheel(0,-100);await page.waitForFunction(z=>Number(document.querySelector('[name="coverZoom"]').value)>z,beforeWheel);
  const savedCoverPosition=await page.locator('[name="coverY"]').inputValue();
  await page.locator('[name="avatarFile"]').setInputFiles(imageFixture);
  await page.locator('[data-image-crop="avatar"].has-image').waitFor();
  await page.locator('[data-image-plus="avatar"]').click();
  const cropAvatar=page.locator('[data-image-crop="avatar"]');await cropAvatar.focus();await page.keyboard.press('ArrowRight');
  assert.ok(Number(await page.locator('[name="avatarX"]').inputValue())<50);
  await page.locator('[data-profile-tab="info"]').click();await page.locator('[data-profile-tab="appearance"]').click();
  assert.equal(await page.locator('[name="coverY"]').inputValue(),savedCoverPosition,'Trocar de aba não perde o enquadramento');
  await page.screenshot({path:'preview/profile-image-studio.png'});

  assert.equal(
    await page.locator('.profile-editor [name="steamId"]').getAttribute("type"),
    "hidden",
  );
  await page.locator('[data-profile-tab="highlights"]').click();
  await page.locator('.picks-game-grid').waitFor();
  assert.equal(await page.locator('.profile-highlights .picks-search input').count(), 1);
  const pick = page.locator('[data-pick-game]').first();
  if (await pick.count()) {
    if (!(await pick.isChecked())) await pick.locator("..").click();
    assert.equal(await pick.isChecked(), true);
    const selected = await page.locator('[data-picks-values] [name="games"]:checked').count();
    await page.locator('.picks-search input').fill('no-result-profile-regression');
    assert.equal(await page.locator('[data-pick-game]').count(), 0);
    assert.equal(await page.locator('[data-picks-values] [name="games"]:checked').count(), selected);
    await page.locator('.picks-search input').fill('');
  }
  await page.locator('[data-picks-tab="achievements"]').click();
  assert.equal(await page.locator('[data-picks-page="games"]').isVisible(), false);
  assert.equal(await page.locator('[data-picks-page="achievements"]').isVisible(), true);
  assert.equal(await page.locator('[data-save-profile]').isVisible(), true);
  await page.screenshot({ path: "preview/profile-editor-highlights-check.png" });
  await page.locator('[data-save-profile]').click();
  await page.waitForFunction(()=>!document.querySelector('.profile-editor'));
  const imageSave=await page.evaluate(()=>({uploads:window.saved.filter(s=>s.c==='upload_profile_image'),profile:window.saved.filter(s=>s.c==='update_profile').at(-1)}));
  assert.deepEqual(imageSave.uploads.map(s=>s.p.input.name),['banner','avatar']);
  assert.match(imageSave.profile.p.input.banner,/#bc-cover=/);
  assert.equal(imageSave.uploads[1].p.input.mime,'image/webp');
  const exportedAvatar=await page.evaluate(async b64=>{const image=new Image();image.src='data:image/webp;base64,'+b64;await image.decode();return [image.naturalWidth,image.naturalHeight];},imageSave.uploads[1].p.input.base64);
  assert.deepEqual(exportedAvatar,[512,512]);
  const writesBeforeCancel=await page.evaluate(()=>window.saved.filter(x=>['upload_profile_image','update_profile'].includes(x.c)).length);
  await page.locator('#profileAction').click();await page.locator('[data-profile-tab="appearance"]').click();
  await page.locator('[name="avatarFile"]').setInputFiles(imageFixture);await page.locator('[data-image-crop="avatar"].has-image').waitFor();
  await page.locator('[data-image-plus="avatar"]').click();await page.locator('[data-image-reset="avatar"]').click();
  assert.equal(await page.locator('[name="avatarZoom"]').inputValue(),'100');
  await page.locator('[data-image-remove="avatar"]').click();await page.waitForFunction(()=>!document.querySelector('[data-image-crop="avatar"]').classList.contains('has-image'));
  assert.equal(await page.locator('[name="avatar"]').inputValue(),'');
  await page.locator('.profile-editor [data-close]').first().click();
  assert.equal(await page.evaluate(()=>window.saved.filter(x=>['upload_profile_image','update_profile'].includes(x.c)).length),writesBeforeCancel,'Cancelar o recorte não envia nem remove imagens');

  await page.locator(".mission-period").first().waitFor();
  assert.match(
    await page
      .locator(".profile-cover-art")
      .evaluate((n) => getComputedStyle(n).backgroundImage),
    /data:image/,
  );
  await page.waitForFunction(() =>
    document
      .querySelector("#profileOverview .friend-grid img")
      ?.src.startsWith("data:image"),
  );
  await page.screenshot({ path: "preview/profile-banner-check.png" });
  assert.equal(await page.locator(".mission-period").count(), 2);
  assert.match(
    await page.locator(".mission-objective").first().innerText(),
    /Adicion(?:ar|e).*biblioteca/i,
  );
  await page.locator('[data-profile-section="achievements"]').click();
  assert.equal(await page.locator(".achievement").count(), 32);
  await page.screenshot({ path: "preview/profile-check.png" });
  await page.evaluate(() => {
    state.profileUser = "friend";
    return navigate("profile");
  });
  await page
    .locator(".profile-info p")
    .filter({ hasText: "Bio do amigo" })
    .waitFor();
  assert.equal(await page.locator("#profileMissions").innerText(), "");
  assert.equal(
    await page.locator('[data-profile-section="statistics"]').count(),
    0,
  );
  await page.locator('[data-profile-section="library"]').click();
  await page.locator('#profileLibrary [data-detail="1"]').click();
  await page.locator(".reference-detail").waitFor();
  assert.equal(await page.locator("#editInformation").count(), 0);
  await page.locator('[data-detail-tab="notes"]').click();
  assert.equal(await page.locator("#detailNotesForm").count(), 0);
  await page.locator(".reference-detail [data-close]").click();
  await page.locator('[data-view="media"]').click();
  await page.locator("#addItem").click();
  assert.equal(
    await page
      .locator('[name="conquistas"],[name="tempo_est"],[name="steam_appid"]')
      .count(),
    0,
  );
  await page.locator(".editor [data-close]").first().click();
  await page.locator('[data-detail="f1"]').click();
  await page.locator(".reference-detail").waitFor();
  assert.equal(await page.locator("[data-detail-tab]").count(), 5);
  assert.equal(
    await page.locator('[data-detail-tab="achievements"]').count(),
    0,
  );
  await page.locator(".reference-detail [data-close]").click();
  await page.locator('[data-media-kind="series"]').click();
  await page.locator('[data-detail="serie1"]').click();
  await page.locator("[data-detail-progress]").waitFor();
  await page.evaluate(() => (window.missingJourney = true));
  await page.locator("[data-detail-progress]").click();
  await page.locator(".episode-activation").waitFor();
  assert.match(
    await page.locator(".episode-activation").innerText(),
    /ativar-desktop-0.12.1.sql/,
  );
  await page.evaluate(() => (window.missingJourney = false));
  await page.locator(".episode-activation [data-retry]").click();
  await page.locator(".episode-progress form").waitFor();
  await page
    .locator('.episode-progress [data-progress-action="next_episode"]')
    .click();
  await page.waitForFunction(() =>
    window.saved.some((s) => s.c === "next_episode" && s.p.revision === 1),
  );
  await page.locator(".episode-progress [data-close]").click();
  await page.locator(".reference-detail [data-close]").click();
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.screenshot({ path: "preview/profile-qhd-check.png" });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.locator('[data-view="library"]').click();
  await page.locator("#libraryGroups").waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({ path: "preview/library-hd-check.png" });
  // Preset ratings preserve text; deletion uses an in-app confirmation.
  await page.evaluate(async()=>{state.libraryCategory='jogos';await navigate('library')});
  await page.locator('#addItem').click();
  await page.locator('.catalog-optional summary').click();
  await page.locator('[name="nota"]').selectOption('⭐⭐⭐⭐ Muito bom');
  assert.equal(await page.locator('[name="nota"]').inputValue(),'⭐⭐⭐⭐ Muito bom');
  await page.locator('[data-item-tab="cover"]').click();
  await page.getByRole('button',{name:'SteamGridDB',exact:true}).click();
  await page.locator('.cover-picker').waitFor();
  assert.equal(await page.locator('.cover-picker [data-cover-option]').count(),2);
  await page.locator('[data-picker-format="landscape"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.cover-picker [data-cover-option]').length===1);
  await page.locator('.cover-picker [data-cover-option]').first().click();
  await page.waitForFunction(()=>document.querySelector('[name="capa"]').value.includes('landscape-one.png'));
  await page.getByRole('button',{name:'SteamGridDB',exact:true}).click();
  await page.locator('[data-picker-format="poster"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.cover-picker [data-cover-option]').length===2);
  await page.locator('.cover-picker [data-cover-option]').first().click();
  await page.waitForFunction(()=>document.querySelector('[name="capa"]').value.includes('portrait-one.png'));
  const chosenGrid=await page.locator('[name="capa"]').inputValue();
  await page.locator('#editorCoverOrientation').selectOption('landscape');
  assert.equal(await page.locator('[name="capa"]').inputValue(),chosenGrid);
  await page.locator('#editorCoverOrientation').selectOption('poster');
  assert.equal(await page.locator('[name="capa"]').inputValue(),chosenGrid);
  await page.locator('.editor-overlay [data-close]').first().click();
  await page.evaluate(()=>openItemEditor({id:999,nome:'Regressão decimal',categoria:'jogos',status:'🎮 Em Progresso',plataforma:'💻 PC',loja:'Steam',conquistas:13.79,tempo_est:12.5,horas:3.775}));
  await page.locator('[data-item-tab="progress"]').click();
  assert.equal(await page.locator('[name="conquistas"]').evaluate(n=>n.checkValidity()),true);
  assert.equal(await page.locator('[name="tempo_est"]').evaluate(n=>n.checkValidity()),true);
  await page.locator('[name="conquistas"]').fill('100.01');
  assert.equal(await page.locator('[name="conquistas"]').evaluate(n=>n.checkValidity()),false);
  await page.locator('[name="conquistas"]').fill('-0.01');
  assert.equal(await page.locator('[name="conquistas"]').evaluate(n=>n.checkValidity()),false);
  await page.locator('[name="conquistas"]').fill('13.79');
  await page.locator('.editor button.primary').click();
  await page.waitForFunction(()=>window.saved.some(s=>s.c==='save_item'&&s.p.item.nome==='Regressão decimal'));
  const decimalSaved=await page.evaluate(()=>window.saved.find(s=>s.c==='save_item'&&s.p.item.nome==='Regressão decimal').p.item);
  assert.equal(decimalSaved.conquistas,13.79);
  assert.equal(decimalSaved.tempo_est,12.5);
  assert.equal(decimalSaved.horas,3.775);
  await page.evaluate(()=>{window.batcavernaConfirm('Excluir teste?').then(value=>window.confirmResult=value)});
  await page.locator('.app-confirm-dialog [data-cancel]').click();
  await page.waitForFunction(()=>window.confirmResult===false);
  await page.evaluate(async()=>{window.testGroups=[{id:'group-test',nome:'Grupo de teste',criado_por:'test'}];window.testGroupMembers=[{user_id:'test',admin:true},{user_id:'member-2',nome:'Luna',admin:false}];window.testGroupMessages=[{id:'g-author',remetente_id:'member-2',texto:'Vamos jogar?',created_at:new Date().toISOString()}];await navigate('friends')});
  await page.locator('.community-split-tabs [data-pane="groups"]').click();
  await page.locator('[data-group="group-test"]').click();
  await page.locator('[data-message="g-author"] .message-author').waitFor();
  assert.equal(await page.locator('[data-message="g-author"] .message-author').innerText(),'Luna');
  await page.locator('#liveChatText').fill('Mensagem de grupo sem duplicação');
  await page.evaluate(()=>{const form=document.querySelector('#liveMessageForm');form.requestSubmit();form.requestSubmit();});
  await page.waitForFunction(()=>document.querySelector('#liveChatText').value==='');
  assert.equal(await page.evaluate(()=>window.saved.filter(x=>x.c==='group_send'&&x.p.text==='Mensagem de grupo sem duplicação').length),1);
  for(const size of [{width:980,height:760},{width:1920,height:1080}]){await page.setViewportSize(size);const composer=await page.locator('#liveMessageForm').boundingBox(),content=await page.locator('#content').boundingBox();assert.ok(composer.x>=content.x&&composer.x+composer.width<=content.x+content.width+1);assert.ok(composer.y+composer.height<=size.height);}


  await page.evaluate(()=>{window.testGroupMessages=Array.from({length:80},(_,i)=>({id:'unread-'+i,remetente_id:'member-2',texto:'Mensagem de histórico '+i+' · '.repeat(30),created_at:new Date(Date.UTC(2026,9,12,10,i)).toISOString()}));window.saved=window.saved.filter(x=>x.c!=='read_group');return renderChat()});
  await page.locator('[data-chat-unread]').waitFor();assert.equal(await page.locator('#chatUnreadJump').isVisible(),true);
  assert.equal(await page.evaluate(()=>window.saved.filter(x=>x.c==='read_group').length),0);
  await page.evaluate(()=>{window.testGroupMessages.push({id:'latest-unread',remetente_id:'member-2',texto:'Chegou enquanto você lê',created_at:'2026-10-12T13:00:00Z'});window.listeners['desktop-change']({payload:{userId:'test',data:{table:'clt_chat_group_messages'}}})});
  await page.locator('[data-message="latest-unread"]').waitFor();assert.equal(await page.evaluate(()=>window.saved.filter(x=>x.c==='read_group').length),0);
  await page.screenshot({path:'preview/chat-unread-check.png'});await page.locator('#chatUnreadJump').click();await page.waitForFunction(()=>window.saved.some(x=>x.c==='read_group'&&x.p.through==='2026-10-12T13:00:00Z'));
  await page.getByRole('button',{name:'⚙ Configurações do grupo'}).click();
  await page.locator('.group-settings-dialog [data-photo]').waitFor();
  assert.equal(await page.locator('.group-settings-dialog [data-remove="member-2"]').count(),1);
  await page.screenshot({path:'preview/group-settings-check.png'});
  await page.locator('.group-settings-dialog [data-close]').click();
  await page.evaluate(async()=>{window.largeLibrary=true;state.libraryCategory='jogos';state.libraryStatus='all';state.libraryQuery='';state.cavernFilter='all';await navigate('library')});
  assert.equal(await page.locator('#libraryGroups .cinema-card').count(),48,'Only first 24 cards per status should be mounted');
  assert.match(await page.locator('.collection-result-count').innerText(),/1200/);
  await page.evaluate(()=>window.firstLibraryCard=document.querySelector('#libraryGroups [data-detail="large-0"]'));
  await page.locator('[data-status-group="backlog"] .collection-more').scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelectorAll('#libraryGroups .cinema-card').length===72);
  assert.equal(await page.locator('#libraryGroups .cinema-card').count(),72);
  assert.equal(await page.evaluate(()=>window.firstLibraryCard===document.querySelector('#libraryGroups [data-detail="large-0"]')),true,'Expanding keeps original cards and image state');

  await page.evaluate(()=>{state.librarySort='recent';document.querySelector('#librarySort').value='recent';drawLibrary();});
  await page.locator('[data-status-group="backlog"] .cinema-card').nth(10).scrollIntoViewIfNeeded();
  await page.evaluate(()=>{window.beforeLibraryScale=document.documentElement.style.getPropertyValue('--ui-scale');document.documentElement.style.setProperty('--ui-scale','1.2');});
  const keptPosition=await page.evaluate(()=>{const root=document.querySelector('#content'),box=document.querySelector('#libraryGroups'),before=window.BatLibraryQuery.capture(root,box),row=state.libraryRows.find(r=>String(r.id)===before.id);if(!row)throw Error('Visible library title not found');window.batcavernaRefreshLibraryItem({...row,updated_at:'2099-01-01T00:00:00Z'});const item=[...box.querySelectorAll('[data-detail]')].find(n=>n.dataset.detail===before.id);return {offset:before.offset,after:item.getBoundingClientRect().top-root.getBoundingClientRect().top,scroll:root.scrollTop};});
  assert.ok(Math.abs(keptPosition.offset-keptPosition.after)<2,'Editar um título deve manter o ponto da biblioteca');
  const reloadedPosition=await page.evaluate(async()=>{const root=document.querySelector('#content'),before=window.BatLibraryQuery.capture(root,document.querySelector('#libraryGroups'));await renderLibrary();const box=document.querySelector('#libraryGroups'),item=[...box.querySelectorAll('[data-detail]')].find(n=>n.dataset.detail===before.id);return {before:before.offset,after:item.getBoundingClientRect().top-root.getBoundingClientRect().top};});
  assert.ok(Math.abs(reloadedPosition.before-reloadedPosition.after)<2,'Recarregar após a edição deve manter o título visível');

  await page.evaluate(()=>{if(window.beforeLibraryScale)document.documentElement.style.setProperty('--ui-scale',window.beforeLibraryScale);else document.documentElement.style.removeProperty('--ui-scale');});
  await page.locator('#librarySearch').fill('Coleção 0999');
  await page.waitForFunction(()=>document.querySelectorAll('#libraryGroups .cinema-card').length===1);
  assert.equal(await page.locator('#libraryGroups [data-detail="large-999"]').count(),1,'Search includes unloaded titles');
  await page.screenshot({path:'preview/large-library-check.png'});
  await page.evaluate(()=>{window.largeLibrary=false;state.libraryQuery=''});

  const libraryFixture=JSON.parse(fs.readFileSync(path.resolve('../tests/fixtures/library-query.json'),'utf8'));
  await page.evaluate(async rows=>{window.libraryQueryRows=rows;state.libraryCategory='jogos';state.libraryStatus='all';state.libraryQuery='';state.cavernFilter='all';state.librarySort='recent';await navigate('library');},libraryFixture);
  await page.locator('#librarySort').selectOption('rating');
  assert.deepEqual(await page.locator('#libraryGroups [data-detail]').evaluateAll(nodes=>nodes.map(n=>n.dataset.detail)),['1','3','2','5']);
  await page.locator('#librarySearch').fill('ecarlate POKEMON');
  await page.waitForFunction(()=>document.querySelectorAll('#libraryGroups [data-detail]').length===1);
  await page.locator('#libraryGenre').selectOption('Ação');await page.locator('#libraryPlatform').selectOption('PC');
  await page.evaluate(()=>renderLibrary());
  assert.equal(await page.locator('#libraryGenre').inputValue(),'Ação');assert.equal(await page.locator('#libraryPlatform').inputValue(),'PC');assert.equal(await page.locator('#librarySort').inputValue(),'rating');

  await page.locator('#libraryGroups [data-detail="1"]').click();await page.locator('#editInformation').waitFor();await page.locator('#editInformation').click();
  await page.locator('.item-editor-modern [name="nome"]').fill('Pokémon Écarlate — Edição teste');
  await page.locator('.item-editor-modern footer button.primary').click();
  await page.waitForFunction(()=>!document.querySelector('.item-editor-modern'));
  await page.waitForFunction(()=>document.querySelector('#libraryGroups [data-detail="1"]')?.textContent.includes('Edição teste'));

  assert.equal(await page.locator('#librarySearch').inputValue(),'ecarlate POKEMON');assert.equal(await page.locator('#libraryPlatform').inputValue(),'PC');
  await page.screenshot({path:'preview/library-filters-check.png'});
  await page.locator('[data-clear-library-filters]').click();
  assert.equal(await page.locator('#librarySearch').inputValue(),'');assert.equal(await page.locator('#libraryGenre').inputValue(),'');assert.equal(await page.locator('#libraryPlatform').inputValue(),'');assert.equal(await page.locator('#librarySort').inputValue(),'rating');assert.equal(await page.locator('#libraryGroups [data-detail]').count(),4);

  await page.evaluate(async()=>{state.libraryCategory='series';await renderLibrary();});
  assert.equal(await page.locator('#libraryPlatform').getAttribute('aria-label'),'Onde assistir');
  assert.equal(await page.locator('#libraryPlatform option[value="PC"]').count(),0);
  await page.locator('#libraryPlatform').selectOption('Prime Video');
  assert.equal(await page.locator('#libraryGroups [data-detail="4"]').count(),1);
  await page.screenshot({path:'preview/library-media-filters-check.png'});
  await page.evaluate(()=>{window.libraryQueryRows=null;});
  const cleanDescription=await page.evaluate(()=>{const node=document.createElement('p');document.body.append(node);window.batcavernaRenderDescription(node,'<p>&amp;quot;How to Fish&amp;quot;</p><p>Pesca &amp; amigos</p>&lt;script&gt;window.descriptionExecuted=true&lt;/script&gt;');const result={text:node.textContent,scripts:node.querySelectorAll('script').length,executed:!!window.descriptionExecuted};node.remove();return result});
  assert.equal(cleanDescription.text,'"How to Fish"\nPesca & amigos');assert.equal(cleanDescription.scripts,0);assert.equal(cleanDescription.executed,false);
  // Optional rail must survive restart and preserve mouse and keyboard navigation.
  await page.setViewportSize({width:1920,height:1080});
  await page.locator('.sidebar-toggle').click();
  assert.equal(await page.locator('.sidebar-toggle').getAttribute('aria-expanded'),'false');
  assert.equal(Math.round((await page.locator('.sidebar').boundingBox()).width),76);
  const iconLibrary=page.locator('#mainNav [data-view="library"]');
  await iconLibrary.hover();
  await page.getByRole('tooltip').filter({hasText:'Biblioteca'}).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('tooltip').isVisible(),false);
  await iconLibrary.focus();
  await page.getByRole('tooltip').filter({hasText:'Biblioteca'}).waitFor();
  await page.keyboard.press('Enter');
  await page.locator('#librarySearch').waitFor();
  assert.equal(await iconLibrary.getAttribute('aria-label'),'Biblioteca');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'preview/sidebar-compact-check.png',animations:'disabled'});
  await page.reload();
  await page.locator('#appShell').waitFor({state:'visible'});
  await page.locator('.sidebar-toggle').waitFor();
  assert.equal(Math.round((await page.locator('.sidebar').boundingBox()).width),76);
  assert.equal(await page.evaluate(()=>localStorage.getItem('bc-sidebar-compact-v1')),'1');
  await page.setViewportSize({width:800,height:900});
  await page.waitForFunction(()=>document.querySelector('.sidebar-toggle').disabled);
  assert.equal(await page.locator('.sidebar-toggle').isDisabled(),true);
  assert.equal(Math.round((await page.locator('.sidebar').boundingBox()).width),68);
  await page.setViewportSize({width:1920,height:1080});
  await page.waitForFunction(()=>!document.querySelector('.sidebar-toggle').disabled);
  await page.locator('.sidebar-toggle').click();
  assert.equal(await page.locator('.sidebar-toggle').getAttribute('aria-expanded'),'true');
  assert.ok((await page.locator('.sidebar').boundingBox()).width>200);
  assert.equal(await page.evaluate(()=>localStorage.getItem('bc-sidebar-compact-v1')),'0');
  await page.screenshot({path:'preview/sidebar-expanded-check.png',animations:'disabled'});
  const savedCoverPerformance=await page.evaluate(async()=>{
    const source='https://images.igdb.com/igdb/image/upload/t_cover_big/regression_saved.jpg',name='Saved Artwork Regression';
    const traffic=window.savedCoverProbe=[];
    const add=()=>{const image=document.createElement('img');image.style.width='10px';Object.assign(image.dataset,{cover:source,coverName:name,coverYear:'2020',coverGame:'1',coverFormat:'poster',coverVisible:'1',steamAppid:'424242'});document.querySelector('#content').append(image);hydrateCovers({querySelectorAll:()=>[image]});return image};
    const wait=image=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Saved artwork did not load')),5000);const ready=()=>{if(image.naturalWidth>1&&image.src.startsWith('data:image')){clearTimeout(timer);resolve()}};image.addEventListener('load',ready);ready()});
    try{const first=add();await wait(first);first.remove();const second=add();await wait(second);second.remove();const choices=JSON.parse(localStorage.getItem('bc-cover-choices-v2:'+state.userId)||'{}');return {lookups:traffic.filter(x=>x.p?.input?.query===name||x.p?.input?.nomes?.includes(name)).length,downloads:traffic.filter(x=>x.c==='cover_image'&&x.p.url===source).length,persistedPayloads:Object.values(choices).some(v=>String(v).startsWith('data:'))};}
    finally{window.savedCoverProbe=null;}
  });
  assert.equal(savedCoverPerformance.lookups,0);assert.equal(savedCoverPerformance.downloads,1);assert.equal(savedCoverPerformance.persistedPayloads,false);
  let oldHintRequests=0;
  await page.route('https://example.test/pinned-custom-cover.jpg',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900"><rect width="600" height="900" fill="purple"/></svg>'}));
  await page.route('https://example.test/previous-cover-must-not-load.jpg',route=>{oldHintRequests++;return route.abort();});
  const fixedCoverChoices=await page.evaluate(async()=>{
    const sources=['https://images.igdb.com/igdb/image/upload/t_cover_big/pinned-choice.jpg','https://cdn2.steamgriddb.com/grid/pinned-choice.png','https://example.test/pinned-custom-cover.jpg'];
    const traffic=window.savedCoverProbe=[];let frames=0;
    const wait=image=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Selected artwork did not load')),5000);const ready=()=>{if(image.naturalWidth>1){clearTimeout(timer);resolve()}};image.addEventListener('load',ready);ready()});
    const add=(source,orientation,name)=>{const key=coverKey(source,name+':2020','424242',orientation,'game');readyImages.delete(key);savedCoverChoice(key,'https://example.test/previous-cover-must-not-load.jpg');const image=document.createElement('img');image.style.width='10px';image.src=cachedCover({nome:name,ano:'2020',steam_appid:'424242',categoria:'jogos',capa:source},orientation);Object.assign(image.dataset,{cover:source,coverName:name,coverYear:'2020',coverGame:'1',coverFormat:orientation,coverVisible:'1',steamAppid:'424242',autoFormat:'1'});document.querySelector('#content').append(image);hydrateCovers({querySelectorAll:()=>[image]});return image};
    try{for(const [index,source]of sources.entries())for(const orientation of ['poster','landscape']){const image=add(source,orientation,'Pinned choice '+index);await wait(image);image.remove();frames++;}
      const healthy=traffic.slice();traffic.length=0;window.failCoverImage=true;const failed='https://images.igdb.com/igdb/image/upload/t_cover_big/pinned-offline.jpg',image=add(failed,'landscape','Pinned offline');await new Promise((resolve,reject)=>{const deadline=Date.now()+5000;const check=()=>{if(image.classList.contains('image-unavailable'))resolve();else if(Date.now()>deadline)reject(Error('Chosen cover did not report failure'));else setTimeout(check,20)};check()});image.remove();
      return {frames,healthy,failed:traffic.slice()};
    }finally{window.savedCoverProbe=null;window.failCoverImage=false;}
  });
  assert.equal(fixedCoverChoices.frames,6);assert.equal(oldHintRequests,0);
  assert.ok(fixedCoverChoices.healthy.every(x=>x.c==='cover_image'&&['https://images.igdb.com/igdb/image/upload/t_cover_big/pinned-choice.jpg','https://cdn2.steamgriddb.com/grid/pinned-choice.png'].includes(x.p.url)));
  assert.ok(fixedCoverChoices.failed.length>0&&fixedCoverChoices.failed.every(x=>x.c==='cover_image'&&x.p.url.endsWith('/pinned-offline.jpg')));
  await page.evaluate(() => showLogin());
  await page.locator("#loginScreen").waitFor({ state: "visible" });
  await page.locator('[data-auth="recover"]').click();
  await page.locator('[data-email-proof="recovery"]').click();
  const proofForm=page.locator('.editor-overlay form');
  await proofForm.locator('[name="email"]').fill('teste@example.com');
  await proofForm.locator('[name="proof"]').fill('123456');
  await proofForm.locator('[name="password"]').fill('NovaSenhaSegura123');
  await proofForm.locator('[name="confirm"]').fill('SenhaDiferente123');
  await proofForm.locator('.primary').click();
  await page.getByText('As senhas devem coincidir.').waitFor();
  assert.equal(await page.evaluate(()=>window.saved.filter(x=>x.c==='verify_email_proof').length),0);
  await proofForm.locator('[name="confirm"]').fill('NovaSenhaSegura123');
  await proofForm.locator('.primary').click();
  await page.locator('.editor-overlay').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>window.saved.filter(x=>x.c==='verify_email_proof').at(-1).p.input.recovery),true);
  assert.equal(await page.evaluate(()=>document.querySelector('#loginForm').hidden),false);
  await page.locator('[data-auth="register"]').click();
  await page.locator('[data-email-proof="signup"]').click();
  await proofForm.locator('[name="email"]').fill('teste@example.com');
  await proofForm.locator('[name="proof"]').fill('123456');
  await proofForm.locator('.primary').click();
  await page.locator('.editor-overlay').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>window.saved.filter(x=>x.c==='verify_email_proof').at(-1).p.input.recovery),false);
  await page.evaluate(()=>window.autoConfirm=true);
  await page.locator('[data-auth="register"]').click();
  const registration=page.locator('#registerForm');
  await registration.locator('[name="name"]').fill('Conta de teste');
  await registration.locator('[name="username"]').fill('contateste');
  await registration.locator('[name="email"]').fill('teste@example.com');
  await registration.locator('[name="password"]').fill('SenhaSeguraTeste123');
  for(const message of ['Essa senha apareceu em vazamentos. Escolha outra senha.','Não foi possível verificar a segurança da senha. Tente novamente em instantes.']){
    await page.evaluate(message=>window.passwordSafetyError=message,message);
    await registration.locator('.primary').click();
    await page.waitForFunction(message=>document.querySelector('#registerForm .error').textContent===message,message);
    assert.equal(await registration.isVisible(),true);
    await page.waitForFunction(()=>!document.querySelector('#registerForm .primary').disabled);
    assert.equal(await page.locator('.editor-overlay').count(),0);
  }
  await page.evaluate(()=>window.passwordSafetyError='');
  await registration.locator('.primary').click();
  await page.locator('#loginForm').waitFor({state:'visible'});
  assert.equal(await page.locator('.editor-overlay').count(),0);
  await page.screenshot({ path: "preview/login-check.png" });
  assert.deepEqual(errors, []);
  assert.deepEqual(await page.evaluate(() => window.unhandledRejections), []);
  console.log(
    "UI OK: início, biblioteca por categorias, comunidade, amigos/chat, detalhes, aparência, presença, notificações, perfil e Full HD/QHD/HD. APIs e eventos simulados.",
  );
}
} catch (error) {
  if (testPage)
    await testPage
      .screenshot({ path: "preview/error-check.png" })
      .catch(() => {});
  throw error;
} finally {
  if (browser) await browser.close();
  server.close();
}

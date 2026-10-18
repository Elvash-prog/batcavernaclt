import { chromium } from "playwright";
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
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });
  testPage = page;
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://**", (r) => r.abort());
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
        },
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
        invoke: async (c, p) => {
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
            return p.input || { background: true, notifications: true };
          }
          if (c === "test_windows_notification") {
            window.saved.push({ c, p });
            return {};
          }
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
          if (c === "library" && window.delayLibrary)
            await new Promise((r) =>
              setTimeout(r, window.libraryDelay || 120),
            );
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
                  : [];
          if (c === "profile")
            return p.userId
              ? { ...friend, stats: { total: 5, finished: 2, hours: 30 } }
              : profile;
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
          if (c === "save_item" || c === "update_profile") {
            window.saved.push({ c, p });
            return {};
          }
          if (c === "notifications") return notices;
          if (c === "mark_notifications_read") {
            notices.forEach((n) => (n.read = true));
            return {};
          }
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
          if (c === "bright_api")
            return {
              capas: ["https://cdn2.steamgriddb.com/cover.jpg"],
              amigos: [],
            };
          if (c === "chat_messages") return messages;
          if (c === "send_message") {
            messages.push({
              id: "m" + (messages.length + 1),
              remetente_id: "test",
              destinatario_id: "friend",
              texto: p.input.text,
              midia_url: p.input.media,
              created_at: new Date().toISOString(),
            });
            window.saved.push({ c, p });
            return {};
          }
          if (c === "community") {
            const i = p.input;
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
            if (i.op === 'group_messages') return [];
            if (i.op === 'group_manage') { window.saved.push({c:'group_manage',p:i});if(i.action==='members')return [{user_id:'test',admin:true},{user_id:'member-2',admin:false}];return []; }
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
            if (i.op === "read_chat") return {};
            if (i.op === "edit_message") {
              messages.find((m) => m.id === i.id).texto = i.text;
              return {};
            }
            if (i.op === "delete_message") {
              messages = messages.filter((m) => m.id !== i.id);
              return {};
            }
            if(i.op==='steam_search')return {results:[{appid:601150,nome:'Devil May Cry 5',capa:'https://shared.cloudflare.steamstatic.com/header.jpg'},{appid:220440,nome:'DmC: Devil May Cry',capa:'https://shared.cloudflare.steamstatic.com/header.jpg'}]};
            if (i.op === "steam_details")
              return {
                nome: i.query || "Resultado Steam",
                steam_appid: i.appid||10,
                generos: [{ description: "Ação" }, { description: "Aventura" }],
                descricao: "Descrição da Steam",
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
                  }
                : {
                    results: [
                      {
                        id: 10,
                        name: "Resultado IGDB",
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
                      name: "Série TMDB",
                      release_date: "2024-01-01",
                      poster_path: "/cover.jpg",
                      genres: [{ name: "Aventura" }],
                      overview: "Descrição",
                    }
                  : {
                      results: [
                        { id: 20, title: "Filme TMDB", name: "Série TMDB" },
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
  await page.goto(origin);
  await page.locator(".home-hero-content h2").waitFor();
  await page.locator(".friend-activity").waitFor();
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
  await page.locator(".home-hero-content .primary").focus();
  assert.equal(
    await page.locator(".home-hero-content .primary").evaluate(
      (button) => getComputedStyle(button).outlineStyle,
    ),
    "solid",
    "A navegação por teclado deve exibir um foco visível.",
  );
  await page.locator(".home-hero-content .primary").evaluate((button) => button.blur());
  assert.match(
    await page.locator(".friend-activity").first().innerText(),
    /Amigo/,
  );
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
  for (const [width, height, name] of [
    [1920, 1080, "home-check.png"],
    [2560, 1440, "home-qhd-check.png"],
    [1280, 720, "home-hd-check.png"],
  ]) {
    await page.setViewportSize({ width, height });
    const hero = await page.locator(".home-hero").boundingBox(),
      activity = await page.locator(".hero-activity").boundingBox(),
      dashboard = await page.locator(".dashboard-columns").boundingBox();
    assert.ok(
      activity.y > hero.y + hero.height,
      `Atividade recente deve ficar abaixo do hero em ${width}px`,
    );
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
  await page.locator('[data-list="list1"]').click();
  await page.locator(".journey-title-card").waitFor();
  assert.match(
    await page.locator(".journey-title-card").innerText(),
    /Jogo zerado/,
  );
  await page.locator('[data-view="recommendations"]').click();
  await page.locator(".recommendation-card").waitFor();
  await page.locator('#recommendCategory').selectOption('Filme');
  assert.equal(await page.locator('.recommendation-card').count(),0);
  await page.locator('#recommendCategory').selectOption('');
  await page.locator('#newRecommendation').click();
  await page.locator('.journey-dialog-form [name="item"]').waitFor();
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
  await page.screenshot({ path: "preview/journey-check.png" });
  await page.evaluate(() => (window.missingJourney = true));
  await page.evaluate(async()=>await navigate('statistics'));
  await page.locator(".statistics-summary").waitFor();
  assert.match(await page.locator(".statistics-summary").innerText(), /30h/);
  assert.equal(await page.locator(".bar-chart>div").count(), 12);
  await page.evaluate(() => (window.missingJourney = false));
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
  await page.evaluate(() => {
    window.mediaDelay = 900;
    window.mediaCalls = 0;
    window.mediaResolved = 0;
    window.slowSocialMedia = true;
  });
  await page.locator('[data-view="social"]').click();
  await page.locator(".community-reference-layout").waitFor();
  const mediaStatus = await page.evaluate(() => ({
    calls: window.mediaCalls,
    resolved: window.mediaResolved,
    posts: document.querySelectorAll(".post").length,
  }));
  assert.ok(
    mediaStatus.calls > 0 && mediaStatus.resolved === 0,
    `A tela social deve aparecer sem aguardar a assinatura das imagens: ${JSON.stringify(mediaStatus)}`,
  );
  await page.waitForFunction(
    () => window.mediaResolved === window.mediaCalls,
  );
  await page.evaluate(() => {
    window.mediaDelay = 0;
    window.slowSocialMedia = false;
  });
  assert.equal(
    await page.locator(".community-reference-layout > aside").count(),
    2,
  );
  await page.locator("#composer textarea").fill("Rascunho da conta");
  assert.equal(
    await page.evaluate(() => localStorage.getItem("bc-desktop-draft:test")),
    "Rascunho da conta",
  );
  const composeBox = await page.locator("#composer").boundingBox(),
    postsBox = await page.locator(".posts").boundingBox();
  assert.ok(
    composeBox.y + composeBox.height <= postsBox.y,
    "Composer must not overlap publications",
  );
  assert.equal(
    await page
      .locator("[data-comment] button")
      .first()
      .evaluate((n) => getComputedStyle(n).whiteSpace),
    "nowrap",
  );
  await page.waitForTimeout(350);
  assert.ok(
    (await page.locator("[data-comment] button").first().boundingBox()).width >=
      72,
  );
  await page.screenshot({ path: "preview/community-check.png" });
  await page.locator(".draft-control").click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("bc-desktop-draft:test")),
    null,
  );
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
    const root = document.createElement("div");
    root.innerHTML =
      '<img data-cover="https://media.rawg.io/failing-cover-smoke-test.jpg" data-cover-name="Falha simulada" data-cover-game="0">';
    document.body.append(root);
    window.coverFailureRoot = root;
    hydrateCovers(root);
    root.querySelector("img").dispatchEvent(new Event("error"));
  });
  await page.waitForFunction(() => window.coverFailureCalls > 0);
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
  await page.locator("#bulkStatus").selectOption("⏸️ Pausado");
  await page.locator("#bulkConfirm").click();
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
  await page.locator('[data-detail="1"]').click();
  await page.locator("#editInformation").waitFor();
  assert.equal(
    await page.locator(".reference-detail [data-detail-tab]").count(),
    6,
  );
  assert.equal(await page.locator(".journey-detail-actions button").count(), 2);
  await page.waitForFunction(
    () =>
      document.querySelector("#detailDescription").textContent ===
      "Descrição da Steam",
  );
  assert.match(await page.locator("#catalogRating").innerText(), /9.0/);
  await page.locator("#autoGenres").click();
  await page.waitForFunction(() =>
    window.saved.some(
      (s) =>
        s.c === "save_item" &&
        Array.isArray(s.p.item.generos) &&
        s.p.item.generos[0] === "Ação",
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
  assert.ok(Math.abs(editBounds.y-listBounds.y)<3,'Ações dos detalhes devem estar alinhadas');
  assert.ok(closeBounds.x>=dialogBounds.x&&closeBounds.x+closeBounds.width<=dialogBounds.x+dialogBounds.width&&closeBounds.y>=dialogBounds.y,'Fechar deve permanecer dentro da janela');
  await page.screenshot({ path: "preview/details-check.png" });
  await page.locator("#editInformation").click();
  await page
    .getByRole("button", { name: "Buscar dados da Steam", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelector('[name="steam_appid"]').value === "10",
  );
  assert.equal(
    await page.locator('[name="generos"]').inputValue(),
    "Ação • Aventura",
  );
  const previousName=await page.locator('[name="nome"]').inputValue();
  await page.locator('[name="nome"]').fill('Devil May Cry V Special Edition');
  await page.evaluate(()=>document.querySelector('[name="steam_appid"]').value='');
  await page.getByRole('button',{name:'Buscar dados da Steam',exact:true}).click();
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
  await page.locator("#catalogQuery").fill("Teste");
  await page.locator("#catalogSearch").click();
  await page.locator("[data-result]").click();
  await page.waitForFunction(
    () => document.querySelector('[name="generos"]').value === "Action",
  );
  await page.locator('[data-item-tab="cover"]').click();
  await page.screenshot({ path: "preview/add-check.png" });
  await page.locator(".editor button.primary").click();
  await page.waitForFunction(() =>
    window.saved.some((s) => s.c === "save_item"),
  );
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
    ["Minha Steam", "Meu Retrô", "Jogos grátis"],
  );
  await page.locator('#mainNav [data-discover-kind="free"]').click();
  await page.waitForFunction(() =>
    document.querySelector('#mainNav [data-discover-kind="free"].active'),
  );
  await page.locator('.free-store-section .offer-card img').first().waitFor();
  let offerBox=await page.locator('.free-store-section .offer-card img').first().boundingBox();
  assert.ok(offerBox.height>offerBox.width*1.4,'Ofertas devem respeitar o formato vertical');
  await page.evaluate(()=>document.body.dataset.cardFormat='landscape');
  offerBox=await page.locator('.free-store-section .offer-card img').first().boundingBox();
  assert.ok(offerBox.width>offerBox.height*1.6,'Ofertas devem respeitar o formato horizontal');
  await page.screenshot({path:'preview/free-landscape-check.png'});
  await page.evaluate(()=>document.body.dataset.cardFormat='poster');
  await page.locator('#mainNav [data-discover-kind="steam"]').click();
  await page.waitForFunction(() =>
    document.querySelector('#mainNav [data-discover-kind="steam"].active'),
  );
  await page.locator('#mainNav [data-discover-kind="retro"]').click();
  await page.locator(".retro-game-card").waitFor();
  await page.waitForFunction(() =>
    document.querySelector('#mainNav [data-discover-kind="retro"].active'),
  );
  await page.waitForTimeout(800);
  assert.match(await page.locator('.retro-profile').evaluate(n=>getComputedStyle(n).backgroundImage),/data:image/,'A capa privada do Retrô deve ser carregada autenticada');
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
  await page.locator("#checkUpdates").click();
  await page.getByRole("dialog", { name: "Atualização disponível" }).waitFor();
  assert.match(
    await page.locator(".update-confirm-modal").innerText(),
    /0\.17\.21/,
  );
  await page.locator(".update-confirm-modal [data-update-cancel]").first().click();
  await page.locator("#checkUpdates").click();
  await page.getByRole("dialog", { name: "Atualização disponível" }).waitFor();
  await page.locator(".update-confirm-modal [data-update-install]").click();
  await page.waitForFunction(() =>
    window.saved.some((s) => s.c === "install_update"),
  );
  await page.evaluate(async()=>await navigate('lists'));
  await page.locator('[data-list="list1"]').click();
  await page.locator('[data-list-library]').first().click();
  await page.locator('.editor-overlay form [name="nome"]').waitFor();
  assert.equal(await page.locator('.editor-overlay form [name="nome"]').inputValue(),'Jogo zerado');
  await page.locator('.editor-overlay [data-close]').first().click();
  await page.evaluate(async()=>{await navigate('settings');state.settingsTab='appearance';await renderSettings()});
  await page.locator('[data-theme-preset="Claro"]').click();
  assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('light-theme')),true);
  const light=await page.locator('#settingsPanel').evaluate(n=>({background:getComputedStyle(n).backgroundColor,color:getComputedStyle(n).color}));
  assert.match(light.background,/255, 255, 255/);
  assert.notEqual(light.color,'rgb(255, 255, 255)');
  await page.screenshot({path:'preview/light-settings-check.png'});
  await page.locator('[data-theme-preset="Caverna"]').click();
  await page.evaluate(async()=>{state.settingsTab='app';await renderSettings()});
  await page.locator('[data-credits]').click();
  await page.getByText('Créditos e serviços',{exact:true}).last().waitFor();
  assert.equal(await page.locator('#settingsPanel img[alt="TMDB"]').count(),1);
  assert.match(await page.locator('#settingsPanel').innerText(),/not endorsed or certified by TMDB/);
  await page.evaluate(async()=>await navigate('home'));
  await page.locator('[data-clear-activity]').click();
  assert.equal(await page.locator('#updateToast:empty').count(),0,'Limpar não deve criar aviso de atualização vazio');
  assert.equal(await page.locator('.cavern-recent [data-update]').count(),0);
  await page.evaluate(async()=>await navigate('home'));
  assert.equal(await page.locator('.cavern-recent [data-update]').count(),0);
  await page.evaluate(async()=>{localStorage.removeItem('bc-activity-cleared:'+state.userId);await navigate('social')});
  await page.locator('.feed-media img').waitFor();
  await page.locator('.feed-media img').click();
  await page.locator('.community-image-full').waitFor();
  assert.ok(await page.locator('.community-image-full').getAttribute('src'));
  await page.locator('.community-image-viewer [data-close]').click();
  assert.equal(await page.locator('.community-image-full').count(),0);
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
  await page.locator("#desktopBackground").uncheck();
  await page.locator("#saveDesktopPreferences").click();
  await page.waitForFunction(() =>
    window.saved.some(
      (s) => s.c === "desktop_preferences" && s.p.input?.background === false,
    ),
  );
  await page.locator("#testWindowsNotification").click();
  await page.waitForFunction(() =>
    window.saved.some((s) => s.c === "test_windows_notification"),
  );
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
  await page.locator('[data-message="m1"] .message-menu summary').click();
  await page.locator('[data-reply="m1"]').click();
  await page.locator("#liveChatText").fill("Resposta");
  await page.locator("#liveMessageForm button.primary").click();
  await page.waitForFunction(() =>
    window.saved.some(
      (s) => s.c === "send_message" && s.p.input.text === "> Olá!\nResposta",
    ),
  );
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
  assert.ok(Math.abs(noticeBox.x-bellBox.x)<16,'Notificações devem abrir junto do sininho');
  assert.ok(noticeBox.y>=bellBox.y+bellBox.height&&noticeBox.y-bellBox.y-bellBox.height<20,'Notificações devem abrir logo abaixo do sininho');
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
  assert.equal(
    await page.locator('.profile-editor [name="steamId"]').getAttribute("type"),
    "hidden",
  );
  await page.locator(".profile-editor [data-close]").first().click();
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
  await page.locator('[name="nota"]').selectOption('⭐⭐⭐⭐ Muito bom');
  assert.equal(await page.locator('[name="nota"]').inputValue(),'⭐⭐⭐⭐ Muito bom');
  await page.locator('.editor-overlay [data-close]').first().click();
  await page.evaluate(()=>{window.batcavernaConfirm('Excluir teste?').then(value=>window.confirmResult=value)});
  await page.locator('.app-confirm-dialog [data-cancel]').click();
  await page.waitForFunction(()=>window.confirmResult===false);
  await page.evaluate(async()=>{window.testGroups=[{id:'group-test',nome:'Grupo de teste',criado_por:'test'}];await navigate('friends')});
  await page.locator('.community-split-tabs [data-pane="groups"]').click();
  await page.locator('[data-group="group-test"]').click();
  await page.getByRole('button',{name:'⚙ Configurações do grupo'}).click();
  await page.locator('.group-settings-dialog [data-photo]').waitFor();
  assert.equal(await page.locator('.group-settings-dialog [data-remove="member-2"]').count(),1);
  await page.screenshot({path:'preview/group-settings-check.png'});
  await page.locator('.group-settings-dialog [data-close]').click();
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
  await registration.locator('.primary').click();
  await page.locator('#loginForm').waitFor({state:'visible'});
  assert.equal(await page.locator('.editor-overlay').count(),0);
  await page.screenshot({ path: "preview/login-check.png" });
  assert.deepEqual(errors, []);
  assert.deepEqual(await page.evaluate(() => window.unhandledRejections), []);
  console.log(
    "UI OK: início, biblioteca por categorias, comunidade, amigos/chat, detalhes, aparência, presença, notificações, perfil e Full HD/QHD/HD. APIs e eventos simulados.",
  );
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

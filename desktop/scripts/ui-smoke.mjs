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
          if(c === "verify_email_proof") { window.saved.push({c,p});return {message:p.input.recovery?"Senha atualizada. Entre com sua nova senha.":"E-mail confirmado. Você já pode entrar."}; }
          if(c === "resend_confirmation" || c === "recover_password") return {sent:true};
          if (c === "launcher_settings") return { wallpaper: null };
          if (c === "launcher_permission") return !!window.adminMode;
          if (c === "set_login_background") {
            window.saved.push({ c, p });
            return { wallpaper: p.url };
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
          if(c==='bright_api'&&p.input.op==='raCollection')return {cover_url:'https://luoqlhgfmixvfqbfcdoc.supabase.co/storage/v1/object/public/avatars/test/retro-private.webp',game_ids:[]};
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
            if (i.provider === "rawg" && i.recommend)
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
            if (i.provider === "rawg")
              return i.id
                ? {
                    id: 10,
                    name: "Resultado RAWG",
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
                        name: "Resultado RAWG",
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
  await page.locator("#emailForm [data-close]").click();
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
    await page.locator(".profile-overview-columns").evaluate((n) => …28415 tokens truncated…= "3f6221d9a6003c78398e3b239969f352578258df48c8eb051caadae0015bc840"
dependencies = [
 "filetime",
 "libc",
 "xattr",
]

[[package]]
name = "target-lexicon"
version = "0.12.16"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "61c41af27dd6d1e27b1b16b489db798443478cef1f06a660c96db617ba5de3b1"

[[package]]
name = "tauri"
version = "2.12.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f316751027fc2644221d1a448564d519efb07067fda584879d9cda966391d212"
dependencies = [
 "anyhow",
 "bytes",
 "cookie",
 "dirs",
 "dunce",
 "embed_plist",
 "getrandom 0.3.4",
 "glob",
 "gtk",
 "heck 0.5.0",
 "http",
 "jni 0.21.1",
 "libc",
 "log",
 "mime",
 "muda",
 "objc2",
 "objc2-app-kit",
 "objc2-foundation",
 "objc2-ui-kit",
 "objc2-web-kit",
 "percent-encoding",
 "plist",
 "raw-window-handle",
 "reqwest 0.13.5",
 "serde",
 "serde_json",
 "serde_repr",
 "serialize-to-javascript",
 "swift-rs",
 "tauri-build",
 "tauri-macros",
 "tauri-runtime",
 "tauri-runtime-wry",
 "tauri-utils",
 "thiserror 2.0.21",
 "tokio",
 "tray-icon",
 "url",
 "webkit2gtk",
 "webview2-com",
 "window-vibrancy",
 "windows",
]

[[package]]
name = "tauri-build"
version = "2.7.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "641dd5fd297c99ab92717b0428cca5b9c6f960b2ac96ca131b3eebc9d70b8ddc"
dependencies = [
 "anyhow",
 "cargo_toml",
 "dirs",
 "glob",
 "heck 0.5.0",
 "json-patch",
 "schemars 0.8.22",
 "semver",
 "serde",
 "serde_json",
 "static_vcruntime",
 "strsim",
 "tauri-utils",
 "tauri-winres",
 "walkdir",
]

[[package]]
name = "tauri-codegen"
version = "2.7.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a6585c5b536c00f039d12ce70a9755172d5423bbcfd3969863baa70314c3e02f"
dependencies = [
 "base64 0.23.1",
 "brotli",
 "ico",
 "json-patch",
 "plist",
 "png 0.18.1",
 "proc-macro2",
 "quote",
 "semver",
 "serde",
 "serde_json",
 "sha2",
 "syn 2.0.119",
 "tauri-utils",
 "thiserror 2.0.21",
 "time",
 "url",
 "uuid",
 "walkdir",
]

[[package]]
name = "tauri-macros"
version = "2.7.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e2e83a0cfa1bae376e8fbbdc0b1692707aed50cd6072ce85cae4789af5d6c19f"
dependencies = [
 "heck 0.5.0",
 "proc-macro2",
 "quote",
 "syn 2.0.119",
 "tauri-codegen",
 "tauri-utils",
]

[[package]]
name = "tauri-plugin"
version = "2.7.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "67fb21a77e8f94e8beb3325e583102488659365af0a3948b7ea244c5b779c291"
dependencies = [
 "anyhow",
 "glob",
 "plist",
 "schemars 0.8.22",
 "serde",
 "serde_json",
 "tauri-utils",
 "walkdir",
]

[[package]]
name = "tauri-plugin-notification"
version = "2.7.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b939d7b19c8af1381a72ef8474b3aba2b56c1ddac2c23f0c8e96abbcf86b198b"
dependencies = [
 "log",
 "notify-rust",
 "rand 0.9.5",
 "serde",
 "serde_json",
 "serde_repr",
 "tauri",
 "tauri-plugin",
 "thiserror 2.0.21",
 "time",
 "url",
 "zbus",
]

[[package]]
name = "tauri-plugin-single-instance"
version = "2.5.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "561cd99484561bc39c954768e7b41a66cebbe1ac3d9d081c34361f740c489e2c"
dependencies = [
 "serde",
 "serde_json",
 "tauri",
 "thiserror 2.0.21",
 "tokio",
 "tracing",
 "windows-sys 0.61.2",
 "zbus",
]

[[package]]
name = "tauri-plugin-updater"
version = "2.14.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7259989d4fe11b2bf51f7d671642249b1837c4ae2da1430dc713ae38f98ceeec"
dependencies = [
 "base64 0.22.1",
 "dirs",
 "flate2",
 "futures-util",
 "http",
 "infer",
 "libc",
 "log",
 "minisign-verify",
 "osakit",
 "percent-encoding",
 "reqwest 0.13.5",
 "rustls",
 "semver",
 "serde",
 "serde_json",
 "tar",
 "tauri",
 "tauri-plugin",
 "tempfile",
 "thiserror 2.0.21",
 "time",
 "tokio",
 "url",
 "windows-sys 0.61.2",
 "zip",
]

[[package]]
name = "tauri-runtime"
version = "2.12.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7c55766d99cea69055904d1735b93c2049302b2e09effd462120deb5581d78e9"
dependencies = [
 "cookie",
 "dpi",
 "gtk",
 "http",
 "jni 0.21.1",
 "objc2",
 "objc2-ui-kit",
 "objc2-web-kit",
 "raw-window-handle",
 "serde",
 "serde_json",
 "tauri-utils",
 "thiserror 2.0.21",
 "url",
 "webkit2gtk",
 "webview2-com",
 "windows",
]

[[package]]
name = "tauri-runtime-wry"
version = "2.12.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8d61892587aea2a85245bcaec98c6fe46268874c0a0deae5535fb71ca7b93eae"
dependencies = [
 "gtk",
 "http",
 "jni 0.21.1",
 "log",
 "objc2",
 "objc2-app-kit",
 "once_cell",
 "percent-encoding",
 "raw-window-handle",
 "softbuffer",
 "tao",
 "tauri-runtime",
 "tauri-utils",
 "url",
 "webkit2gtk",
 "webview2-com",
 "windows",
 "wry",
]

[[package]]
name = "tauri-utils"
version = "2.10.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "362ab21cd4cc713f2a02b1a9b5688198b1541cfb6907c4281e9190e0f0ef4aa3"
dependencies = [
 "anyhow",
 "brotli",
 "cargo_metadata",
 "ctor",
 "dom_query",
 "dunce",
 "glob",
 "http",
 "infer",
 "json-patch",
 "log",
 "memchr",
 "phf",
 "plist",
 "proc-macro2",
 "quote",
 "regex",
 "schemars 0.8.22",
 "semver",
 "serde",
 "serde-untagged",
 "serde_json",
 "serde_with",
 "swift-rs",
 "thiserror 2.0.21",
 "toml 1.1.8+spec-1.1.0",
 "url",
 "urlpattern",
 "uuid",
 "walkdir",
]

[[package]]
name = "tauri-winres"
version = "0.3.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "cc65d45c68858bfe420dd29e834b5d15dbecf8a07a8a16cf4d532c7b1f69d4b6"
dependencies = [
 "dunce",
 "embed-resource",
 "toml 1.1.8+spec-1.1.0",
]

[[package]]
name = "tauri-winrt-notification"
version = "0.8.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f37a6c354fd28fc9e322ed9bd47e3959576dad28c9d58ea1cf888cce1c7ccb36"
dependencies = [
 "thiserror 2.0.21",
 "windows",
 "windows-version",
]

[[package]]
name = "tempfile"
version = "3.27.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "32497e9a4c7b38532efcdebeef879707aa9f794296a4f0244f6f69e9bc8574bd"
dependencies = [
 "fastrand",
 "getrandom 0.4.3",
 "once_cell",
 "rustix",
 "windows-sys 0.61.2",
]

[[package]]
name = "tendril"
version = "0.5.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5fed54709c5b3a53d09bb1c113ea4f5ceafd1e772ddcb0030a82e1d56c087b08"
dependencies = [
 "new_debug_unreachable",
]

[[package]]
name = "thiserror"
version = "1.0.69"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b6aaf5339b578ea85b50e080feb250a3e8ae8cfcdff9a461c9ec2904bc923f52"
dependencies = [
 "thiserror-impl 1.0.69",
]

[[package]]
name = "thiserror"
version = "2.0.21"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "09e52cb86a36cede5cb101bf8908837b3e4c6e5e59fe7fd85c23fb56200d189e"
dependencies = [
 "thiserror-impl 2.0.21",
]

[[package]]
name = "thiserror-impl"
version = "1.0.69"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "4fee6c4efc90059e10f81e6d42c60a18f76588c3d74cb83a0b242a2b6c7504c1"
dependencies = [
 "proc-macro2",
 "quote",
 "syn 2.0.119",
]

[[package]]
name = "thiserror-impl"
version = "2.0.21"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "fe5197923287db20a58125f0bc85c062f7f2c892de97b18c356f9efb14b28524"
dependencies = [
 "proc-macro2",
 "quote",
 "syn 3.0.9",
]

[[package]]
name = "time"
version = "0.3.55"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "cdb87b95ec50ddfa440816d227a17b2ccbdda963a316a727fda0fc4334f7d134"
dependencies = [
 "deranged",
 "num-conv",
 "powerfmt",
 "serde_core",
 "time-core",
 "time-macros",
]

[[package]]
name = "time-core"
version = "0.1.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9e1c906769ad99c88eaa54e728060edef082f8e358ff32030cb7c7d315e81109"

[[package]]
name = "time-macros"
version = "0.2.32"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7e689342a48d2ea927c87ea50cabf8594854bf940e9310208848d680d668ed85"
dependencies = [
 "num-conv",
 "time-core",
]

[[package]]
name = "tinystr"
version = "0.8.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b1e27c91459209c2986af3dcf603a5a74a4368754ce37414f59acc971167f643"
dependencies = [
 "displaydoc",
 "zerovec",
]

[[package]]
name = "tinyvec"
version = "1.13.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "fd3ca314f692efd6c868f8408f53fe444634a845f96c028b97d35f6a1f79f0ee"

[[package]]
name = "tokio"
version = "1.53.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ce3335fa71841cda333a58d7615b03901380ecf09d59b3296d21f8bbac0dde4e"
dependencies = [
 "bytes",
 "libc",
 "mio",
 "pin-project-lite",
 "socket2",
 "tokio-macros",
 "windows-sys 0.61.2",
]

[[package]]
name = "tokio-macros"
version = "2.7.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "78773a2a397f451582ce068015985c33193cf6dea8b74d2a639fe457b2f07b0e"
dependencies = [
 "proc-macro2",
 "quote",
 "syn 3.0.9",
]

[[package]]
name = "tokio-rustls"
version = "0.26.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c9cc2678c2cdd569ef8215e2afd7954ada2ae20b4fdd2c5fe6139a3b02d105db"
dependencies = [
 "rustls",
 "tokio",
]

[[package]]
name = "tokio-tungstenite"
version = "0.28.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d25a406cddcc431a75d3d9afc6a7c0f7428d4891dd973e4d54c56b46127bf857"
dependencies = [
 "futures-util",
 "log",
 "rustls",
 "rustls-pki-types",
 "tokio",
 "tokio-rustls",
 "tungstenite",
 "webpki-roots 0.26.11",
]

[[package]]
name = "tokio-util"
version = "0.7.20"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e464cf451ba96ebfc6f9b6542f17ee8b8956e33f1e40d9690624e59d7a7f8a4b"
dependencies = [
 "bytes",
 "futures-core",
 "futures-sink",
 "pin-project-lite",
 "tokio",
]

[[package]]
name = "toml"
version = "0.8.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "185d8ab0dfbb35cf1399a6344d8484209c088f75f8f68230da55d48d95d43e3d"
dependencies = [
 "serde",
 "serde_spanned 0.6.9",
 "toml_datetime 0.6.3",
 "toml_edit 0.20.2",
]

[[package]]
name = "toml"
version = "1.1.8+spec-1.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "20489e00e4d8741d6be680764cc12e270655e375a20d1011e844a9c3379e678d"
dependencies = [
 "indexmap 2.14.2",
 "serde_core",
 "serde_spanned 1.1.2",
 "toml_datetime 1.1.2+spec-1.1.0",
 "toml_parser",
 "toml_writer",
 "winnow 1.0.4",
]

[[package]]
name = "toml_datetime"
version = "0.6.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7cda73e2f1397b1262d6dfdcef8aafae14d1de7748d66822d3bfeeb6d03e5e4b"
dependencies = [
 "serde",
]

[[package]]
name = "toml_datetime"
version = "1.1.2+spec-1.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2b86d767906c6c42421dcba507eb9d203e779497710a47782a224bb871653053"
dependencies = [
 "serde_core",
]

[[package]]
name = "toml_edit"
version = "0.19.15"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1b5bb770da30e5cbfde35a2d7b9b8a2c4b8ef89548a7a6aeab5c9a576e3e7421"
dependencies = [
 "indexmap 2.14.2",
 "toml_datetime 0.6.3",
 "winnow 0.5.40",
]

[[package]]
name = "toml_edit"
version = "0.20.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "396e4d48bbb2b7554c944bde63101b5ae446cff6ec4a24227428f15eb72ef338"
dependencies = [
 "indexmap 2.14.2",
 "serde",
 "serde_spanned 0.6.9",
 "toml_datetime 0.6.3",
 "winnow 0.5.40",
]

[[package]]
name = "toml_edit"
version = "0.25.17+spec-1.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e3641d5bbb5349a79e1020a242d251efbc546ad8048d133958323ce9c40a9c9c"
dependencies = [
 "indexmap 2.14.2",
 "toml_datetime 1.1.2+spec-1.1.0",
 "toml_parser",
 "winnow 1.0.4",
]

[[package]]
name = "toml_parser"
version = "1.1.5+spec-1.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "baa693a8032d7e1cada7d0041e96126df243179ff061456783ac7f12bda4744c"
dependencies = [
 "winnow 1.0.4",
]

[[package]]
name = "toml_writer"
version = "1.1.3+spec-1.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "06bdbd8cfc056b8d2e2e85f29b56a3bdbecb527cef81eb39e3e7b98af4652770"

[[package]]
name = "tower"
version = "0.5.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ebe5ef63511595f1344e2d5cfa636d973292adc0eec1f0ad45fae9f0851ab1d4"
dependencies = [
 "futures-core",
 "futures-util",
 "pin-project-lite",
 "sync_wrapper",
 "tokio",
 "tower-layer",
 "tower-service",
]

[[package]]
name = "tower-http"
version = "0.6.11"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "4cfcf7e2740e6fc6d4d688b4ef00650406bb94adf4731e43c096c3a19fe40840"
dependencies = [
 "bitflags 2.13.2",
 "bytes",
 "futures-util",
 "http",
 "http-body",
 "pin-project-lite",
 "tower",
 "tower-layer",
 "tower-service",
 "url",
]

[[package]]
name = "tower-layer"
version = "0.3.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "121c2a6cda46980bb0fcd1647ffaf6cd3fc79a013de288782836f6df9c48780e"

[[package]]
name = "tower-service"
version = "0.3.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8df9b6e13f2d32c91b9bd719c00d1958837bc7dec474d94952798cc8e69eeec3"

[[package]]
name = "tracing"
version = "0.1.44"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "63e71662fa4b2a2c3a26f570f037eb95bb1f85397f3cd8076caed2f026a6d100"
dependencies = [
 "pin-project-lite",
 "tracing-attributes",
 "tracing-core",
]

[[package]]
name = "tracing-attributes"
version = "0.1.31"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7490cfa5ec963746568740651ac6781f701c9c5ea257c58e057f3ba8cf69e8da"
dependencies = [
 "proc-macro2",
 "quote",
 "syn 2.0.119",
]

[[package]]
name = "tracing-core"
version = "0.1.36"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "db97caf9d906fbde555dd62fa95ddba9eecfd14cb388e4f491a66d74cd5fb79a"
dependencies = [
 "once_cell",
]

[[package]]
name = "tray-icon"
version = "0.25.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b2b9c52859a94554803ccd4a24b98f74148ebc73b90676d783f3490b1bff9d72"
dependencies = [
 "crossbeam-channel",
 "dirs",
 "libappindicator",
 "muda",
 "objc2",
 "objc2-app-kit",
 "objc2-core-foundation",
 "objc2-core-graphics",
 "objc2-foundation",
 "once_cell",
 "png 0.18.1",
 "serde",
 "thiserror 2.0.21",
 "windows-sys 0.61.2",
]

[[package]]
name = "try-lock"
version = "0.2.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e421abadd41a4225275504ea4d6566923418b7f05506fbc9c0fe86ba7396114b"

[[package]]
name = "tungstenite"
version = "0.28.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8628dcc84e5a09eb3d8423d6cb682965dea9133204e8fb3efee74c2a0c259442"
dependencies = [
 "bytes",
 "data-encoding",
 "http",
 "httparse",
 "log",
 "rand 0.9.5",
 "rustls",
 "rustls-pki-types",
 "sha1",
 "thiserror 2.0.21",
 "utf-8",
]

[[package]]
name = "typeid"
version = "1.0.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "bc7d623258602320d5c55d1bc22793b57daff0ec7efc270ea7d55ce1d5f5471c"

[[package]]
name = "typenum"
version = "1.20.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b6f5e870be6c3b371b77fe0ee0bafb859fa4964b4404c27de1d380043c4dda20"

[[package]]
name = "uds_windows"
version = "1.2.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f2f6fb2847f6742cd76af783a2a2c49e9375d0a111c7bef6f71cd9e738c72d6e"
dependencies = [
 "memoffset",
 "tempfile",
 "windows-sys 0.61.2",
]

[[package]]
name = "unicode-ident"
version = "1.0.27"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a2c754d6c33795a1c324727428e5a7dedb5b06195f9890bdbcba760d3e246563"

[[package]]
name = "unicode-segmentation"
version = "1.13.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c6f5d3c3b1bf09027a88a6bc961fc00497d651009560b5463668dc81b0fa87a8"

[[package]]
name = "untrusted"
version = "0.9.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8ecb6da28b8a351d773b68d5825ac39017e680750f980f3a1a85cd8dd28a47c1"

[[package]]
name = "url"
version = "2.5.8"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ff67a8a4397373c3ef660812acab3268222035010ab8680ec4215f38ba3d0eed"
dependencies = [
 "form_urlencoded",
 "idna",
 "percent-encoding",
 "serde",
 "serde_derive",
]

[[package]]
name = "urlencoding"
version = "2.1.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "daf8dba3b7eb870caf1ddeed7bc9d2a049f3cfdfae7cb521b087cc33ae4c49da"

[[package]]
name = "urlpattern"
version = "0.6.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "df16f50ef4cc145211879a3867ba757076b25dfee812040dcb0658bd9ae7904b"
dependencies = [
 "icu_properties",
 "regex",
 "serde",
 "url",
]

[[package]]
name = "utf-8"
version = "0.7.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "09cc8ee72d2a9becf2f2febe0205bbed8fc6615b7cb429ad062dc7b7ddd036a9"

[[package]]
name = "utf8_iter"
version = "1.0.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b6c140620e7ffbb22c2dee59cafe6084a59b5ffc27a8859a5f0d494b5d52b6be"

[[package]]
name = "uuid"
version = "1.28.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7cc1186384beb7dd8eedea376413fd654937285ea6c9cfbb928dc3043ea4b606"
dependencies = [
 "getrandom 0.4.3",
 "js-sys",
 "serde_core",
 "wasm-bindgen",
]

[[package]]
name = "version-compare"
version = "0.2.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "03c2856837ef78f57382f06b2b8563a2f512f7185d732608fd9176cb3b8edf0e"

[[package]]
name = "version_check"
version = "0.9.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0b928f33d975fc6ad9f86c8f283853ad26bdd5b10b7f1542aa2fa15e2289105a"

[[package]]
name = "vswhom"
version = "0.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "be979b7f07507105799e854203b470ff7c78a1639e330a58f183b5fea574608b"
dependencies = [
 "libc",
 "vswhom-sys",
]

[[package]]
name = "vswhom-sys"
version = "0.1.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "fb067e4cbd1ff067d1df46c9194b5de0e98efd2810bbc95c5d5e5f25a3231150"
dependencies = [
 "cc",
 "libc",
]

[[package]]
name = "walkdir"
version = "2.5.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "29790946404f91d9c5d06f9874efddea1dc06c5efe94541a7d6863108e3a5e4b"
dependencies = [
 "same-file",
 "winapi-util",
]

[[package]]
name = "want"
version = "0.3.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ec4cdd0dd910afe868b7ef477227d8d538b46b3075031afee8a9f2acb0a2ed0b"
dependencies = [
 "try-lock",
]

[[package]]
name = "wasi"
version = "0.11.1+wasi-snapshot-preview1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ccf3ec651a847eb01de73ccad15eb7d99f80485de043efb2f370cd654f4ea44b"

[[package]]
name = "wasip2"
version = "1.0.4+wasi-0.2.12"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b67efb37e106e55ce722a510d6b5f9c17f083e5fc79afc2badeb12cc313d9487"
dependencies = [
 "wit-bindgen",
]

[[package]]
name = "wasm-bindgen"
version = "0.2.129"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9bb54f33acc68fd454578d9820b0bde1a1a3d17aa17bb7b6595806d02886d409"
dependencies = [
 "cfg-if",
 "once_cell",
 "rustversion",
 "wasm-bindgen-macro",
 "wasm-bindgen-shared",
]

[[package]]
name = "wasm-bindgen-futures"
version = "0.4.79"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3cbab34de2d982e9b48e18d216d04c4a6f641066ff19ffb699980f591ee3610e"
dependencies = [
 "js-sys",
 "tokio",
 "wasm-bindgen",
]

[[package]]
name = "wasm-bindgen-macro"
version = "0.2.129"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2e29d0c35b16e224a7eeb5cd2d25e3e1968fbd65604117b44d3b789d00ee8535"
dependencies = [
 "quote",
 "wasm-bindgen-macro-support",
]

[[package]]
name = "wasm-bindgen-macro-support"
version = "0.2.129"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "6f501a8bc3719dba86ef8ae4728879c08001bea749eb1333ac5b91e040e2a6b7"
dependencies = [
 "bumpalo",
 "proc-macro2",
 "quote",
 "syn 3.0.9",
 "wasm-bindgen-shared",
]

[[package]]
name = "wasm-bindgen-shared"
version = "0.2.129"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "23f0c9c52aa7cd7d77769a4cfe2a9adb1b331f489a41d912ce14513d5ab995c6"
dependencies = [
 "unicode-ident",
]

[[package]]
name = "wasm-streams"
version = "0.5.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9d1ec4f6517c9e11ae630e200b2b65d193279042e28edd4a2cda233e46670bbb"
dependencies = [
 "futures-util",
 "js-sys",
 "wasm-bindgen",
 "wasm-bindgen-futures",
 "web-sys",
]

[[package]]
name = "web-sys"
version = "0.3.106"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "88261b9deccee56594c11a3460c462c41f58d148598fe70ad77070126a68aba4"
dependencies = [
 "js-sys",
 "wasm-bindgen",
]

[[package]]
name = "web-time"
version = "1.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5a6580f308b1fad9207618087a65c04e7a10bc77e02c8e84e9b00dd4b12fa0bb"
dependencies = [
 "js-sys",
 "wasm-bindgen",
]

[[package]]
name = "web_atoms"
version = "0.2.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ba8b815c1b593dc0baf78dd0f4fc8fdb2de53198fb1163738093e9a311c33fb3"
dependencies = [
 "phf",
 "phf_codegen",
 "string_cache",
 "string_cache_codegen",
]

[[package]]
name = "webkit2gtk"
version = "2.0.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a1027150013530fb2eaf806408df88461ae4815a45c541c8975e61d6f2fc4793"
dependencies = [
 "bitflags 1.3.2",
 "cairo-rs",
 "gdk",
 "gdk-sys",
 "gio",
 "gio-sys",
 "glib",
 "glib-sys",
 "gobject-sys",
 "gtk",
 "gtk-sys",
 "javascriptcore-rs",
 "libc",
 "once_cell",
 "soup3",
 "webkit2gtk-sys",
]

[[package]]
name = "webkit2gtk-sys"
version = "2.0.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "916a5f65c2ef0dfe12fff695960a2ec3d4565359fdbb2e9943c974e06c734ea5"
dependencies = [
 "bitflags 1.3.2",
 "cairo-sys-rs",
 "gdk-sys",
 "gio-sys",
 "glib-sys",
 "gobject-sys",
 "gtk-sys",
 "javascriptcore-rs-sys",
 "libc",
 "pkg-config",
 "soup3-sys",
 "system-deps",
]

[[package]]
name = "webpki-root-certs"
version = "1.0.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b96554aa2acc8ccdb7e1c9a58a7a68dd5d13bccc69cd124cb09406db612a1c9b"
dependencies = [
 "rustls-pki-types",
]

[[package]]
name = "webpki-roots"
version = "0.26.11"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "521bc38abb08001b01866da9f51eb7c5d647a19260e00054a8c7fd5f9e57f7a9"
dependencies = [
 "webpki-roots 1.0.9",
]

[[package]]
name = "webpki-roots"
version = "1.0.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7dcd9d09a39985f5344844e66b0c530a33843579125f23e21e9f0f220850f22a"
dependencies = [
 "rustls-pki-types",
]

[[package]]
name = "webview2-com"
version = "0.39.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3f89fca7a704cee10dcb3654c1dbb8941d1783132f1917358af75bec37a7d7e6"
dependencies = [
 "webview2-com-macros",
 "webview2-com-sys",
 "windows",
 "windows-core",
]

[[package]]
name = "webview2-com-macros"
version = "0.8.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "67a921c1b6914c367b2b823cd4cde6f96beec77d30a939c8199bb377cf9b9b54"
dependencies = [
 "proc-macro2",
 "quote",
 "syn 2.0.119",
]

[[package]]
name = "webview2-com-sys"
version = "0.39.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b3a07132775117d6065853d9d1178157b8c90e228de47129d6bce2c7edebedfb"
dependencies = [
 "thiserror 2.0.21",
 "windows",
 "windows-core",
]

[[package]]
name = "winapi"
version = "0.3.9"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5c839a674fcd7a98952e593242ea400abe93992746761e38641405d28b00f419"
dependencies = [
 "winapi-i686-pc-windows-gnu",
 "winapi-x86_64-pc-windows-gnu",
]

[[package]]
name = "winapi-i686-pc-windows-gnu"
version = "0.4.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ac3b87c63620426dd9b991e5ce0329eff545bccbbb34f3be09ff6fb6ab51b7b6"

[[package]]
name = "winapi-util"
version = "0.1.11"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c2a7b1c03c876122aa43f3020e6c3c3ee5c05081c9a00739faf7503aeba10d22"
dependencies = [
 "windows-sys 0.61.2",
]

[[package]]
name = "winapi-x86_64-pc-windows-gnu"
version = "0.4.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "712e227841d057c1ee1cd2fb22fa7e5a5461ae8e48fa2ca79ec42cfc1931183f"

[[package]]
name = "window-vibrancy"
version = "0.8.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "111e51caca442cafd9bab396628ac4d814880eaea4e63dfd76a12e9f342b5580"
dependencies = [
 "objc2",
 "objc2-app-kit",
 "objc2-core-foundation",
 "objc2-foundation",
 "objc2-quartz-core",
 "raw-window-handle",
 "windows-sys 0.61.2",
 "windows-version",
]

[[package]]
name = "windows"
version = "0.62.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "527fadee13e0c05939a6a05d5bd6eec6cd2e3dbd648b9f8e447c6518133d8580"
dependencies = [
 "windows-collections",
 "windows-core",
 "windows-future",
 "windows-numerics",
]

[[package]]
name = "windows-collections"
version = "0.3.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "23b2d95af1a8a14a3c7367e1ed4fc9c20e0a26e79551b1454d72583c97cc6610"
dependencies = [
 "windows-core",
]

[[package]]
name = "windows-core"
version = "0.62.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b8e83a14d34d0623b51dce9581199302a221863196a1dde71a7663a4c2be9deb"
dependencies = [
 "windows-implement",
 "windows-interface",
 "windows-link",
 "windows-result",
 "windows-strings",
]

[[package]]
name = "windows-future"
version = "0.3.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e1d6f90251fe18a279739e78025bd6ddc52a7e22f921070ccdc67dde84c605cb"
dependencies = [
 "windows-core",
 "windows-link",
 "windows-threading",
]

[[package]]
name = "windows-implement"
version = "0.60.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "053e2e040ab57b9dc951b72c264860db7eb3b0200ba345b4e4c3b14f67855ddf"
dependencies = [
 "proc-macro2",
 "quote",
 "syn 2.0.119",
]

[[package]]
name = "windows-interface"
version = "0.59.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3f316c4a2570ba26bbec722032c4099d8c8bc095efccdc15688708623367e358"
dependencies = [
 "proc-macro2",
 "quote",
 "syn 2.0.119",
]

[[package]]
name = "windows-link"
version = "0.2.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f0805222e57f7521d6a62e36fa9163bc891acd422f971defe97d64e70d0a4fe5"

[[package]]
name = "windows-numerics"
version = "0.3.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "6e2e40844ac143cdb44aead537bbf727de9b044e107a0f1220392177d15b0f26"
dependencies = [
 "windows-core",
 "windows-link",
]

[[package]]
name = "windows-registry"
version = "0.6.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "02752bf7fbdcce7f2a27a742f798510f3e5ad88dbe84871e5168e2120c3d5720"
dependencies = [
 "windows-link",
 "windows-result",
 "windows-strings",
]

[[package]]
name = "windows-result"
version = "0.4.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7781fa89eaf60850ac3d2da7af8e5242a5ea78d1a11c49bf2910bb5a73853eb5"
dependencies = [
 "windows-link",
]

[[package]]
name = "windows-strings"
version = "0.5.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7837d08f69c77cf6b07689544538e017c1bfcf57e34b4c0ff58e6c2cd3b37091"
dependencies = [
 "windows-link",
]

[[package]]
name = "windows-sys"
version = "0.45.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "75283be5efb2831d37ea142365f009c02ec203cd29a3ebecbc093d52315b66d0"
dependencies = [
 "windows-targets 0.42.2",
]

[[package]]
name = "windows-sys"
version = "0.52.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "282be5f36a8ce781fad8c8ae18fa3f9beff57ec1b52cb3de0789201425d9a33d"
dependencies = [
 "windows-targets 0.52.6",
]

[[package]]
name = "windows-sys"
version = "0.61.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ae137229bcbd6cdf0f7b80a31df61766145077ddf49416a728b02cb3921ff3fc"
dependencies = [
 "windows-link",
]

[[package]]
name = "windows-targets"
version = "0.42.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8e5180c00cd44c9b1c88adb3693291f1cd93605ded80c250a75d472756b4d071"
dependencies = [
 "windows_aarch64_gnullvm 0.42.2",
 "windows_aarch64_msvc 0.42.2",
 "windows_i686_gnu 0.42.2",
 "windows_i686_msvc 0.42.2",
 "windows_x86_64_gnu 0.42.2",
 "windows_x86_64_gnullvm 0.42.2",
 "windows_x86_64_msvc 0.42.2",
]

[[package]]
name = "windows-targets"
version = "0.52.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9b724f72796e036ab90c1021d4780d4d3d648aca59e491e6b98e725b84e99973"
dependencies = [
 "windows_aarch64_gnullvm 0.52.6",
 "windows_aarch64_msvc 0.52.6",
 "windows_i686_gnu 0.52.6",
 "windows_i686_gnullvm",
 "windows_i686_msvc 0.52.6",
 "windows_x86_64_gnu 0.52.6",
 "windows_x86_64_gnullvm 0.52.6",
 "windows_x86_64_msvc 0.52.6",
]

[[package]]
name = "windows-threading"
version = "0.2.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3949bd5b99cafdf1c7ca86b43ca564028dfe27d66958f2470940f73d86d75b37"
dependencies = [
 "windows-link",
]

[[package]]
name = "windows-version"
version = "0.1.7"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e4060a1da109b9d0326b7262c8e12c84df67cc0dbc9e33cf49e01ccc2eb63631"
dependencies = [
 "windows-link",
]

[[package]]
name = "windows_aarch64_gnullvm"
version = "0.42.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "597a5118570b68bc08d8d59125332c54f1ba9d9adeedeef5b99b02ba2b0698f8"

[[package]]
name = "windows_aarch64_gnullvm"
version = "0.52.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "32a4622180e7a0ec044bb555404c800bc9fd9ec262ec147edd5989ccd0c02cd3"

[[package]]
name = "windows_aarch64_msvc"
version = "0.42.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e08e8864a60f06ef0d0ff4ba04124db8b0fb3be5776a5cd47641e942e58c4d43"

[[package]]
name = "windows_aarch64_msvc"
version = "0.52.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "09ec2a7bb152e2252b53fa7803150007879548bc709c039df7627cabbd05d469"

[[package]]
name = "windows_i686_gnu"
version = "0.42.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c61d927d8da41da96a81f029489353e68739737d3beca43145c8afec9a31a84f"

[[package]]
name = "windows_i686_gnu"
version = "0.52.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8e9b5ad5ab802e97eb8e295ac6720e509ee4c243f69d781394014ebfe8bbfa0b"

[[package]]
name = "windows_i686_gnullvm"
version = "0.52.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0eee52d38c090b3caa76c563b86c3a4bd71ef1a819287c19d586d7334ae8ed66"

[[package]]
name = "windows_i686_msvc"
version = "0.42.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "44d840b6ec649f480a41c8d80f9c65108b92d89345dd94027bfe06ac444d1060"

[[package]]
name = "windows_i686_msvc"
version = "0.52.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "240948bc05c5e7c6dabba28bf89d89ffce3e303022809e73deaefe4f6ec56c66"

[[package]]
name = "windows_x86_64_gnu"
version = "0.42.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "8de912b8b8feb55c064867cf047dda097f92d51efad5b491dfb98f6bbb70cb36"

[[package]]
name = "windows_x86_64_gnu"
version = "0.52.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "147a5c80aabfbf0c7d901cb5895d1de30ef2907eb21fbbab29ca94c5b08b1a78"

[[package]]
name = "windows_x86_64_gnullvm"
version = "0.42.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "26d41b46a36d453748aedef1486d5c7a85db22e56aff34643984ea85514e94a3"

[[package]]
name = "windows_x86_64_gnullvm"
version = "0.52.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "24d5b23dc417412679681396f2b49f3de8c1473deb516bd34410872eff51ed0d"

[[package]]
name = "windows_x86_64_msvc"
version = "0.42.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9aec5da331524158c6d1a4ac0ab1541149c0b9505fde06423b02f5ef0106b9f0"

[[package]]
name = "windows_x86_64_msvc"
version = "0.52.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "589f6da84c646204747d1270a2a5661ea66ed1cced2631d546fdfb155959f9ec"

[[package]]
name = "winnow"
version = "0.5.40"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f593a95398737aeed53e489c785df13f3618e41dbcd6718c6addbf1395aa6876"
dependencies = [
 "memchr",
]

[[package]]
name = "winnow"
version = "1.0.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "23b97319f7b8343df12cc98938e5c3eb436064524c8d2b4e30a1d3a36eecdf81"
dependencies = [
 "memchr",
]

[[package]]
name = "winreg"
version = "0.56.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "7d6f32a0ff4a9f6f01231eb2059cc85479330739333e0e58cadf03b6af2cca10"
dependencies = [
 "cfg-if",
 "windows-sys 0.61.2",
]

[[package]]
name = "wit-bindgen"
version = "0.57.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1ebf944e87a7c253233ad6766e082e3cd714b5d03812acc24c318f549614536e"

[[package]]
name = "writeable"
version = "0.6.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3ad82d2a33cdc9674dc7465672f271e096168fcdbe0f799d9e6db8c5892679dc"

[[package]]
name = "wry"
version = "0.57.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a819957a01b3119af85e638a38d242af76dbc87d130dca67bfd0441072e21ff0"
dependencies = [
 "base64 0.22.1",
 "block2",
 "cookie",
 "crossbeam-channel",
 "dirs",
 "dom_query",
 "dpi",
 "dunce",
 "gdkx11",
 "gtk",
 "http",
 "javascriptcore-rs",
 "jni 0.21.1",
 "libc",
 "ndk",
 "objc2",
 "objc2-app-kit",
 "objc2-core-foundation",
 "objc2-foundation",
 "objc2-ui-kit",
 "objc2-web-kit",
 "once_cell",
 "percent-encoding",
 "raw-window-handle",
 "sha2",
 "soup3",
 "tao-macros",
 "thiserror 2.0.21",
 "url",
 "webkit2gtk",
 "webkit2gtk-sys",
 "webview2-com",
 "windows",
 "windows-core",
 "windows-version",
 "x11-dl",
]

[[package]]
name = "x11"
version = "2.21.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "502da5464ccd04011667b11c435cb992822c2c0dbde1770c988480d312a0db2e"
dependencies = [
 "libc",
 "pkg-config",
]

[[package]]
name = "x11-dl"
version = "2.21.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "38735924fedd5314a6e548792904ed8c6de6636285cb9fec04d5b1db85c1516f"
dependencies = [
 "libc",
 "once_cell",
 "pkg-config",
]

[[package]]
name = "xattr"
version = "1.6.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "32e45ad4206f6d2479085147f02bc2ef834ac85886624a23575ae137c8aa8156"
dependencies = [
 "libc",
 "rustix",
]

[[package]]
name = "yoke"
version = "0.8.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "709fe23a0424b6a435d82152b1bd3fdfb0833487d5fa90d05d42762a9891fef5"
dependencies = [
 "stable_deref_trait",
 "yoke-derive",
 "zerofrom",
]

[[package]]
name = "yoke-derive"
version = "0.8.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "ec8ebde2db3681e8c9980cc27822030e68752690ddfa9473e739aeb4dbde6d71"
dependencies = [
 "proc-macro2",
 "quote",
 "syn 3.0.9",
 "synstructure",
]

[[package]]
name = "zbus"
version = "5.19.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "5db4be7c075cb421e4b7ee645541604239bd243ba7c357511f4ff3a74b555907"
dependencies = [
 "async-broadcast",
 "async-executor",
 "async-io",
 "async-lock",
 "async-process",
 "async-recursion",
 "async-task",
 "async-trait",
 "blocking",
 "enumflags2",
 "event-listener",
 "futures-core",
 "futures-lite",
 "hex",
 "libc",
 "ordered-stream",
 "rustix",
 "serde",
 "serde_repr",
 "tracing",
 "uds_windows",
 "uuid",
 "windows-sys 0.61.2",
 "winnow 1.0.4",
 "zbus_macros",
 "zbus_names",
 "zvariant",
]

[[package]]
name = "zbus_macros"
version = "5.19.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "2990635d09ade6df1868f72f8cac69a876a90981e8bd3c40b1be413f8dc88f40"
dependencies = [
 "proc-macro-crate 3.5.0",
 "proc-macro2",
 "quote",
 "syn 3.0.9",
 "zbus_names",
 "zvariant",
 "zvariant_utils",
]

[[package]]
name = "zbus_names"
version = "4.3.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d8bf88b4a3ff53e883001e0e0115b297a9d53c31b9c1edd2bfdd853e3428624e"
dependencies = [
 "serde",
 "winnow 1.0.4",
 "zvariant",
]

[[package]]
name = "zcheapstr"
version = "1.1.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "d1afec51604565183aeb5c54c20aeab286120d4e4460f7f76e3e8bb8c0d99473"
dependencies = [
 "serde",
]

[[package]]
name = "zerocopy"
version = "0.8.63"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e5fe1f8f1b06191a00962174c61aa5005e0bb391a6d80d07e24d115c01a92ed8"
dependencies = [
 "zerocopy-derive",
]

[[package]]
name = "zerocopy-derive"
version = "0.8.63"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "863ad3ac83293fb4d740aedbfdc9240dd8d1a50c1099acd76ce80ce7c7230c7f"
dependencies = [
 "proc-macro2",
 "quote",
 "syn 2.0.119",
]

[[package]]
name = "zerofrom"
version = "0.1.8"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "0ec05a11813ea801ff6d75110ad09cd0824ddba17dfe17128ea0d5f68e6c5272"
dependencies = [
 "zerofrom-derive",
]

[[package]]
name = "zerofrom-derive"
version = "0.1.8"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f75b4683f6c7f45248d4d64056a24298c6281e0993356d7d1b4a1a962ef10d4a"
dependencies = [
 "proc-macro2",
 "quote",
 "syn 3.0.9",
 "synstructure",
]

[[package]]
name = "zeroize"
version = "1.9.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "e13084392c5e4bc371903e2935a5eaeed24905a7511356b883835e18a78f6879"

[[package]]
name = "zerotrie"
version = "0.2.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "4ea269c3bd32f0a32c321907a2ae912ba6f4649bb0fc764a15627e99a7095a3f"
dependencies = [
 "displaydoc",
 "yoke",
 "zerofrom",
]

[[package]]
name = "zerovec"
version = "0.11.8"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "bb0464e17806c1d976d5cba29399c7f08e516e279e2ba493f63123b5fca67dd8"
dependencies = [
 "yoke",
 "zerofrom",
 "zerovec-derive",
]

[[package]]
name = "zerovec-derive"
version = "0.11.6"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "34df6fc39dbd26ddc9c10e6a2984476e13acce22e64e4487636ef494369225da"
dependencies = [
 "proc-macro2",
 "quote",
 "syn 3.0.9",
]

[[package]]
name = "zip"
version = "4.6.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "caa8cd6af31c3b31c6631b8f483848b91589021b28fffe50adada48d4f4d2ed1"
dependencies = [
 "arbitrary",
 "crc32fast",
 "indexmap 2.14.2",
 "memchr",
]

[[package]]
name = "zlib-rs"
version = "0.6.8"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "b268e58e7c693d7c271f93ffc4ba3b380412554231c85bf61ca7af91042a4112"

[[package]]
name = "zmij"
version = "1.0.23"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "29666d0abbfad1e3dc4dcf6144730dd3a3ab225bbbdac83319345b1b44ccfc1b"

[[package]]
name = "zvariant"
version = "5.15.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c1d34c27cc6cdd1f458427519dd6b8612f7b7e3f7b9a0b2355d041dda9869147"
dependencies = [
 "endi",
 "enumflags2",
 "serde",
 "winnow 1.0.4",
 "zcheapstr",
 "zvariant_derive",
 "zvariant_utils",
]

[[package]]
name = "zvariant_derive"
version = "5.15.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "864155e69b4352db0c7f374917bf45d1e0c8d17659c8b3dbf9795f3673f8c497"
dependencies = [
 "proc-macro-crate 3.5.0",
 "proc-macro2",
 "quote",
 "syn 3.0.9",
 "zvariant_utils",
]

[[package]]
name = "zvariant_utils"
version = "4.2.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "bad0294361a320b694a328460dc73add56c306150f5cb6bfafc44446120008a3"
dependencies = [
 "proc-macro2",
 "quote",
 "serde",
 "syn 3.0.9",
 "winnow 1.0.4",
]

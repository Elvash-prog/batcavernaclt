// BatCaverna — Patch 1.39.3. Deploy as bright-api; authentication is verified below.
// Run patch-1.39.3-bright-api.sql before deploying this file.
// Secrets: SGDB_KEY, STEAM_KEY; SUPABASE_* variables are supplied by Supabase.
class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status=status; }
}
const SITE = "https://batcavernaclt.gamersclt.workers.dev";
const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
function response(req: Request, data: unknown, status = 200) {
  const headers: Record<string,string> = {
    "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff", "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
  };
  if (req.headers.get("Origin") === SITE) headers["Access-Control-Allow-Origin"] = SITE;
  if (status === 429) headers["Retry-After"] = "60";
  return new Response(status === 204 ? null : JSON.stringify(data), {status, headers});
}
async function readText(r: Response | Request, max: number): Promise<string> {
  if (Number(r.headers.get("content-length") || 0) > max) throw new ApiError(413, "Dados excedem o limite.");
  if (!r.body) return "";
  const reader = r.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > max) throw new ApiError(413, "Dados excedem o limite.");
      chunks.push(value);
    }
  } catch (err) { await reader.cancel().catch(() => {}); throw err; }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8", {fatal:true}).decode(bytes);
}
async function readJson(r: Response | Request, max: number): Promise<any> {
  try { return JSON.parse(await readText(r, max)); }
  catch (e) { if (e instanceof ApiError) throw e; throw new ApiError(400, "JSON inválido."); }
}
async function authenticate(req: Request): Promise<string> {
  const token = req.headers.get("Authorization") || "";
  if (!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token) || token.length > 8192)
    throw new ApiError(401, "Entre na sua conta para continuar.");
  if (!SB_URL || !SB_ANON || !SB_SERVICE) throw new ApiError(503, "Serviço indisponível.");
  const r = await fetch(SB_URL + "/auth/v1/user", {
    headers: {apikey: SB_ANON, Authorization: token}, signal: AbortSignal.timeout(6000), redirect:"error",
  });
  if (r.status === 401 || r.status === 403) throw new ApiError(401, "Sessão inválida. Entre novamente.");
  if (!r.ok) throw new ApiError(503, "Não foi possível validar sua sessão.");
  const user = await readJson(r, 65536);
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(user.id || "") || user.is_anonymous === true)
    throw new ApiError(401, "Entre na sua conta para continuar.");
  return user.id;
}
function appid(v: unknown): number {
  if ((typeof v !== "number" && typeof v !== "string") || !/^\d{1,10}$/.test(String(v)))
    throw new ApiError(400, "Jogo inválido.");
  const n = Number(v); if (!Number.isSafeInteger(n) || n < 1 || n > 2147483647) throw new ApiError(400, "Jogo inválido.");
  return n;
}
function name(v: unknown): string {
  if (typeof v !== "string" || !v.trim() || v.length > 160 || /[\x00-\x1f]/.test(v)) throw new ApiError(400, "Nome inválido.");
  return v.trim();
}
function steamid(v: unknown): string {
  if (typeof v !== "string" || !/^\d{17}$/.test(v)) throw new ApiError(400, "Perfil Steam inválido.");
  return v;
}
function entry(v: unknown): string {
  if (typeof v !== "string" || v.length > 200) throw new ApiError(400, "Perfil Steam inválido.");
  let value = v.trim();
  if (/^https?:\/\//i.test(value)) {
    let u: URL; try { u = new URL(value); } catch { throw new ApiError(400, "Perfil Steam inválido."); }
    if (u.hostname !== "steamcommunity.com" || u.username || u.password || u.port || u.search || u.hash)
      throw new ApiError(400, "Use uma URL de perfil da Steam.");
    const match = u.pathname.match(/^\/(?:profiles\/(\d{17})|id\/([A-Za-z0-9_-]{1,64}))\/?$/);
    if (!match) throw new ApiError(400, "Perfil Steam inválido.");
    return match[1] || match[2];
  }
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(value)) throw new ApiError(400, "Perfil Steam inválido.");
  return value;
}
function array(v: unknown, max: number, validate: (v: unknown)=>any): any[] {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > max) throw new ApiError(400, "Lista excede o limite permitido.");
  return v.map(validate);
}
function validate(b: any): {body: any, cost:number} {
  if (!b || Array.isArray(b) || typeof b !== "object" || typeof b.op !== "string") throw new ApiError(400, "Pedido inválido.");
  const out: any = {op:b.op}; let cost = 1;
  switch (b.op) {
    case "capas": case "steamInfo":
      out.appids = array(b.appids, 50, appid); out.nomes = array(b.nomes, 20, name);
      out.format = b.format === "landscape" ? "landscape" : "poster";
      cost = Math.max(1, out.appids.length * 2 + out.nomes.length * 3); break;
    case "perfil": out.entrada = entry(b.entrada ?? b.steamid); cost=3; break;
    case "agora": out.steamid=steamid(b.steamid); break;
    case "jogos": out.steamid=steamid(b.steamid); cost=3; break;
    case "conquistas": if(b.steamid)out.steamid=steamid(b.steamid); out.appid=appid(b.appid); cost=b.steamid?2:1; break;
    case "steamAmigos": out.steamids=array(b.steamids,100,steamid); cost=Math.max(1,Math.ceil(out.steamids.length/10)); break;
    case "gratis": cost=35; break;
    default: throw new ApiError(400, "Operação inválida.");
  }
  return {body:out,cost};
}
async function rateLimit(uid: string, cost: number) {
  const r = await fetch(SB_URL + "/rest/v1/rpc/clt_bright_api_limit", {
    method:"POST", headers:{"Content-Type":"application/json",apikey:SB_SERVICE,Authorization:"Bearer "+SB_SERVICE},
    body:JSON.stringify({p_user_id:uid,p_cost:cost}),signal:AbortSignal.timeout(6000),redirect:"error",
  });
  if (!r.ok) throw new ApiError(503, "Serviço temporariamente indisponível.");
  if (await readJson(r,1024) !== true) throw new ApiError(429, "Limite de buscas atingido. Tente novamente mais tarde.");
}
// Conservative text filter; it is not a substitute for image/video moderation.
function adultTitle(v: unknown): boolean {
  return typeof v === "string" && /\b(porn(?:o|ographic|ography)?|hentai|xxx|sex(?:ual)?\s+(?:content|acts|activity|intercourse)|explicit\s+sex|adult\s+only|erotic(?:a)?|pornogr[aá]f(?:ia|ico|icos)|conte[uú]do\s+sexual)\b/i.test(v);
}
function safeImage(v: unknown): string | null {
  if (typeof v !== "string") return null;
  try { const u=new URL(v); return u.protocol === "https:" && !u.username && !u.password ? u.href : null; } catch { return null; }
}
const SGDB = Deno.env.get("SGDB_KEY") ?? "";

const STEAM = Deno.env.get("STEAM_KEY") ?? "";

async function runOperation(b: any, signal: AbortSignal): Promise<unknown> {
const getJson = async (u: string, h: HeadersInit = {}) => {
  const r = await fetch(u, { headers: h, signal: AbortSignal.any([signal,AbortSignal.timeout(8000)]), redirect: "error" });
  if (!r.ok) throw new ApiError(502, "Serviço de jogos indisponível. Tente novamente.");
  return await readJson(r, 8 * 1024 * 1024);
};
const sg = (p: string) => getJson("https://www.steamgriddb.com/api/v2" + p, { Authorization: "Bearer " + SGDB });
const st = (p: string) => getJson("https://api.steampowered.com" + p + (p.includes("?") ? "&" : "?") + "key=" + STEAM + "&format=json");
// styles=alternate -> arte "padrão" do SteamGridDB, a que traz o nome/logo do jogo; 600x900 -> formato de capa
const gridQuery = (format: string) => `dimensions=${format === "landscape" ? "920x430,460x215" : "600x900,660x930,342x482"}&types=static&nsfw=false`;
async function capa(nome?: string, appid?: number, format = "poster"): Promise<string | null> {
  if (adultTitle(nome)) return null;
  try {
    const Q = gridQuery(format);
    let path: string;
    if (appid) path = `/grids/steam/${appid}?${Q}`;
    else {
      const r = await sg("/search/autocomplete/" + encodeURIComponent(String(nome)));
      const id = r.data?.find((g: any) => !adultTitle(g.name))?.id;
      if (!Number.isSafeInteger(id) || id < 1) return null;
      path = `/grids/game/${id}?${Q}`;
    }
    const g = await sg(path);
    const grid = g.data?.find((x: any) => x.nsfw !== true && x.nsfw !== 1);
    if (grid?.url) return safeImage(grid.url);
  } catch {}
  if (appid) {
    try {
      const z = await steamAppInfo(Number(appid));
      return z?.capa || null;
    } catch {}
    return null;
  }
  return null;
}
async function resolver(entrada: string): Promise<string> {
  const e = String(entrada ?? "").trim();
  let m = e.match(/profiles\/(\d{17})/) || e.match(/^(\d{17})$/);
  if (m) return m[1];
  m = e.match(/\/id\/([^\/?#]+)/);
  const r = await st(`/ISteamUser/ResolveVanityURL/v1/?vanityurl=${encodeURIComponent(m ? m[1] : e)}`);
  if (r.response?.success !== 1) throw new Error("Perfil da Steam não encontrado");
  return steamid(r.response.steamid);
}
// Jogos 100% grátis para resgatar (Epic: promoção semanal; Steam: ofertas com 100% de desconto)
async function epicGratis() {
  const j = await getJson("https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=pt-BR&country=BR&allowCountries=BR");
  const out: any[] = [];
  for (const e of j.data?.Catalog?.searchStore?.elements ?? []) {
    const atual = e.promotions?.promotionalOffers?.[0]?.promotionalOffers?.[0];
    const prox = e.promotions?.upcomingPromotionalOffers?.[0]?.promotionalOffers?.[0];
    const p = atual ?? prox;
    if (!p || p.discountSetting?.discountPercentage !== 0 || adultTitle(e.title)) continue;
    const slug = e.offerMappings?.[0]?.pageSlug || e.productSlug || e.urlSlug;
    const imgs = e.keyImages ?? [];
    out.push({
      nome: e.title, agora: !!atual, inicio: p.startDate, fim: p.endDate,
      capa: (imgs.find((k: any) => k.type === "OfferImageTall") ?? imgs[0])?.url ?? "",
      url: slug ? "https://store.epicgames.com/pt-BR/p/" + String(slug).replace(/\/home$/, "") : "https://store.epicgames.com/pt-BR/free-games",
    });
  }
  return out;
}
async function steamAppInfo(appid: number) {
  const j = await getJson(`https://store.steampowered.com/api/appdetails?appids=${appid}&cc=br&l=portuguese`);
  const z = j?.[String(appid)];
  if (!z?.success || !z.data) return null;
  const d = z.data;
  if (adultTitle(d.name) || adultTitle(d.content_descriptors?.notes)) return null;
  const p = d.price_overview;
  return {
    steamAppid: Number(appid),
    nome: d.name ?? "",
    capa: safeImage(d.header_image) || "",
    preco: p ? Number(p.final) / 100 : (d.is_free ? 0 : null),
    precoInicial: p ? Number(p.initial) / 100 : (d.is_free ? 0 : null),
    desconto: p?.discount_percent ?? (d.is_free ? 100 : 0),
    isFree: !!d.is_free,
    tipo: d.type === "dlc" ? "DLC" : "Jogo",
    loja: "🟦 Steam",
    url: `https://store.steampowered.com/app/${appid}`,
  };
}
async function steamInfo(appids: number[] = [], nomes: string[] = []) {
  const out: any[] = [];
  const seen = new Set<number>();
  for (const a of appids.slice(0, 50)) {
    const id = Number(a);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    try { const z = await steamAppInfo(id); if (z) out.push(z); } catch {}
  }
  for (const nome of nomes.slice(0, 20)) {
    try {
      const q = await getJson(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(nome)}&cc=br&l=portuguese`);
      const id = Number(q?.items?.[0]?.id);
      if (!id || seen.has(id)) return;
      seen.add(id);
      const z = await steamAppInfo(id);
      if (z) out.push(z);
    } catch {}
  }
  return out;
}
async function steamGratis() {
  const seen = new Set<number>();
  const out: any[] = [];
  const add = (g: any) => {
    const id = Number(g?.id ?? g?.appid);
    if (!id || seen.has(id) || adultTitle(g.name)) return;
    const discount = Number(g?.discount_percent ?? 0);
    const finalPrice = Number(g?.final_price ?? -1);
    if (discount !== 100 || finalPrice !== 0 || Number(g.original_price ?? 0)<=0) return;
    seen.add(id);
    out.push({
      appid: id,
      nome: g.name,
      capa: g.large_capsule_image || g.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`,
      url: `https://store.steampowered.com/app/${id}`,
      fim: g.discount_expiration ? new Date(Number(g.discount_expiration) * 1000).toISOString() : "",
      preco: 0,
      precoInicial: Number(g.original_price ?? 0) / 100,
      desconto: 100,
    });
  };
  try {
    const j = await getJson("https://store.steampowered.com/api/featuredcategories?cc=br&l=portuguese");
    for (const key of ["specials", "featured_win", "featured_mac", "featured_linux", "large_capsules"]) {
      for (const g of j?.[key]?.items ?? []) add(g);
    }
  } catch {}
  // A busca da loja encontra promoções temporárias que não entram em featuredcategories.
  try {
    const pages=await Promise.allSettled([998,21].map(async category=>{const r=await fetch(`https://store.steampowered.com/search/results/?maxprice=free&specials=1&category1=${category}&ndl=1&count=100&cc=br&l=portuguese`,{headers:{"User-Agent":"Mozilla/5.0","Accept-Language":"pt-BR,pt;q=0.9"},signal:AbortSignal.any([signal,AbortSignal.timeout(8000)]),redirect:"error"});if(!r.ok)throw Error('Steam search');return readText(r,2*1024*1024)}));
    const html=pages.filter(x=>x.status==='fulfilled').map((x:any)=>x.value).join('');
    const ids=[...new Set([...html.matchAll(/data-ds-appid="([0-9]+)"/g)].map(m=>Number(m[1])))];
    for(let offset=0;offset<Math.min(ids.length,60);offset+=6){await Promise.all(ids.slice(offset,offset+6).map(async id=>{

      if (!id || seen.has(id)) return;
      try {
        const z = await steamAppInfo(id);
        if (!z || z.preco !== 0 || Number(z.precoInicial ?? 0) <= 0 || z.desconto!==100) return;
        seen.add(id);
        out.push({
          appid: id, nome: z.nome, capa: z.capa, url: z.url, tipo:z.tipo,
          fim: "", preco: 0, precoInicial: z.precoInicial, desconto: 100,
        });
      } catch {}
    }));}
  } catch {}
  return out;
}
    let out: unknown;
    switch (b.op) {
      case "capas": {
        const nomes: string[] = b.nomes ?? [], appids: number[] = b.appids ?? [];
        const capas = await Promise.all(appids.length ? appids.map((a) => capa(undefined, a, b.format)) : nomes.map((n) => capa(n, undefined, b.format)));
        out = { capas };
        break;
      }
      case "perfil": {
        if (!STEAM) throw new ApiError(503, "Integração Steam indisponível.");
        const id = await resolver(b.entrada ?? b.steamid);
        const p = (await st(`/ISteamUser/GetPlayerSummaries/v2/?steamids=${id}`)).response?.players?.[0];
        if (!p) throw new Error("Perfil da Steam não encontrado");
        const o = (await st(`/IPlayerService/GetOwnedGames/v1/?steamid=${id}&include_played_free_games=1`)).response ?? {};
        out = {
          steamid: id, nome: p.personaname, avatar: p.avatarfull, url: p.profileurl,
          publico: p.communityvisibilitystate === 3,
          jogos: o.game_count ?? null,
          horas: o.games ? Math.round(o.games.reduce((a: number, g: any) => a + g.playtime_forever, 0) / 60) : null,
        };
        break;
      }
      case "agora": {
        if (!STEAM) throw new ApiError(503, "Integração Steam indisponível.");
        const id = await resolver(b.steamid);
        const p = (await st(`/ISteamUser/GetPlayerSummaries/v2/?steamids=${id}`)).response?.players?.[0];
        out = {
          jogando: p?.gameid ? { appid: Number(p.gameid), nome: p.gameextrainfo ?? "" } : null,
          estado: p?.personastate ?? 0,
          publico: p?.communityvisibilitystate === 3,
        };
        break;
      }
      case "steamAmigos": {
        if (!STEAM) throw new ApiError(503, "Integração Steam indisponível.");
        const ids: string[] = (b.steamids ?? []).map((x: any) => String(x).trim()).filter(Boolean).slice(0, 100);
        if (!ids.length) { out = { amigos: [] }; break; }
        const players = (await st(`/ISteamUser/GetPlayerSummaries/v2/?steamids=${ids.join(",")}`)).response?.players ?? [];
        out = {
          amigos: players.map((p: any) => ({
            uid: String(p.steamid),
            nome: p.personaname ?? "",
            avatar: p.avatarfull ?? "",
            online: Number(p.personastate ?? 0) > 0,
            estado: Number(p.personastate ?? 0),
            publico: p.communityvisibilitystate === 3,
            jogando: p.gameid ? { appid: Number(p.gameid), nome: p.gameextrainfo ?? "" } : null,
          })),
        };
        break;
      }
      case "jogos": {
        const id = await resolver(b.steamid);
        const [owned, recent] = await Promise.all([
          st(`/IPlayerService/GetOwnedGames/v1/?steamid=${id}&include_appinfo=1&include_played_free_games=1`),
          st(`/IPlayerService/GetRecentlyPlayedGames/v1/?steamid=${id}&format=json`),
        ]);
        const o = owned.response ?? {};
        const r = recent.response ?? {};
        out = {
          jogos: (o.games ?? []).filter((g: any) => !adultTitle(g.name)).map((g: any) => ({ appid: g.appid, nome: g.name, horas: Math.round((g.playtime_forever / 60) * 10) / 10 })),
          recentes: (r.games ?? []).filter((g: any) => !adultTitle(g.name)).map((g: any) => ({
            appid: g.appid, nome: g.name,
            horas: Math.round((g.playtime_forever / 60) * 10) / 10,
            horasRecentes: Math.round((g.playtime_2weeks / 60) * 10) / 10,
            ultimaVez: g.rtime_last_played ? new Date(g.rtime_last_played * 1000).toISOString() : "",
          })).sort((a: any, b: any) => String(b.ultimaVez).localeCompare(String(a.ultimaVez))),
        };
        break;
      }
      case "conquistas": {
        const app=Number(b.appid);
        const schema=await st(`/ISteamUserStats/GetSchemaForGame/v2/?appid=${app}&l=brazilian`);
        let player:any=null;
        if(b.steamid){try{const id=await resolver(b.steamid);player=(await st(`/ISteamUserStats/GetPlayerAchievements/v1/?steamid=${id}&appid=${app}&l=brazilian`)).playerstats}catch{}}
        const progressKnown=player?.success!==false&&Array.isArray(player?.achievements);
        const unlocked=new Map((player?.achievements??[]).map((a:any)=>[a.apiname,a]));
        const lista=(schema.game?.availableGameStats?.achievements??[]).map((a:any)=>{const p:any=unlocked.get(a.name);return {nome:a.displayName||a.name,desc:a.description||'',got:progressKnown?p?.achieved===1:null,quando:p?.unlocktime?new Date(p.unlocktime*1000).toISOString().slice(0,10):'',icon:a.icon||a.icongray,progressKnown}});
        out={lista,progressKnown,erro:lista.length?'':'Este jogo não disponibiliza conquistas na Steam.'};
        break;
      }
      case "steamInfo": {
        out = { lista: await steamInfo(b.appids ?? [], b.nomes ?? []) };
        break;
      }
      case "gratis": {
        const [ep, sd] = await Promise.allSettled([epicGratis(), steamGratis()]);
        out = { epic: ep.status === "fulfilled" ? ep.value : [], steam: sd.status === "fulfilled" ? sd.value : [] };
        break;
      }
      default:
        throw new ApiError(400, "Operação inválida.");
    }
    return out;
}

Deno.serve(async (req: Request) => {
  try {
    const origin = req.headers.get("Origin");
    if (origin && origin !== SITE) throw new ApiError(403, "Origem não autorizada.");
    if (req.method === "OPTIONS") return response(req,null,204);
    if (req.method !== "POST") throw new ApiError(405, "Método não permitido.");
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get("Content-Type") || "")) throw new ApiError(415, "Envie JSON.");
    const uid = await authenticate(req);
    const parsed = validate(await readJson(req,16384));
    const b = parsed.body;
    await rateLimit(uid,parsed.cost);
    if (["perfil","agora","steamAmigos","jogos","conquistas"].includes(b.op) && !STEAM)
      throw new ApiError(503, "Integração Steam indisponível.");
    const out = await runOperation(b,AbortSignal.timeout(35000));
    return response(req,out);
  } catch (e) {
    const known = e instanceof ApiError;
    // Never return/log tokens, provider URLs containing keys, or raw upstream exceptions.
    return response(req,{erro:known ? e.message : "Não foi possível concluir a busca. Tente novamente."},known ? e.status : 502);
  }
});


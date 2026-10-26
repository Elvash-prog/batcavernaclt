import {steamGridCover} from '../_shared/steamgrid.js';
import {backendKeys} from '../_shared/api-keys.js';
const apiKeys=backendKeys(name=>Deno.env.get(name));
import {instrument,metricRecorder} from '../_shared/operational-metrics.js';
// BatCaverna — Patch 1.39.3. Deploy as bright-api; authentication is verified below.
// Run patch-1.39.3-bright-api.sql before deploying this file.
// Secrets: STEAM_KEY, RETROACHIEVEMENTS_KEY; SUPABASE_* variables are supplied by Supabase.
class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status=status; }
}

const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_ANON = apiKeys.publicKey;
const SB_SERVICE = apiKeys.secretKey;
function response(req: Request, data: unknown, status = 200) {
  const headers: Record<string,string> = {
    "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff", "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
  };

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
function rauser(v: unknown): string {
  if (typeof v !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(v.trim())) throw new ApiError(400, "Perfil RetroAchievements inválido.");
  return v.trim();
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
      cost = Math.max(1, out.appids.length ? out.appids.length * 2 : out.nomes.length * 3); break;
    case "perfil": out.entrada = entry(b.entrada ?? b.steamid); cost=3; break;
    case "steamSync": out.appids=array(b.appids,5,appid);cost=10;break;
    case "agora": out.steamid=steamid(b.steamid); break;
    case "jogos": out.steamid=steamid(b.steamid); cost=3; break;
    case "conquistas": if(b.steamid)out.steamid=steamid(b.steamid); out.appid=appid(b.appid); cost=b.steamid?2:1; break;
    case "steamAmigos": out.steamids=array(b.steamids,100,steamid); cost=Math.max(1,Math.ceil(out.steamids.length/10)); break;
    case "raCollection": break;
    case "raSaveCollection":
      if(b.cover_url!==undefined){const url=String(b.cover_url);if(url.length>2000||url&&!url.startsWith(SB_URL+"/storage/v1/object/public/"))throw new ApiError(400,"Capa inválida.");out.cover_url=url;}
      if(b.gameId!==undefined)out.gameId=appid(b.gameId);if(b.removeGameId!==undefined)out.removeGameId=appid(b.removeGameId);if(b.gameId&&b.removeGameId)throw new ApiError(400,"Escolha uma ação por vez.");
      if(b.statusGameId!==undefined){out.statusGameId=appid(b.statusGameId);if(!["backlog","progress","finished","platinum","paused","abandoned"].includes(b.status))throw new ApiError(400,"Status retrô inválido.");out.status=b.status;}
      break;
    case "raSearch": {
      // Compatibility keys used by desktop 0.17.36 and Android 1.7.3 dropdowns.
      // These UI keys differ from the official RA system IDs for these systems.
      const legacySystems: Record<number,number>={10:11,11:12,12:13,13:14,14:15,57:53,78:16};
      if(b.consoleId!==undefined){const id=appid(b.consoleId);out.consoleId=b.canonicalId===true?id:(legacySystems[id]??id);}
      out.query=name(b.query);cost=out.consoleId?3:12;break;
    }
    case "raPerfil": out.usuario=rauser(b.usuario); cost=2; break;
    case "raJogos": out.usuario=rauser(b.usuario); out.offset=Math.max(0,Math.min(5000,Number(b.offset)||0)); cost=4; break;
    case "raConquistas": out.usuario=rauser(b.usuario); out.gameId=appid(b.gameId); cost=3; break;
    case "gratis": cost=35; break;
    default: throw new ApiError(400, "Operação inválida.");
  }
  return {body:out,cost};
}
async function rateLimit(uid: string, cost: number) {
  const r = await fetch(SB_URL + "/rest/v1/rpc/clt_bright_api_limit", {
    method:"POST", headers:{"Content-Type":"application/json",apikey:SB_SERVICE},
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
function raMedia(v: unknown, prefix = "", suffix = ""): string {
  const raw = typeof v === "string" ? v.trim() : "";
  if (!raw) return "";
  if (/^https:\/\//i.test(raw)) return safeImage(raw) || "";
  if (raw.startsWith("//")) return safeImage("https:" + raw) || "";
  const clean = raw.replace(/^\/+/, "");
  let path = clean.includes("/") ? clean : prefix + clean;
  if (suffix && !/\.[a-z0-9]{2,5}$/i.test(path)) path += suffix;
  return safeImage("https://media.retroachievements.org/" + path) || "";
}
const STEAMGRID = Deno.env.get("STEAMGRIDDB_KEY") || Deno.env.get("STEAMGRIDDB_API_KEY") || Deno.env.get("SGDB_KEY") || Deno.env.get("STEAMGRID_KEY") || "";
const gridCache = new Map<string,{until:number,url:string|null}>();
const STEAM = Deno.env.get("STEAM_KEY") ?? "";
const RA = Deno.env.get("RETROACHIEVEMENTS_KEY") ?? "";

const raSystemCache = new Map<number,{expires:number,rows:any[]}>();
const raSearchSystems = [1,2,3,4,5,6,7,8,10,12,13,14,16,17,18,21,23,25,27,28,39,40,41,53];
async function runOperation(b: any, signal: AbortSignal, uid: string): Promise<unknown> {
const getJson = async (u: string, h: HeadersInit = {}) => {
  for(let attempt=0;attempt<2;attempt++){try{const r=await fetch(u,{headers:h,signal:AbortSignal.any([signal,AbortSignal.timeout(8000)]),redirect:"error"});if((r.status===429||r.status>=500)&&attempt===0){await new Promise(resolve=>setTimeout(resolve,400));continue}if(!r.ok)throw new ApiError(502,"Serviço de jogos indisponível. Tente novamente.");return await readJson(r,8*1024*1024)}catch(error){if(error instanceof ApiError||attempt>0||signal.aborted)throw error;await new Promise(resolve=>setTimeout(resolve,400))}}
  throw new ApiError(502,"Serviço de jogos indisponível. Tente novamente.");
};
const st = (p: string) => getJson("https://api.steampowered.com" + p + (p.includes("?") ? "&" : "?") + "key=" + STEAM + "&format=json");
const ra = (endpoint: string, params: Record<string,string|number>) => {
  if (!RA) throw new ApiError(503, "Integração RetroAchievements indisponível.");
  const q = new URLSearchParams({y:RA}); for (const [key,value] of Object.entries(params)) q.set(key,String(value));
  return getJson(`https://retroachievements.org/API/${endpoint}?${q}`);
};
async function capa(nome?: string, appid?: number, format = "poster"): Promise<string | null> {
  if (adultTitle(nome)) return null;
  const cacheKey=JSON.stringify([nome||'',appid||0,format]),hit=gridCache.get(cacheKey);if(hit&&hit.until>Date.now())return hit.url;
  try{const url=await steamGridCover({name:nome,appid,format,key:STEAMGRID,getJson});gridCache.set(cacheKey,{until:Date.now()+(url?86400000:300000),url});if(gridCache.size>2048)gridCache.delete(gridCache.keys().next().value!);return url;}catch{return null;}
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
    generos:d.genres||[], descricao:d.short_description||"",ano:String(d.release_date?.date||"").match(/\d{4}/)?.[0]||"",
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
      const canonical=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
      const hit=(q?.items||[]).find((g:any)=>canonical(g.name||"")===canonical(nome));
      const id = Number(hit?.id);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const z = await steamAppInfo(id);
      if (z) out.push(z);
    } catch {}
  }
  return out;
}
async function steamGratis(requestSignal: AbortSignal) {
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
    const pages=await Promise.allSettled([998,21].map(async category=>{const r=await fetch(`https://store.steampowered.com/search/results/?maxprice=free&specials=1&category1=${category}&ndl=1&count=100&cc=br&l=portuguese`,{headers:{"User-Agent":"Mozilla/5.0","Accept-Language":"pt-BR,pt;q=0.9"},signal:AbortSignal.any([requestSignal,AbortSignal.timeout(8000)]),redirect:"error"});if(!r.ok)throw Error('Steam search');return readText(r,2*1024*1024)}));
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
          st(`/IPlayerService/GetRecentlyPlayedGames/v1/?steamid=${id}&format=json`).catch(()=>({response:{}})),
        ]);
        const o = owned.response ?? {};
        const r = recent.response ?? {};
        out = {
          jogos: (o.games ?? []).filter((g: any) => !adultTitle(g.name)).map((g: any) => ({ appid: g.appid, nome: g.name, horas: (Number.isFinite(g.playtime_forever)&&g.playtime_forever>=0?g.playtime_forever/60:null) })),
          recentes: (r.games ?? []).filter((g: any) => !adultTitle(g.name)).map((g: any) => ({
            appid: g.appid, nome: g.name,
            horas: (Number.isFinite(g.playtime_forever)&&g.playtime_forever>=0?g.playtime_forever/60:null),
            horasRecentes: (Number.isFinite(g.playtime_2weeks)&&g.playtime_2weeks>=0?g.playtime_2weeks/60:null),
            ultimaVez: g.rtime_last_played ? new Date(g.rtime_last_played * 1000).toISOString() : "",
          })).sort((a: any, b: any) => String(b.ultimaVez).localeCompare(String(a.ultimaVez))),
        };
        break;
      }
      case "steamSync": {
        const headers={apikey:SB_SERVICE,"Content-Type":"application/json"};
        const profiles=await getJson(SB_URL+"/rest/v1/perfis?select=steam_id&id=eq."+uid+"&limit=1",headers);
        const id=profiles[0]?.steam_id;if(!id){out={updated:0,connected:false};break;}
        const filter=b.appids.length?"&steam_appid=in.("+b.appids.join(",")+")":"";
        const rows=await getJson(SB_URL+"/rest/v1/itens?select=id,steam_appid,horas,conquistas&categoria=eq.jogos&user_id=eq."+uid+"&steam_appid=not.is.null&loja=ilike.*steam*"+filter+"&order=id.asc&limit=5",headers);
        if(!rows.length){out={updated:0,connected:true};break;}
        const owned=(await st(`/IPlayerService/GetOwnedGames/v1/?steamid=${steamid(id)}&include_played_free_games=1`)).response?.games;
        if(!Array.isArray(owned)){out={updated:0,connected:true,private:true};break;}
        let updated=0;const unavailable:number[]=[];
        await Promise.all(rows.map(async(row:any)=>{const game=owned.find((g:any)=>Number(g.appid)===Number(row.steam_appid));if(!game)return;const patch:any={};if(Number.isFinite(game.playtime_forever)&&game.playtime_forever>=0)patch.horas=Math.max(Number(row.horas)||0,Math.round(game.playtime_forever/60*1000)/1000);
          try{const player=(await st(`/ISteamUserStats/GetPlayerAchievements/v1/?steamid=${steamid(id)}&appid=${appid(row.steam_appid)}&l=brazilian`)).playerstats;if(player?.success!==false&&Array.isArray(player?.achievements)&&player.achievements.length){patch.conquistas=Math.round(player.achievements.filter((a:any)=>a.achieved===1).length/player.achievements.length*10000)/100;}}catch{unavailable.push(Number(row.steam_appid));}
          if(patch.horas===Number(row.horas))delete patch.horas;if(patch.conquistas===Number(row.conquistas))delete patch.conquistas;if(!Object.keys(patch).length)return;
          const saved=await fetch(SB_URL+"/rest/v1/itens?user_id=eq."+uid+"&id=eq."+row.id+"&steam_appid=eq."+row.steam_appid,{method:"PATCH",headers,body:JSON.stringify(patch),signal});if(!saved.ok)throw new ApiError(503,"Não foi possível atualizar o progresso.");updated++;
        }));out={updated,connected:true,unavailable};break;
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
      case "raCollection": case "raSaveCollection": {
        const endpoint=SB_URL+"/rest/v1/clt_retro_collection";
        const headers={apikey:SB_SERVICE,"Content-Type":"application/json"};
        let row;
        if(b.op==="raSaveCollection"){
          const r=await fetch(SB_URL+"/rest/v1/rpc/clt_retro_mutate",{method:"POST",headers,body:JSON.stringify({p_user:uid,p_add:b.gameId||null,p_remove:b.removeGameId||null,p_cover:b.cover_url??null,p_status_game:b.statusGameId||null,p_status:b.status??null}),signal});
          if(!r.ok)throw new ApiError(400,"Não foi possível salvar o Meu Retrô. Confira o limite da coleção.");
          row=await r.json();
        }else{
          const existing=await getJson(endpoint+"?user_id=eq."+uid+"&select=cover_url,game_ids,hidden_game_ids,statuses",headers);
          row=existing[0]||{cover_url:"",game_ids:[],hidden_game_ids:[],statuses:{}};
        }
        out=row;break;
      }
      case "raSearch": {
        const norm=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
        const load=async(system:number)=>{let cached=raSystemCache.get(system);if(!cached||cached.expires<Date.now()){const rows=await ra("API_GetGameList.php",{i:system,f:1,h:0});if(!Array.isArray(rows))throw new ApiError(502,"Catálogo RetroAchievements indisponível.");cached={expires:Date.now()+86400000,rows};if(raSystemCache.size>=80)raSystemCache.delete(raSystemCache.keys().next().value!);raSystemCache.set(system,cached);}return cached.rows;};
        const systems=b.consoleId?[b.consoleId]:raSearchSystems,catalog:any[]=[];
        // Limit concurrency so RetroAchievements does not drop entire platforms under burst load.
        let cursor=0;const workers=Array.from({length:Math.min(4,systems.length)},async()=>{while(cursor<systems.length){const system=systems[cursor++];try{catalog.push(...await load(system));}catch{}}});await Promise.all(workers);
        if(!catalog.length)throw new ApiError(502,"Catálogo RetroAchievements indisponível.");
        const query=norm(b.query),score=(title:string)=>{const value=norm(title||'');return value===query?0:value.startsWith(query)?1:value.includes(' '+query)?2:3;},seen=new Set<number>();
        out={jogos:catalog.filter(g=>{const id=Number(g.ID);return !seen.has(id)&&seen.add(id)&&!adultTitle(g.Title)&&norm(g.Title||'').includes(query)}).sort((a,b)=>score(a.Title)-score(b.Title)||String(a.Title).localeCompare(String(b.Title),'pt-BR')).slice(0,80).map(g=>({gameId:Number(g.ID),nome:g.Title,console:g.ConsoleName,capa:raMedia(g.ImageIcon,"Images/"),total:Number(g.NumAchievements)||0}))};break;
      }
      case "raPerfil": {
        const p=await ra("API_GetUserProfile.php",{u:b.usuario});
        if(!p?.User&&!p?.ULID)throw new ApiError(404,"Perfil RetroAchievements não encontrado.");
        out={usuario:p.User||b.usuario,ulid:p.ULID||"",avatar:raMedia(p.UserPic,"UserPic/"),pontos:Number(p.TotalPoints)||0,pontosHardcore:Number(p.TotalTruePoints)||0,jogoAtual:Number(p.LastGameID)||null,presenca:p.RichPresenceMsg||"",membroDesde:p.MemberSince||""};
        break;
      }
      case "raJogos": {
        const [progress,recentes]=await Promise.all([
          ra("API_GetUserCompletionProgress.php",{u:b.usuario,c:500,o:b.offset||0}),
          ra("API_GetUserRecentlyPlayedGames.php",{u:b.usuario,c:50,o:0}),
        ]);
        const map=(g:any)=>({gameId:Number(g.GameID)||0,nome:g.Title||"Jogo retrô",console:g.ConsoleName||"",capa:raMedia(g.ImageIcon,"Images/"),total:Number(g.MaxPossible??g.NumPossibleAchievements??g.AchievementsTotal)||0,desbloqueadas:Number(g.NumAwarded??g.NumAchieved)||0,hardcore:Number(g.NumAwardedHardcore??g.NumAchievedHardcore)||0,ultimaVez:g.MostRecentAwardedDate||g.LastPlayed||"",premio:g.HighestAwardKind||""});
        out={total:Number(progress?.Total)||0,jogos:(progress?.Results||[]).map(map),recentes:(recentes||[]).map(map)};
        break;
      }
      case "raConquistas": {
        const g=await ra("API_GetGameInfoAndUserProgress.php",{u:b.usuario,g:b.gameId,a:1});
        const source=Array.isArray(g?.Achievements)?g.Achievements:Object.values(g?.Achievements||{});
        const achievements=source.map((a:any)=>({id:Number(a.ID)||0,nome:a.Title||"Conquista",desc:a.Description||"",pontos:Number(a.Points)||0,got:Boolean(a.DateEarned||a.DateEarnedHardcore),hardcore:Boolean(a.DateEarnedHardcore),quando:a.DateEarnedHardcore||a.DateEarned||"",icon:raMedia(a.BadgeURL||a.BadgeName,"Badge/",".png")}));
        out={gameId:b.gameId,nome:g?.Title||"",console:g?.ConsoleName||"",capa:raMedia(g?.ImageIcon,"Images/"),lista:achievements};
        break;
      }
      case "gratis": {
        const [ep, sd] = await Promise.allSettled([epicGratis(), steamGratis(signal)]);
        out = { epic: ep.status === "fulfilled" ? ep.value : [], steam: sd.status === "fulfilled" ? sd.value : [] };
        break;
      }
      default:
        throw new ApiError(400, "Operação inválida.");
    }
    return out;
}

const handleRequest=async (req: Request) => {
  try {
    const origin = req.headers.get("Origin");
    if (origin) throw new ApiError(403, "Origem não autorizada.");
    if (req.method === "OPTIONS") return response(req,null,204);
    if (req.method !== "POST") throw new ApiError(405, "Método não permitido.");
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get("Content-Type") || "")) throw new ApiError(415, "Envie JSON.");
    const uid = await authenticate(req);
    const parsed = validate(await readJson(req,16384));
    const b = parsed.body;
    await rateLimit(uid,parsed.cost);
    if (["perfil","agora","steamAmigos","jogos","conquistas","steamSync"].includes(b.op) && !STEAM)
      throw new ApiError(503, "Integração Steam indisponível.");
    if (["raPerfil","raJogos","raConquistas"].includes(b.op) && !RA)
      throw new ApiError(503, "Integração RetroAchievements indisponível.");
    const out = await runOperation(b,AbortSignal.timeout(35000),uid);
    return response(req,out);
  } catch (e) {
    const known = e instanceof ApiError;
    // Never return/log tokens, provider URLs containing keys, or raw upstream exceptions.
    return response(req,{erro:known ? e.message : "Não foi possível concluir a busca. Tente novamente."},known ? e.status : 502);
  }
 };
Deno.serve(instrument(handleRequest,{service:'bright-api',record:metricRecorder({SUPABASE_URL:SB_URL,SUPABASE_SERVICE_ROLE_KEY:SB_SERVICE}),background:(task:Promise<unknown>)=>{const runtime=(globalThis as any).EdgeRuntime;if(runtime?.waitUntil)runtime.waitUntil(task);else void task.catch(()=>{});}}));

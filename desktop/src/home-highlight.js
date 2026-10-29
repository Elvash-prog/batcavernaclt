'use strict';
function chooseHomeHighlight(games,pinned='',recent={},steam=[]){
 const fixed=games.find(g=>String(g.id)===String(pinned));if(fixed)return fixed;
 const times=new Map(steam.map(g=>[String(g.appid),Date.parse(g.ultimaVez)||0]));
 const played=games.map(g=>({game:g,time:Math.max(Number(recent[String(g.id)])||0,times.get(String(g.steam_appid))||0)})).filter(g=>g.time>0).sort((a,b)=>b.time-a.time);
 return played[0]?.game||games.filter(g=>normalizedStatus(g.status)==='progress').sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||'')))[0]||null;
}
function homeHighlightPreferences(){try{return JSON.parse(localStorage.getItem('bc-home-highlight:'+state.userId)||'{}')||{}}catch{return {}}}
async function resolveHomeHighlight(games){
 const prefs=homeHighlightPreferences();let steam=[];
 if(!games.some(g=>String(g.id)===String(prefs.pinned))&&state.profile?.steam_id){try{const result=await api.bright({op:'jogos',steamid:state.profile.steam_id});steam=result.recentes||[];}catch{}}
 return chooseHomeHighlight(games,prefs.pinned,prefs.recent||{},steam);
}
function rememberHomeGame(row){if(!row||!state.userId)return;const prefs=homeHighlightPreferences();prefs.recent={...prefs.recent,[String(row.id)]:Date.now()};localStorage.setItem('bc-home-highlight:'+state.userId,JSON.stringify(prefs));}
async function loadHomeHero(image,item){
 const urls=[];if(/^[1-9][0-9]*$/.test(String(item.steam_appid||''))){for(const host of ['shared.akamai.steamstatic.com','shared.fastly.steamstatic.com'])urls.push(`https://${host}/store_item_assets/steam/apps/${item.steam_appid}/library_hero.jpg`);}
 for(const url of urls){try{const source=await api.coverImage(url);if(image.isConnected)image.src=source;return;}catch{}}
 try{const data=await call('community',{input:{op:'steam_details',appid:Number(item.steam_appid)||null,query:item.nome}});for(const shot of data.screenshots||[]){if(!shot.path_full)continue;try{const source=await api.coverImage(shot.path_full);if(image.isConnected)image.src=source;return;}catch{}}}catch{}
 if(item.capa){try{const source=await api.coverImage(await signed(coverUrl(item.capa)));if(image.isConnected)image.src=source;}catch{}}
}

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
function homeAchievementProgress(item,official,local){
 const rows=official?.lista||[],total=Math.max(rows.length,Number(local?.total)||0),unlocked=Math.min(total,Math.max(rows.filter(a=>a.got===true).length,Number(local?.unlocked)||0));
 if(total>0&&(rows.some(a=>typeof a.got==='boolean')||Number(local?.total)>0&&local?.unlocked!=null))return {percent:unlocked/total*100,label:`${unlocked} de ${total} · ${Math.round(unlocked/total*100)}%`};
 const percent=item.conquistas==null||item.conquistas===''?NaN:Number(item.conquistas);
 return Number.isFinite(percent)&&percent>=0&&percent<=100?{percent,label:percent.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%'}:null;
}
function createHomeAchievementProgress(item){
 const box=document.createElement('div');box.className='journey-progress';
 const render=data=>{box.innerHTML=data?`<span>Conquistas desbloqueadas</span><b>${esc(data.label)}</b><progress max="100" value="${data.percent}" aria-label="Progresso de conquistas"></progress>`:'<span>Conquistas</span><b>Progresso indisponível</b>';};
 render(homeAchievementProgress(item,null,null));
 if(item.steam_appid){const owner=state.userId;void Promise.allSettled([api.bright({op:'conquistas',appid:Number(item.steam_appid),...(state.profile?.steam_id?{steamid:state.profile.steam_id}:{})}),api.localSteamAchievements(item.steam_appid)]).then(([official,local])=>{if(box.isConnected&&owner===state.userId)render(homeAchievementProgress(item,official.status==='fulfilled'?official.value:null,local.status==='fulfilled'?local.value:null));});}
 return box;
}
function playtimeEditorParts(value){const raw=Number(value),minutes=Number.isFinite(raw)&&raw>=0?Math.round(raw*60):0;return {hours:Math.floor(minutes/60),minutes:minutes%60};}
function installPlaytimeEditor(form,row){
 const field=form.elements.horas;if(!field)return;const original=field.value,parts=playtimeEditorParts(original),wrapper=document.createElement('div');wrapper.className='playtime-edit-field';wrapper.innerHTML='<span>Tempo jogado</span><div class="playtime-editor"><label>Horas<input type="number" min="0" step="1" data-play-hours aria-label="Horas jogadas"></label><label>Minutos<input type="number" min="0" max="59" step="1" data-play-minutes aria-label="Minutos jogados"></label></div>';
 field.closest('label').replaceWith(wrapper);field.type='hidden';wrapper.append(field);const hours=wrapper.querySelector('[data-play-hours]'),minutes=wrapper.querySelector('[data-play-minutes]');hours.value=original===''?'':String(parts.hours);minutes.value=original===''?'':String(parts.minutes);
 wrapper.addEventListener('input',()=>{field.dataset.numericTouched='1';field.value=hours.value===''&&minutes.value===''?'':String(Number(hours.value||0)+Number(minutes.value||0)/60);});
}

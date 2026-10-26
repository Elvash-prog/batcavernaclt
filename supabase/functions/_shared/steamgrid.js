// Only public, static art matching the requested orientation is returned.
const titleKey=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function selectSteamGrid(rows,format){
 return (Array.isArray(rows)?rows:[]).filter(row=>{
  try{const u=new URL(row.url);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['cdn2.steamgriddb.com','cdn.steamgriddb.com'].includes(u.hostname)&&!row.nsfw&&!row.humor&&!row.epilepsy&&row.mime!=='image/gif'&&(format==='landscape'?row.width>row.height:row.height>row.width);}catch{return false;}
 }).sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)||(Number(a.id)||0)-(Number(b.id)||0))[0]?.url||null;
}
export async function steamGridCover({name,appid,format='poster',key,getJson}){
 if(!key)return null;
 const headers={Authorization:'Bearer '+key};let path;
 if(appid)path='grids/steam/'+Number(appid);
 else{const result=await getJson('https://www.steamgriddb.com/api/v2/search/autocomplete/'+encodeURIComponent(name||''),headers);const matches=(result.data||[]).filter(row=>titleKey(row.name)===titleKey(name));if(matches.length!==1)return null;path='grids/game/'+Number(matches[0].id);}
 const dimensions=format==='landscape'?'460x215,920x430':'600x900';
 const data=await getJson('https://www.steamgriddb.com/api/v2/'+path+'?'+new URLSearchParams({dimensions,types:'static',nsfw:'false',humor:'false',epilepsy:'false'}),headers);
 return selectSteamGrid(data.data,format);
}

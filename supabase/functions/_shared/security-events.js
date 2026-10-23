const routes=new Set(['igdb','tmdb','media','steam_cover','steam_free','other','games','auth_login']);
const services=new Set(['native-api','bright-api','login-username']);

// Bounded per-isolate sampling. Never accept request objects or arbitrary labels.
export function securityReporter({write=event=>console.warn(JSON.stringify(event)),clock=()=>Date.now(),windowMs=60000}={}){
 const windows=new Map();
 return metric=>{
  const status=Number(metric.p_status);
  if(![401,403,429].includes(status)&&!(status>=500&&status<=599))return;
  const service=services.has(metric.p_service)?metric.p_service:'native-api';
  const route=routes.has(metric.p_route)?metric.p_route:'other';
  const category=status>=500?'server_error':status===429?'rate_limited':status===403?'forbidden':'unauthorized';
  const key=service+':'+route+':'+category,now=clock(),previous=windows.get(key);
  if(previous&&now-previous.at<windowMs){previous.suppressed++;return;}
  const elapsed=Number(metric.p_elapsed);
  const event={event:'security_response',service,route,category,status,elapsed_ms:Number.isFinite(elapsed)?Math.max(0,Math.min(120000,Math.round(elapsed))):0,sampled:true,window_ms:windowMs,suppressed_previous:previous?.suppressed||0};
  windows.set(key,{at:now,suppressed:0});
  try{write(event);}catch{}
 };
}

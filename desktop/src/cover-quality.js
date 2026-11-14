/* Resolution variants of the same public artwork. Saved URLs and custom sources stay intact. */
(()=>{'use strict';
 const unavailable=new Map(),retryAfter=300000;
 function candidates(source){
  const original=String(source||''),out=[];
  try{const url=new URL(original);if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash)return [original];
   if(url.hostname==='s4.anilist.co'&&/^\/file\/anilistcdn\/media\/anime\/cover\/(?:small|medium)\/[A-Za-z0-9_.-]+$/.test(url.pathname))out.push(original.replace(/\/cover\/(?:small|medium)\//,'/cover/large/'));
   if(url.hostname==='images.igdb.com'&&/^\/igdb\/image\/upload\/t_(?:thumb|cover_small|cover_big|screenshot_med|screenshot_big|screenshot_huge)\/[A-Za-z0-9_-]+\.(?:jpg|png|webp)$/.test(url.pathname))out.push(original.replace(/\/t_[^/]+\//,'/t_1080p/'));
   if(url.hostname==='image.tmdb.org'&&/^\/t\/p\/w(?:92|154|185|342|500|780)\/[A-Za-z0-9_.-]+$/.test(url.pathname))out.push(original.replace(/\/w[0-9]+\//,'/original/'));
   if(/^(?:shared|cdn)\.(?:akamai|cloudflare|fastly)\.steamstatic\.com$/.test(url.hostname)&&/^\/(?:store_item_assets\/steam\/apps|steam\/apps)\/[1-9][0-9]*(?:\/[A-Za-z0-9_-]+)?\/header\.jpg$/.test(url.pathname))out.push(original.replace(/\/header\.jpg$/,'/header_2x.jpg'));
  }catch{}
  return [...new Set([...out,original])];
 }
 async function load(source,fetchImage){
  const urls=candidates(source);let failure;
  for(const url of urls){if(url!==source&&(unavailable.get(url)||0)>Date.now())continue;
   try{const image=await fetchImage(url);unavailable.delete(url);return image;}catch(error){failure=error;if(url!==source){unavailable.delete(url);unavailable.set(url,Date.now()+retryAfter);if(unavailable.size>160)unavailable.delete(unavailable.keys().next().value);}}
  }throw failure||Error('Capa indisponível');
 }
 window.BatCoverQuality={candidates,load};
})();

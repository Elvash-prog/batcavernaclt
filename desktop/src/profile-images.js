// Crop coordinates are persisted as percentages of the image overflow on each axis.
(() => {
 'use strict';
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 function frame(width,height,iw,ih,x,y,z){const scale=Math.max(width/iw,height/ih)*z/100;return {scale,w:iw*scale,h:ih*scale,left:(width-iw*scale)*x/100,top:(height-ih*scale)*y/100};}
 function atPoint(width,height,iw,ih,old,z,from,to=from){const a=frame(width,height,iw,ih,old.x,old.y,old.z),scale=Math.max(width/iw,height/ih)*z/100,w=iw*scale,h=ih*scale;return {x:w>width?clamp((to.x-(from.x-a.left)/a.scale*scale)/(width-w)*100,0,100):50,y:h>height?clamp((to.y-(from.y-a.top)/a.scale*scale)/(height-h)*100,0,100):50,z};}
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function markup(profile,cover){
  const card=(kind,title,description)=>`<article class="image-crop-card image-crop-${kind}"><div class="image-crop-heading"><div><h3>${title}</h3><p>${description}</p></div><button type="button" class="secondary" data-image-pick="${kind}">Trocar imagem</button></div><div class="image-crop-workspace"><div class="image-crop-surface" data-image-crop="${kind}" tabindex="0" role="group" aria-label="Enquadrar ${kind==='avatar'?'foto de perfil':'capa'}. Arraste ou use as setas. Use mais e menos para zoom."><img alt="" draggable="false"><span class="image-crop-guide" aria-hidden="true"></span><span class="image-crop-empty">${kind==='avatar'?'Sua foto':'Sua capa'}<small>Escolha uma imagem para começar</small></span></div><div class="image-crop-toolbar"><div class="image-crop-zoom"><button type="button" data-image-minus="${kind}" aria-label="Diminuir zoom da ${title.toLowerCase()}">−</button><output data-image-zoom="${kind}" aria-live="polite">100%</output><button type="button" data-image-plus="${kind}" aria-label="Aumentar zoom da ${title.toLowerCase()}">+</button></div><button type="button" class="image-crop-reset" data-image-reset="${kind}">Centralizar</button><button type="button" class="image-crop-remove" data-image-remove="${kind}">Remover</button></div></div><p class="image-crop-hint">Arraste para enquadrar · role para ampliar</p></article>`;
  return `<div class="profile-image-studio"><div class="image-studio-intro"><span class="eyebrow">DO SEU JEITO</span><h3>Seu perfil, seu enquadramento</h3><p>Escolha uma imagem e ajuste diretamente na prévia.</p></div>${card('cover','Capa','O cenário da sua página.')}${card('avatar','Foto de perfil','Um recorte que combina com você.')}<input name="avatarFile" type="file" accept="image/png,image/jpeg,image/webp" hidden><input name="bannerFile" type="file" accept="image/png,image/jpeg,image/webp" hidden><input name="avatar" type="hidden" value="${escape(profile.avatar_url||'')}"><input name="banner" type="hidden" value="${escape(cover.url)}">${[['coverX',cover.x],['coverY',cover.y],['coverZoom',cover.z],['avatarX',50],['avatarY',50],['avatarZoom',100]].map(([name,value])=>`<input name="${name}" type="hidden" value="${value}">`).join('')}</div>`;
 }
 function mount(form,{remove}={}){
  const controllers={};let disposed=false;
  for(const kind of ['cover','avatar']){
   const surface=form.querySelector(`[data-image-crop="${kind}"]`),img=surface.querySelector('img'),prefix=kind==='cover'?'cover':'avatar',field=kind==='cover'?'bannerFile':'avatarFile';
   let source='',ready=false,points=new Map(),start=null;
   const read=()=>({x:Number(form.elements[prefix+'X'].value),y:Number(form.elements[prefix+'Y'].value),z:Number(form.elements[prefix+'Zoom'].value)});
   const size=()=>({w:surface.clientWidth,h:surface.clientHeight});
   const busy=()=>disposed||form.getAttribute('aria-busy')==='true';
   function paint(){const s=read(),{w,h}=size();if(ready&&w&&h){const a=frame(w,h,img.naturalWidth,img.naturalHeight,s.x,s.y,s.z);Object.assign(img.style,{width:a.w+'px',height:a.h+'px',transform:`translate(${a.left}px,${a.top}px)`});}surface.classList.toggle('has-image',ready);form.querySelector(`[data-image-zoom="${kind}"]`).value=Math.round(s.z)+'%';for(const [action,disabled] of [['minus',!ready||s.z<=100],['plus',!ready||s.z>=250],['reset',!ready],['remove',!source]])form.querySelector(`[data-image-${action}="${kind}"]`).disabled=busy()||disabled;}
   function write(s){for(const [key,name] of [['x','X'],['y','Y'],['z','Zoom']])form.elements[prefix+name].value=s[key];paint();}
   function zoom(z,point){if(!ready||busy())return;const s=read(),{w,h}=size();write(atPoint(w,h,img.naturalWidth,img.naturalHeight,s,clamp(z,100,250),point||{x:w/2,y:h/2}));}
   const local=e=>{const r=surface.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
   function baseline(){const p=[...points.values()];start=p.length?{state:read(),point:p.length>1?{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2}:p[0],distance:p.length>1?Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y):0}:null;}
   surface.addEventListener('pointerdown',e=>{if(!ready||busy()||e.button!==0)return;e.preventDefault();surface.focus({preventScroll:true});surface.setPointerCapture(e.pointerId);points.set(e.pointerId,local(e));baseline();surface.classList.add('is-dragging');});
   surface.addEventListener('pointermove',e=>{if(!points.has(e.pointerId)||!start||busy())return;points.set(e.pointerId,local(e));const p=[...points.values()],to=p.length>1?{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2}:p[0],z=p.length>1&&start.distance>0?clamp(start.state.z*Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)/start.distance,100,250):start.state.z,{w,h}=size();write(atPoint(w,h,img.naturalWidth,img.naturalHeight,start.state,z,start.point,to));});
   for(const event of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(event,e=>{points.delete(e.pointerId);baseline();if(!points.size)surface.classList.remove('is-dragging');});
   surface.addEventListener('wheel',e=>{if(!ready||busy())return;e.preventDefault();zoom(read().z*Math.exp(-e.deltaY*(e.deltaMode===1?.025:.002)),local(e));},{passive:false});
   surface.addEventListener('keydown',e=>{if(!ready||busy())return;const s=read(),{w,h}=size(),d={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]}[e.key];if(d){e.preventDefault();write(atPoint(w,h,img.naturalWidth,img.naturalHeight,s,s.z,{x:w/2,y:h/2},{x:w/2+d[0],y:h/2+d[1]}));}else if(['+','=','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home')write({x:50,y:50,z:100});else zoom(s.z+(e.key==='-'?-10:10));}});
   form.querySelector(`[data-image-pick="${kind}"]`).onclick=()=>{if(!busy())form.elements[field].click();};
   form.querySelector(`[data-image-minus="${kind}"]`).onclick=()=>zoom(read().z-10);
   form.querySelector(`[data-image-plus="${kind}"]`).onclick=()=>zoom(read().z+10);
   form.querySelector(`[data-image-reset="${kind}"]`).onclick=()=>{if(!busy())write({x:50,y:50,z:100});};
   form.querySelector(`[data-image-remove="${kind}"]`).onclick=()=>{if(!busy())remove?.(kind);};
   img.onload=()=>{ready=img.naturalWidth>0;paint();};img.onerror=()=>{ready=false;paint();};
   const observer=new ResizeObserver(paint);observer.observe(surface);
   controllers[kind]={setSource(value){if(source===value)return;source=value;ready=false;points.clear();baseline();if(value)img.src=value;else img.removeAttribute('src');paint();},reset(){write({x:50,y:50,z:100});},dispose(){observer.disconnect();points.clear();}};
   paint();
  }
  return {setSources(cover,avatar){controllers.cover.setSource(cover);controllers.avatar.setSource(avatar);},reset(kind){controllers[kind].reset();},dispose(){disposed=true;Object.values(controllers).forEach(c=>c.dispose());}};
 }
 function cover(art,url,x,y,z){
  art.style.backgroundImage=`url(${JSON.stringify(url)})`;art.style.backgroundPosition=`${x}% ${y}%`;art.style.transform='none';art.parentElement.style.containerType='size';
  const image=new Image();image.onload=()=>{if(art.isConnected)art.style.setProperty('background-size',`max(${z}cqw, ${z*image.naturalWidth/image.naturalHeight}cqh) auto`,'important');};image.src=url;
 }
 window.BatProfileImages={markup,mount,frame,atPoint,cover};
})();

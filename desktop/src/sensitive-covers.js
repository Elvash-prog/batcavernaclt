'use strict';
// Consent belongs to this image instance, never to a shared URL or another account.
window.BatSensitive={
 attrs:item=>`data-sensitive="${item?.capa_adulta===true||item?.adult===true?'1':'0'}"`,
 mount(image,sensitive){
  const flag=sensitive===undefined?image.dataset.sensitive==='1':!!sensitive;
  if(sensitive!==undefined)delete image.dataset.sensitiveRevealed;
  if(image.dataset.sensitive!==(flag?'1':'0'))image.dataset.sensitive=flag?'1':'0';
  if(!flag){image._sensitiveResize?.disconnect();image._sensitiveGuard?.remove();delete image._sensitiveGuard;delete image.dataset.sensitiveRevealed;return;}
  if(image._sensitiveGuard&&sensitive===undefined)return;
  if(image._sensitiveGuard){image._sensitiveGuard.remove();image._sensitiveResize?.disconnect();delete image._sensitiveGuard;}
  const parent=image.parentElement;if(!parent)return;
  if(getComputedStyle(parent).position==='static')parent.style.position='relative';
  const guard=document.createElement('span');guard.className='sensitive-cover-guard';guard.setAttribute('role','button');guard.tabIndex=0;
  const paint=()=>{const visible=image.dataset.sensitiveRevealed==='1';guard.textContent=visible?'Ocultar +18':'+18 · Conteúdo adulto\nClique para mostrar';guard.setAttribute('aria-label',visible?'Ocultar capa adulta':'Mostrar capa com conteúdo adulto, maiores de 18 anos');guard.setAttribute('aria-pressed',String(visible));guard.classList.toggle('revealed',visible);};
  const position=()=>{if(!image.isConnected)return;const r=image.getBoundingClientRect(),p=parent.getBoundingClientRect();guard.style.left=(r.left-p.left+parent.scrollLeft)+'px';guard.style.top=(r.top-p.top+parent.scrollTop)+'px';guard.style.width=r.width+'px';guard.style.height=(image.dataset.sensitiveRevealed==='1'?Math.min(r.height,32):r.height)+'px';};
  const toggle=e=>{e.preventDefault();e.stopPropagation();image.dataset.sensitiveRevealed=image.dataset.sensitiveRevealed==='1'?'0':'1';paint();position();};
  guard.addEventListener('click',toggle);guard.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')toggle(e);});
  image._sensitiveGuard=guard;parent.append(guard);paint();position();
  const resize=new ResizeObserver(position);resize.observe(image);resize.observe(parent);
  image._sensitiveResize=resize;
 },
 scan(root=document){for(const image of root.querySelectorAll('img[data-sensitive]'))this.mount(image);}
};
// Observe only inserted/changed classifications. CSS masks marked art before this callback.
new MutationObserver(records=>{for(const record of records){if(record.type==='attributes')window.BatSensitive.mount(record.target);else {for(const node of record.removedNodes)if(node.nodeType===1){node._sensitiveResize?.disconnect();for(const img of node.querySelectorAll?.('img[data-sensitive]')||[])img._sensitiveResize?.disconnect();}for(const node of record.addedNodes)if(node.nodeType===1){if(node.matches?.('img[data-sensitive]'))window.BatSensitive.mount(node);window.BatSensitive.scan(node);}}}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-sensitive']});

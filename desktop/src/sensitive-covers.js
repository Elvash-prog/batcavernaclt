'use strict';
// A local account preference controls explicit sexual content. Age ratings alone do not.
(()=>{
 const subscribers=new Set();
 const owner=()=>typeof state==='undefined'?'':String(state.userId||'');
 const key=()=>`bc-explicit-content:${owner()}`;
 let activeOwner=null;
 function allowed(){try{return !!owner()&&localStorage.getItem(key())==='show';}catch{return false;}}
 function sync(){const show=allowed();activeOwner=owner();const value=show?'show':'hide';if(document.documentElement.dataset.explicitContent!==value)document.documentElement.dataset.explicitContent=value;for(const input of document.querySelectorAll('[data-explicit-filter]'))input.checked=show;return show;}
 function setAllowed(show){if(!owner())return;try{localStorage.setItem(key(),show?'show':'hide');}catch{if(typeof toast==='function')toast('Não foi possível salvar o filtro.');return;}sync();for(const ref of subscribers){const node=ref.deref();if(!node?.isConnected){subscribers.delete(ref);continue;}node._explicitFilterChanged?.();}}
 function controls(root){for(const input of root.querySelectorAll('[data-explicit-filter]')){input.checked=allowed();if(input.dataset.filterReady)continue;input.dataset.filterReady='1';input.addEventListener('change',()=>setAllowed(input.checked));}}
 function settings(){if(typeof state==='undefined'||state.current!=='settings'||state.settingsTab!=='appearance')return;const panel=document.querySelector('#settingsPanel');if(!panel||panel.querySelector('[data-explicit-settings]'))return;const section=document.createElement('section');section.dataset.explicitSettings='1';section.className='explicit-content-settings';section.innerHTML='<h3>Filtro de conteúdo</h3>'+api.controlHTML()+'<p class="muted">Capas de jogos comuns aparecem normalmente, inclusive jogos classificados para 18 anos. Este filtro se aplica a pornografia e hentai sinalizados.</p>';panel.append(section);controls(section);}
 const api=window.BatSensitive={
 allowed, setAllowed,
 marked:item=>item?.capa_adulta===true||item?.adult===true||item?.nsfw===true,
 visible(item){return !this.marked(item)||allowed();},
 attrs:item=>`data-sensitive="${item?.capa_adulta===true||item?.adult===true?'1':'0'}"`,
 controlHTML:()=>'<label class="explicit-content-filter"><input type="checkbox" data-explicit-filter>Mostrar conteúdo adulto</label>',
 register(node,changed){node._explicitFilterChanged=changed;subscribers.add(new WeakRef(node));},
 mount(image,sensitive){
  const flag=sensitive===undefined?image.dataset.sensitive==='1':!!sensitive;
  if(image.dataset.sensitive!==(flag?'1':'0'))image.dataset.sensitive=flag?'1':'0';
  if(!flag){image._sensitiveResize?.disconnect();image._sensitiveGuard?.remove();delete image._sensitiveGuard;return;}
  if(image._sensitiveGuard)return;
  const parent=image.parentElement;if(!parent)return;if(getComputedStyle(parent).position==='static')parent.style.position='relative';
  const label=document.createElement('span');label.className='explicit-cover-placeholder';label.textContent='+18\nExplícito';label.setAttribute('aria-label','Conteúdo sexual explícito oculto pelo filtro');
  const position=()=>{if(!image.isConnected)return;const r=image.getBoundingClientRect(),p=parent.getBoundingClientRect();Object.assign(label.style,{left:(r.left-p.left+parent.scrollLeft)+'px',top:(r.top-p.top+parent.scrollTop)+'px',width:r.width+'px',height:r.height+'px'});};
  image._sensitiveGuard=label;parent.append(label);position();const resize=new ResizeObserver(position);resize.observe(image);resize.observe(parent);image._sensitiveResize=resize;
 },
 scan(root=document){for(const image of root.querySelectorAll('img[data-sensitive]'))this.mount(image);controls(root);}
 };
 sync();
 new MutationObserver(records=>{const changed=activeOwner!==owner();if(changed)sync();for(const record of records){if(record.type==='attributes')api.mount(record.target);else{for(const node of record.removedNodes)if(node.nodeType===1){node._sensitiveResize?.disconnect();for(const img of node.querySelectorAll?.('img[data-sensitive]')||[])img._sensitiveResize?.disconnect();}for(const node of record.addedNodes)if(node.nodeType===1){if(node.matches?.('img[data-sensitive]'))api.mount(node);api.scan(node);}}}settings();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-sensitive']});
})();

// Original BatCaverna feedback: no vendor assets or animation dependencies.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
export function uploadState(form,phase){
 let box=form.querySelector('.save-feedback');
 if(!box){box=document.createElement('div');box.className='save-feedback';box.setAttribute('role','status');box.setAttribute('aria-live','polite');const label=document.createElement('span');label.className='save-feedback-label';box.append(label);const track=document.createElement('div');track.className='save-feedback-track';box.append(track);form.querySelector('.form-error')?.before(box);if(!box.isConnected)form.append(box);}
 box.dataset.phase=phase;box.querySelector('span').textContent=phase==='pending'?'Salvando alterações…':'Alterações não confirmadas. Confira a mensagem abaixo.';
 const track=box.querySelector('.save-feedback-track');track.hidden=phase!=='pending';
 if(phase==='pending'){track.setAttribute('role','progressbar');track.setAttribute('aria-label','Salvando alterações');}else{track.removeAttribute('role');track.removeAttribute('aria-label');}
}
export function favoriteSaved(){const toast=document.querySelector('#toast');if(!toast)return;toast.classList.remove('favorite-confirmed');void toast.offsetWidth;toast.classList.add('favorite-confirmed');}
function install(){
 const nav=document.querySelector('#mainNav');if(!nav)return;
 const mark=document.createElement('span');mark.className='nav-motion-marker';mark.setAttribute('aria-hidden','true');nav.append(mark);
 let scheduled=false;
 const update=()=>{scheduled=false;const active=nav.querySelector('button.active');if(!active){mark.hidden=true;return;}const bounds=nav.getBoundingClientRect(),rect=active.getBoundingClientRect(),scale=bounds.width/nav.offsetWidth||1;mark.hidden=rect.bottom<=bounds.top||rect.top>=bounds.bottom;mark.style.height=rect.height/scale+'px';mark.style.transform=`translateY(${(rect.top-bounds.top)/scale+nav.scrollTop}px)`;};
 const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update)}};
 new MutationObserver(schedule).observe(nav,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
 const resize=new ResizeObserver(schedule);resize.observe(nav);resize.observe(document.querySelector('.sidebar'));
 nav.addEventListener('scroll',schedule,{passive:true});reduced.addEventListener('change',schedule);schedule();
}
window.BatMotion={uploadState,favoriteSaved};
window.addEventListener('batcaverna:legacy-ready',install,{once:true});

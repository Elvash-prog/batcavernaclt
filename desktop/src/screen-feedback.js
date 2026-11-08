// Shared read states. Retry callbacks only repeat the read that opened the screen.
export function message({kind='empty',title,description='',actionLabel='',onAction}){
 const card=document.createElement('section');card.className='screen-state screen-state-'+kind;card.setAttribute('role','status');
 const icon=document.createElement('span');icon.className='screen-state-icon';icon.setAttribute('aria-hidden','true');icon.textContent=kind==='error'?'↻':'＋';
 const heading=document.createElement('h3');heading.textContent=title;
 const text=document.createElement('p');text.textContent=description;card.append(icon,heading,text);
 if(actionLabel&&onAction){const button=document.createElement('button');button.type='button';button.className=kind==='error'?'secondary':'primary';button.textContent=actionLabel;button.onclick=onAction;card.append(button);}
 return card;
}
export function loading({library=false,poster=true,refresh=false,list=false}={}){
 const root=document.createElement('section');root.className='screen-loading'+(library?' library-loading':'');root.classList.toggle('screen-loading-list',list);root.dataset.format=poster?'poster':'landscape';root.setAttribute('role','status');
 const label=document.createElement('p');label.className='screen-loading-label';label.textContent=library?'Carregando sua coleção…':refresh?'Atualizando…':'Preparando sua BatCaverna…';root.append(label);
 const grid=document.createElement('div');grid.className='screen-skeleton-grid';grid.setAttribute('aria-hidden','true');grid.setAttribute('aria-busy','true');
 for(let i=0;i<(library?6:3);i++){const card=document.createElement('div');card.className='screen-skeleton-card';for(const name of ['art','title','meta']){const block=document.createElement('span');block.className='screen-skeleton-'+name;card.append(block);}grid.append(card);}root.append(grid);return root;
}
window.BatFeedback={message,loading};

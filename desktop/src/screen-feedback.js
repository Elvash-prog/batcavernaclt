// Shared read states. Retry callbacks only repeat the read that opened the screen.
export function message({kind='empty',title,description='',actionLabel='',onAction}){
 const card=document.createElement('section');card.className='screen-state screen-state-'+kind;card.setAttribute('role','status');
 const icon=document.createElement('span');icon.className='screen-state-icon';icon.setAttribute('aria-hidden','true');icon.textContent=kind==='error'?'↻':'＋';
 const heading=document.createElement('h3');heading.textContent=title;
 const text=document.createElement('p');text.textContent=description;card.append(icon,heading,text);
 if(actionLabel&&onAction){const button=document.createElement('button');button.type='button';button.className=kind==='error'?'secondary':'primary';button.textContent=actionLabel;button.onclick=onAction;card.append(button);}
 return card;
}
export function loading({library=false,refresh=false,title=''}={}){
 const root=document.createElement('section');root.className='screen-loading'+(library?' library-loading':'');root.setAttribute('role','status');
 const mark=document.createElement('span');mark.className='screen-loading-mark';mark.setAttribute('aria-hidden','true');
 const label=document.createElement('span');label.className='screen-loading-label';label.textContent=title||(library?'Abrindo sua coleção…':refresh?'Atualizando…':'Preparando sua BatCaverna…');
 root.append(mark,label);return root;
}
window.BatFeedback={message,loading};

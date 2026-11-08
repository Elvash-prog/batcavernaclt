// Original dashboard composition, using the account's existing data and actions.
const paths=[
 'M4 5h6v6H4z M14 5h6v6h-6z M4 15h6v6H4z M14 15h6v6h-6z',
 'M7 4h10v6a5 5 0 0 1-10 0z M7 6H3v3a4 4 0 0 0 4 4 M17 6h4v3a4 4 0 0 1-4 4 M12 15v6 M8 21h8',
 'M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
 'M5 18V12 M12 18V6 M19 18V9 M3 21h18'
];
export function decorate(root,{add}){
 if(root.querySelector(':scope>.studio-welcome'))return;root.classList.add('dashboard-studio');
 const hero=root.querySelector('.dashboard-columns');if(!hero)return;
 const welcome=document.createElement('header');welcome.className='studio-welcome';const copy=document.createElement('div');
 const eyebrow=document.createElement('small');eyebrow.className='studio-eyebrow';eyebrow.textContent='SEU UNIVERSO, NO SEU RITMO';copy.append(eyebrow);
 for(const selector of [':scope>.hero-greeting',':scope>.dashboard-intro']){const node=root.querySelector(selector);if(node)copy.append(node);}welcome.append(copy);
 const action=document.createElement('button');action.type='button';action.className='primary studio-add';action.textContent='＋ Adicionar título';action.onclick=add;welcome.append(action);hero.before(welcome);
 const summary=root.querySelector('.home-summary');if(summary){summary.classList.add('studio-metrics');summary.setAttribute('aria-label','Resumo da sua coleção');hero.after(summary);
  [...summary.children].forEach((card,index)=>{card.dataset.metric=String(index);const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');icon.setAttribute('fill','none');icon.setAttribute('stroke','currentColor');icon.setAttribute('stroke-width','1.7');icon.setAttribute('stroke-linecap','round');icon.setAttribute('stroke-linejoin','round');const path=document.createElementNS(icon.namespaceURI,'path');path.setAttribute('d',paths[index%paths.length]);icon.append(path);const badge=document.createElement('span');badge.className='studio-metric-icon';badge.append(icon);const text=document.createElement('div');text.className='studio-metric-copy';while(card.firstChild)text.append(card.firstChild);card.append(badge,text);});
 }
 const info=root.querySelector('.resume-info');if(info){const actions=document.createElement('div');actions.className='studio-hero-actions';for(const node of info.querySelectorAll(':scope>button'))actions.append(node);info.append(actions);}
 const nav=document.querySelector('#mainNav .shell-nav-main');if(nav&&!document.querySelector('.sidebar-section-label')){const label=document.createElement('small');label.className='sidebar-section-label';label.setAttribute('aria-hidden','true');label.textContent='SUA CAVERNA';nav.before(label);}
}
window.BatDashboard={decorate};

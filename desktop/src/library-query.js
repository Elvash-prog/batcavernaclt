// Shared collection semantics: display values stay untouched; normalization is for lookup only.
(() => {
 'use strict';
 const clean=value=>value==null||String(value)==='null'?'':String(value).trim();
 const fold=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');
 const tags=value=>(Array.isArray(value)?value:String(value??'').split(/[•,|]/)).map(clean).filter(Boolean);
 const platforms=row=>tags(row.categoria&&row.categoria!=='jogos'?row.onde:clean(row.plataforma)||row.onde);
 const matches=(name,query)=>{const title=fold(name);return fold(query).split(' ').filter(Boolean).every(word=>title.includes(word));};
 const numeric=value=>{const n=typeof value==='number'?value:Number(clean(value).match(/[-+]?\d+(?:[.,]\d+)?/)?.[0]?.replace(',','.'));return Number.isFinite(n)?n:0;};
 function rating(value){const s=fold(value);if(!s||/sem avaliacao|a considerar/.test(s))return -1;for(const [label,rank] of [['goty',11],['lenda',11],['obra-prima',10],['obra prima',10],['excelente',9],['muito bom',8],['bom',7],['ok',6],['fraco',4],['ruim',2]])if(s.includes(label))return rank;const stars=(s.match(/⭐/g)||[]).length;if(stars)return stars*2+(s.includes('½')?1:0);return /\d/.test(s)?numeric(s)*(/\/\s*5\b/.test(s)?2:1):-1;}
 const choices=(rows,field)=>[...new Map(rows.flatMap(row=>field==='genre'?tags(row.generos):platforms(row)).map(value=>[fold(value),value])).values()].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 function matchesFilters(row,{query='',genre='',platform=''}={}){return matches(row.nome,query)&&(!genre||tags(row.generos).some(g=>fold(g)===fold(genre)))&&(!platform||platforms(row).some(p=>fold(p)===fold(platform)));}
 function compare(a,b,order='recent') {const name=()=>clean(a.nome).localeCompare(clean(b.nome),'pt-BR')||clean(a.id).localeCompare(clean(b.id),'pt-BR');if(order==='name')return name();const n=order==='rating'?rating(b.nota)-rating(a.nota):order==='hours'?Math.max(0,numeric(b.horas))-Math.max(0,numeric(a.horas)):(Date.parse(b.updated_at)||0)-(Date.parse(a.updated_at)||0);return n||name();}
 function capture(root,box){const viewport=root.getBoundingClientRect(),card=[...box.querySelectorAll('[data-detail]')].find(node=>{const rect=node.getBoundingClientRect();return rect.bottom>viewport.top&&rect.top<viewport.bottom;});return {id:card?.dataset.detail,offset:card?card.getBoundingClientRect().top-viewport.top:0,y:root.scrollTop};}
 function restore(root,box,position){const card=[...box.querySelectorAll('[data-detail]')].find(node=>node.dataset.detail===position.id);const scale=root.offsetHeight?root.getBoundingClientRect().height/root.offsetHeight:1;root.scrollTop=card?root.scrollTop+(card.getBoundingClientRect().top-root.getBoundingClientRect().top-position.offset)/(scale||1):position.y;}
 window.BatLibraryQuery={clean,fold,tags,platforms,matches,numeric,rating,choices,matchesFilters,compare,capture,restore};
})();

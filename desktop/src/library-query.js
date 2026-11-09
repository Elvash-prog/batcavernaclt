// Shared collection semantics: display values stay untouched; normalization is for lookup only.
(() => {
 'use strict';
 const clean=value=>value==null||String(value)==='null'?'':String(value).trim();
 const fold=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');
 const tags=value=>(Array.isArray(value)?value:String(value??'').split(/[•,|]/)).map(clean).filter(Boolean);
 const platforms=row=>tags(row.categoria&&row.categoria!=='jogos'?row.onde:clean(row.plataforma)||row.onde);
 const collator=new Intl.Collator('pt-BR'),searchRows=new WeakMap();
 const stamp=value=>Array.isArray(value)?JSON.stringify(value):value;
 function indexed(row){const source=[row.nome,stamp(row.generos),stamp(row.plataforma),stamp(row.onde),row.categoria],previous=searchRows.get(row);if(previous&&source.every((value,index)=>value===previous.source[index]))return previous;const result={source,name:fold(row.nome),genres:tags(row.generos).map(fold),platforms:platforms(row).map(fold)};searchRows.set(row,result);return result;}
 function predicate({query='',genre='',platform=''}={}){const words=fold(query).split(' ').filter(Boolean),g=fold(genre),p=fold(platform);if(!words.length&&!g&&!p)return ()=>true;return row=>{const data=indexed(row);return words.every(word=>data.name.includes(word))&&(!g||data.genres.includes(g))&&(!p||data.platforms.includes(p));};}
 const matches=(name,query)=>{const title=fold(name);return fold(query).split(' ').filter(Boolean).every(word=>title.includes(word));};
 const numeric=value=>{const n=typeof value==='number'?value:Number(clean(value).match(/[-+]?\d+(?:[.,]\d+)?/)?.[0]?.replace(',','.'));return Number.isFinite(n)?n:0;};
 function rating(value){const s=fold(value);if(!s||/sem avaliacao|a considerar/.test(s))return -1;for(const [label,rank] of [['goty',11],['lenda',11],['obra-prima',10],['obra prima',10],['excelente',9],['muito bom',8],['bom',7],['ok',6],['fraco',4],['ruim',2]])if(s.includes(label))return rank;const stars=(s.match(/⭐/g)||[]).length;if(stars)return stars*2+(s.includes('½')?1:0);return /\d/.test(s)?numeric(s)*(/\/\s*5\b/.test(s)?2:1):-1;}
 const choices=(rows,field)=>[...new Map(rows.flatMap(row=>field==='genre'?tags(row.generos):platforms(row)).map(value=>[fold(value),value])).values()].sort(collator.compare);
 function matchesFilters(row,options={}){return predicate(options)(row);}
 function comparator(order='recent'){const values=new WeakMap();const data=row=>{let hit=values.get(row);if(!hit){hit={name:clean(row.nome),id:clean(row.id),value:order==='rating'?rating(row.nota):order==='hours'?Math.max(0,numeric(row.horas)):order==='name'?0:Date.parse(row.updated_at)||0};values.set(row,hit);}return hit;};return (a,b)=>{const x=data(a),y=data(b);return y.value-x.value||collator.compare(x.name,y.name)||collator.compare(x.id,y.id);};}
 function compare(a,b,order='recent'){const value=row=>order==='rating'?rating(row.nota):order==='hours'?Math.max(0,numeric(row.horas)):order==='name'?0:Date.parse(row.updated_at)||0;return value(b)-value(a)||collator.compare(clean(a.nome),clean(b.nome))||collator.compare(clean(a.id),clean(b.id));}
 function capture(root,box){const viewport=root.getBoundingClientRect(),card=[...box.querySelectorAll('[data-detail]')].find(node=>{const rect=node.getBoundingClientRect();return rect.bottom>viewport.top&&rect.top<viewport.bottom;});return {id:card?.dataset.detail,offset:card?card.getBoundingClientRect().top-viewport.top:0,y:root.scrollTop};}
 function restore(root,box,position){const card=[...box.querySelectorAll('[data-detail]')].find(node=>node.dataset.detail===position.id);const scale=root.offsetHeight?root.getBoundingClientRect().height/root.offsetHeight:1;root.scrollTop=card?root.scrollTop+(card.getBoundingClientRect().top-root.getBoundingClientRect().top-position.offset)/(scale||1):position.y;}
 window.BatLibraryQuery={clean,fold,tags,platforms,matches,numeric,rating,choices,matchesFilters,predicate,compare,comparator,capture,restore};
})();

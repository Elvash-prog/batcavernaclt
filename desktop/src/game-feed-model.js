(function(root){
 const clean=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 function action(event){const kind=event.meta?.acao;if(kind==='started')return 'Começou a jogar';if(kind==='recommend')return 'Recomenda';if(kind==='finished')return 'Zerou';const status=clean(event.status);if(/platina|100%/.test(status))return 'Platinou';if(/zerado|finaliz|conclu/.test(status))return 'Zerou';if(/progresso|jogando/.test(status))return 'Começou a jogar';if(/paus/.test(status))return 'Pausou';return kind==='adicionou'?'Adicionou à biblioteca':'Atualizou na biblioteca';}
 function title(value){const result={categoria:'jogos'};for(const key of ['nome','capa','capa_adulta','ano','generos','plataforma','steam_appid'])if(value?.[key]!=null)result[key]=value[key];return result;}
 const model={action,title,cursor:row=>({before_id:String(row.id),before_time:row.created_at}),manual:row=>['started','recommend','finished'].includes(row.meta?.acao)};
 root.BatGameFeed=model;
})(typeof window==='undefined'?globalThis:window);

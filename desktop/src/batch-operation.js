(() => {
 'use strict';
 function create({items, perform, allowed=()=>true, changed=()=>{}, errorText=String, concurrency=1}) {
  const entries=items.map(item=>({item,status:'pending',error:''}));
  let busy=false,stopping=false,flight=null;
  const snapshot=()=>({total:entries.length,busy,stopping,blocked:!allowed(),
   success:entries.filter(e=>e.status==='success').length,
   failed:entries.filter(e=>e.status==='failed').length,
   pending:entries.filter(e=>e.status==='pending').length,
   running:entries.filter(e=>e.status==='running').map(e=>e.item),
   errors:entries.filter(e=>e.status==='failed').map(e=>({item:e.item,message:e.error}))});
  const emit=()=>changed(snapshot());
  function run(mode='pending') {
   if(busy)return flight;
   if(!allowed()){emit();return Promise.resolve(snapshot());}
   const todo=entries.filter(e=>e.status===(mode==='failed'?'failed':'pending'));
   busy=true;stopping=false;
   for(const entry of todo){entry.status='pending';entry.error='';}
   let cursor=0;
   const worker=async()=>{
    while(cursor<todo.length&&!stopping&&allowed()){
     const entry=todo[cursor++];entry.status='running';emit();
     try{await perform(entry.item);entry.status='success';}
     catch(error){entry.status='failed';entry.error=errorText(error);}
     emit();
    }
   };
   // Defer work until flight is assigned, including for reentrant callers.
   flight=Promise.resolve().then(async()=>{
    emit();await Promise.all(Array.from({length:Math.min(4,Math.max(1,Math.floor(concurrency)||1),todo.length)},worker));
   }).finally(()=>{busy=false;emit();}).then(snapshot);
   return flight;
  }
  return {run,snapshot,stop(){if(busy){stopping=true;emit();}}};
 }

 function attach({overlay,items,perform,allowed,finished=()=>{},closed=finished,errorText,concurrency=1,
  progressSelector,errorsSelector,successLabel='concluídos',failureLabel='não atualizados'}) {
  const status=overlay.querySelector(progressSelector),errors=overlay.querySelector(errorsSelector),footer=overlay.querySelector('footer');
  overlay.classList.add('batch-operation-dialog');
  const dialog=overlay.querySelector('.bulk-dialog'),title=dialog.querySelector('h2');
  title.id=progressSelector.slice(1)+'Title';
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby',title.id);dialog.tabIndex=-1;
  const meter=document.createElement('progress');meter.max=items.length;meter.value=0;
  meter.setAttribute('aria-label','Títulos processados');status.before(meter);
  const hint=document.createElement('p');hint.className='batch-operation-hint';status.after(hint);
  footer.innerHTML='<button type="button" class="secondary" data-batch-stop>Parar após os atuais</button><button type="button" class="secondary" data-batch-resume hidden>Continuar pendentes</button><button type="button" class="primary" data-batch-retry hidden>Tentar falhas novamente</button><button type="button" class="secondary" data-finish hidden>Concluir</button>';
  const stop=footer.querySelector('[data-batch-stop]'),resume=footer.querySelector('[data-batch-resume]'),retry=footer.querySelector('[data-batch-retry]'),finish=footer.querySelector('[data-finish]');
  if(concurrency===1)stop.textContent='Parar após o atual';
  const inputs=[...overlay.querySelectorAll('input,select')];inputs.forEach(input=>input.disabled=true);
  overlay.onclick=()=>{};
  const queue=create({items,perform,allowed,errorText,concurrency,changed:s=>{
   if(!overlay.isConnected)return;
   overlay.dataset.busy=s.busy?'1':'0';meter.value=s.success+s.failed;
   status.textContent=s.blocked?'A conta mudou. Esta operação foi interrompida.':`${s.success} ${successLabel} · ${s.failed} ${failureLabel}${s.pending?' · '+s.pending+' pendentes':''}`;
   hint.textContent=s.blocked?'A sessão mudou.':s.busy?(s.stopping?'Aguardando os títulos em andamento terminarem…':'Em andamento: '+s.running.map(item=>item.nome).join(', ')):s.pending?'Há títulos pendentes.':s.failed?'Há títulos com falha.':'Todos os títulos foram processados.';
   errors.replaceChildren();if(!s.blocked){for(const error of s.errors.slice(0,50)){const li=document.createElement('li');li.textContent=`${error.item.nome}: ${error.message}`;errors.append(li);}if(s.errors.length>50){const li=document.createElement('li');li.textContent=`Mais ${s.errors.length-50} títulos com falha.`;errors.append(li);}}
   stop.hidden=!s.busy;stop.disabled=s.stopping||s.blocked;
   resume.hidden=s.busy||s.blocked||!s.pending;retry.hidden=s.busy||s.blocked||!s.failed;
   finish.hidden=s.busy;finish.textContent=s.pending?'Fechar':'Concluir';
   if(!s.busy){finished(s);(s.blocked?finish:s.failed?retry:s.pending?resume:finish).focus();}
   else if(s.stopping||s.blocked)dialog.focus();
   else if([resume,retry].includes(document.activeElement))stop.focus();
  }});
  stop.onclick=()=>queue.stop();
  resume.onclick=()=>queue.run();retry.onclick=()=>queue.run('failed');
  const close=()=>{overlay.remove();closed(queue.snapshot());};
  finish.onclick=close;
  overlay.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(!queue.snapshot().busy)close();}
   if(event.key==='Tab'){
    const buttons=[...footer.querySelectorAll('button')].filter(b=>!b.hidden&&!b.disabled);
    if(!buttons.length){event.preventDefault();dialog.focus();}
    else if(event.shiftKey&&(document.activeElement===buttons[0]||document.activeElement===dialog)){event.preventDefault();buttons.at(-1).focus();}
    else if(!event.shiftKey&&document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0].focus();}
   }
  },true);
  queue.run();stop.focus();return queue;
 }
 window.BatBatchOperation={create,attach};
})();

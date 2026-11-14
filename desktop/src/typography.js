'use strict';
(()=>{
 const choices=[['system','Sistema',''],['modern','Moderna','Arial, Helvetica, sans-serif'],['classic','Clássica','Georgia, "Times New Roman", serif'],['compact','Compacta','"Arial Narrow", "Liberation Sans Narrow", Arial, sans-serif'],['mono','Monoespaçada','Consolas, "Liberation Mono", monospace']];
 const normalize=value=>choices.some(row=>row[0]===value)?value:'system';
 const owner=()=>String(state.userId||'');
 const key=()=>`bc-interface-font:${owner()}`;
 function read(){try{return owner()?normalize(localStorage.getItem(key())):'system';}catch{return 'system';}}
 function apply(value=read()){
  const selected=choices.find(row=>row[0]===normalize(value)),root=document.documentElement;
  root.dataset.interfaceFont=selected[0];
  if(selected[2])root.style.setProperty('--interface-font',selected[2]);else root.style.removeProperty('--interface-font');
  for(const input of document.querySelectorAll('select[data-interface-font]'))input.value=selected[0];
 }
 function controls(){
  if(state.current!=='settings'||state.settingsTab!=='appearance')return;
  const panel=document.querySelector('#settingsPanel');if(!panel||panel.querySelector('[data-font-settings]'))return;
  const account=owner(),section=document.createElement('section');section.dataset.fontSettings='1';section.dataset.settingSection='typography';section.className='font-settings';
  section.innerHTML='<h2>Fonte</h2><label>Fonte da interface<select data-interface-font aria-label="Fonte da interface"></select></label><p class="font-preview">BatCaverna · Jogos, pessoas e histórias</p>';
  const select=section.querySelector('select');for(const [value,label] of choices)select.add(new Option(label,value));select.value=read();
  select.onchange=()=>{if(account!==owner()||!section.isConnected)return;try{localStorage.setItem(key(),normalize(select.value));apply();}catch{select.value=read();toast('Não foi possível salvar a fonte.');}};
  panel.append(section);
 }
 const app=showApp;showApp=async function(...args){const result=await app(...args);apply();return result;};
 const login=showLogin;showLogin=function(...args){apply('system');return login(...args);};
 const settings=renderSettings;renderSettings=async function(...args){const account=owner(),result=await settings(...args);if(account===owner())controls();return result;};
 window.BatTypography={normalize,read,apply,choices};
 apply();
})();

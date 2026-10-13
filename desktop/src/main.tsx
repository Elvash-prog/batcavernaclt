import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import AppShell from './AppShell';
import './styles.css';import './visibility.css';import './phase03.css';import './redesign.css';import './reference.css';import './refinement.css';import './polish.css';import './catalog-library.css';import './journey.css';import './alignment.css';import './desktop-fixes.css';import './react-motion.css';
import app from './app.js?url';import reference from './reference.js?url';import refinement from './refinement.js?url';import polish from './polish.js?url';import redesign from './redesign.js?url';import journey from './journey.js?url';import alignment from './alignment.js?url';import fixes from './desktop-fixes.js?url';

function applyBootTheme(){document.documentElement.classList.add('booting');try{const t=JSON.parse(localStorage.getItem('bc-desktop-theme-v2')||'{}'),r=document.documentElement;for(const k of ['bg','panel','accent','text'])if(/^#[0-9a-f]{6}$/i.test(t[k]||''))r.style.setProperty('--'+k,t[k]);r.style.setProperty('--workspace-width',`${Math.max(1050,Math.min(2600,Number(t.width)||1480))}px`);r.style.setProperty('--reference-card-width',`${Math.max(180,Math.min(500,Number(t.cardWidth)||300))}px`);r.style.setProperty('--ui-scale',String(Math.max(.8,Math.min(1.4,(Number(t.scale)||100)/100))));}catch{}}
type BootModule={name:string;src:string};
type BootFailure={stage:string;message:string};

const modules:BootModule[]=[
 {name:'Núcleo do aplicativo',src:app},{name:'Interface da biblioteca',src:reference},
 {name:'Ajustes de navegação',src:refinement},{name:'Acabamento visual',src:polish},
 {name:'Comunidade e conversas',src:redesign},{name:'Jornada e indicações',src:journey},
 {name:'Alinhamento da interface',src:alignment},{name:'Correções do desktop',src:fixes}
];

function load(module:BootModule){return new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src=module.src;script.dataset.bootModule=module.name;script.onload=()=>resolve();script.onerror=()=>reject(new Error(`O arquivo de ${module.name.toLowerCase()} não pôde ser carregado.`));document.body.append(script)})}
function diagnostic(failure:BootFailure){return [`BatCaverna CLT ${__APP_VERSION__}`,`Etapa: ${failure.stage}`,`Erro: ${failure.message}`,`Plataforma: ${navigator.platform||'Windows'}`,`Horário: ${new Date().toISOString()}`].join('\n')}
async function copyText(value:string){try{await navigator.clipboard.writeText(value);return true}catch{const area=document.createElement('textarea');area.value=value;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();const copied=document.execCommand('copy');area.remove();return copied}}
function FatalError({failure}:{failure:BootFailure}){const [copied,setCopied]=useState(false),details=diagnostic(failure);return <main className="fatal-error"><div className="fatal-error-panel"><img src="brand.jpg" alt=""/><span className="eyebrow">FALHA NA INICIALIZAÇÃO</span><h1>Não foi possível iniciar a BatCaverna.</h1><p>O aplicativo parou em <strong>{failure.stage}</strong>. Tente abrir novamente; se continuar, envie o diagnóstico abaixo junto com uma captura da tela.</p><pre>{details}</pre><div className="fatal-error-actions"><button className="primary" onClick={()=>location.reload()}>Tentar novamente</button><button onClick={async()=>{setCopied(await copyText(details));}}>{copied?'Diagnóstico copiado':'Copiar diagnóstico'}</button></div></div></main>}

const root=createRoot(document.getElementById('root')!);
async function start(){let stage='Preparação da interface';try{applyBootTheme();flushSync(()=>root.render(<AppShell/>));for(const module of modules){stage=module.name;await load(module)}stage='Ativação da sessão';document.documentElement.dataset.reactShell='ready';window.dispatchEvent(new Event('batcaverna:legacy-ready'))}catch(error){const failure={stage,message:error instanceof Error?error.message:String(error||'Falha desconhecida.')};console.error('Falha na inicialização',failure,error);document.documentElement.classList.remove('booting');root.render(<FatalError failure={failure}/>);}}
void start();

import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import AppShell from './AppShell';
import './styles.css';import './visibility.css';import './phase03.css';import './redesign.css';import './reference.css';import './refinement.css';import './polish.css';import './catalog-library.css';import './journey.css';import './alignment.css';import './desktop-fixes.css';import './react-motion.css';import './professional.css';import './cavern-home.css';import './cavern-library.css';import './cavern-profile.css';import './cavern-social.css';import './cavern-community.css';import './cavern-shell.css';import './continuity.css';import './profile-editor.css';
import pcPreferences from './pc-preferences.js?url';
import coverPicker from './cover-picker.js?url';
import libraryQuery from './library-query.js?url';
import libraryNavigation from './library-navigation.js?url';
import './library-query.css';
import './title-details.css';
import friendPresence from './friend-presence.js?url';
import chatPresentation from './chat-presentation.js?url';
import chatDelivery from './chat-delivery.js?url';
import './chat-delivery.css';
import chatImages from './chat-images.js?url';
import './chat-images.css';
import './chat-studio.css';
import './sidebar-layout.css';
import './motion-feedback.css';
import './library-cards.css';
import './screen-feedback.css';
import './screen-feedback.js';
import './dashboard-studio.css';
import './dashboard-studio.js';
import './statistics-view.css';
import './statistics-view.js';
import './settings-studio.css';
import './settings-studio.js';
import './motion-feedback.js';
import profileImages from './profile-images.js?url';
import profileHighlights from './profile-highlights.js?url';
import homeHighlight from './home-highlight.js?url';
import layoutSync from './layout-sync.js?url';import app from './app.js?url';import reference from './reference.js?url';import refinement from './refinement.js?url';import polish from './polish.js?url';import redesign from './redesign.js?url';import journey from './journey.js?url';import alignment from './alignment.js?url';import fixes from './desktop-fixes.js?url';import retro from './retro.js?url';import shell from './cavern-shell.js?url';import continuity from './continuity.js?url';

function applyBootTheme(){document.documentElement.classList.add('booting');try{document.documentElement.classList.toggle('sidebar-compact',localStorage.getItem('bc-sidebar-compact-v1')==='1');const t=JSON.parse(localStorage.getItem('bc-desktop-theme-v2')||'{}'),r=document.documentElement;for(const k of ['bg','panel','accent','text'])if(/^#[0-9a-f]{6}$/i.test(t[k]||''))r.style.setProperty('--'+k,t[k]);r.style.setProperty('--workspace-width',`${Math.max(1050,Math.min(2600,Number(t.width)||1480))}px`);r.style.setProperty('--reference-card-width',`${Math.max(180,Math.min(500,Number(t.cardWidth)||300))}px`);r.style.setProperty('--ui-scale',String(Math.max(.8,Math.min(1.4,(Number(t.scale)||100)/100))));}catch{}}
type BootModule={name:string;src:string};
type BootFailure={stage:string;message:string};
type TauriWindow=Window&{__TAURI__?:{core?:{invoke:(command:string,payload?:unknown)=>Promise<unknown>}}};

function nativeLog(level:string,stage:string,message:string){const invoke=(window as TauriWindow).__TAURI__?.core?.invoke;if(!invoke)return Promise.resolve();return invoke('client_log',{input:{level,stage,message}}).then(()=>undefined).catch(()=>undefined)}

const modules:BootModule[]=[
 {name:'Preferências locais de jogos',src:pcPreferences},
 {name:'Preferências da conta',src:layoutSync},{name:'Destaque do início',src:homeHighlight},{name:'Seletor de capas',src:coverPicker},{name:'Presença dos amigos',src:friendPresence},{name:'Apresentação das conversas',src:chatPresentation},{name:'Envio e leitura das conversas',src:chatDelivery},{name:'Imagens das conversas',src:chatImages},{name:'Busca na biblioteca',src:libraryQuery},{name:'Núcleo do aplicativo',src:app},{name:'Interface da biblioteca',src:reference},
 {name:'Ajustes de navegação',src:refinement},{name:'Acabamento visual',src:polish},
 {name:'Comunidade e conversas',src:redesign},{name:'Jornada e indicações',src:journey},
 {name:'Alinhamento da interface',src:alignment},{name:'Correções do desktop',src:fixes},
 {name:'Integração RetroAchievements',src:retro},{name:'Layout principal',src:shell},{name:'Continuidade e detalhes',src:continuity},{name:'Seleção de destaques',src:profileHighlights},{name:'Editor de imagens',src:profileImages},{name:'Contexto da biblioteca',src:libraryNavigation}
];

function load(module:BootModule){return new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src=module.src;script.dataset.bootModule=module.name;script.onload=()=>resolve();script.onerror=()=>reject(new Error(`O arquivo de ${module.name.toLowerCase()} não pôde ser carregado.`));document.body.append(script)})}
function diagnostic(failure:BootFailure){return [`BatCaverna CLT ${__APP_VERSION__}`,`Etapa: ${failure.stage}`,`Erro: ${failure.message}`,`Plataforma: ${navigator.platform||'Windows'}`,`Horário: ${new Date().toISOString()}`].join('\n')}
async function copyText(value:string){try{await navigator.clipboard.writeText(value);return true}catch{const area=document.createElement('textarea');area.value=value;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();const copied=document.execCommand('copy');area.remove();return copied}}
function FatalError({failure}:{failure:BootFailure}){const [copied,setCopied]=useState(false),details=diagnostic(failure);return <main className="fatal-error"><div className="fatal-error-panel"><img src="brand.jpg" alt=""/><span className="eyebrow">FALHA NA INICIALIZAÇÃO</span><h1>Não foi possível iniciar a BatCaverna.</h1><p>O aplicativo parou em <strong>{failure.stage}</strong>. Tente abrir novamente; se continuar, envie o diagnóstico abaixo junto com uma captura da tela.</p><pre>{details}</pre><div className="fatal-error-actions"><button className="primary" onClick={()=>location.reload()}>Tentar novamente</button><button onClick={async()=>{setCopied(await copyText(details));}}>{copied?'Diagnóstico copiado':'Copiar diagnóstico'}</button></div></div></main>}

const root=createRoot(document.getElementById('root')!);
window.addEventListener('error',event=>{void nativeLog('ERROR','WINDOW_ERROR',`${event.error?.name||'Error'}: ${event.message||event.error?.message||'Erro inesperado'} · ${String(event.filename||'').split('/').pop()}:${event.lineno||0}:${event.colno||0} · ${String(event.error?.stack||'').slice(0,700)}`)});
window.addEventListener('unhandledrejection',event=>{const reason=event.reason,description=reason instanceof Error?`${reason.name}: ${reason.message}`:String(reason||'Falha assíncrona inesperada');void nativeLog('ERROR','UNHANDLED_REJECTION',description.slice(0,500))});
async function start(){let stage='Preparação da interface';try{applyBootTheme();flushSync(()=>root.render(<AppShell/>));for(const module of modules){stage=module.name;await load(module);await nativeLog('INFO','BOOT_MODULE',module.name)}stage='Ativação da sessão';document.documentElement.dataset.reactShell='ready';window.dispatchEvent(new Event('batcaverna:legacy-ready'));await nativeLog('INFO','BOOT_READY','Interface e módulos carregados')}catch(error){const failure={stage,message:error instanceof Error?error.message:String(error||'Falha desconhecida.')};console.error('Falha na inicialização',failure,error);await nativeLog('ERROR','BOOT_FAILURE',`${stage}: ${failure.message}`);document.documentElement.classList.remove('booting');root.render(<FatalError failure={failure}/>);}}
void start();

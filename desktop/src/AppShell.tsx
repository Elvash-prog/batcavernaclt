import {useEffect} from 'react';

const nav=[
 ['home','⌂','Início'],['library','▦','Biblioteca'],['discover','◈','Grátis & Steam'],
 ['social','◉','Social'],['chat','✦','Chat'],['friends','♙','Amigos'],
 ['notifications','●','Notificações'],['profile','◎','Meu perfil'],['settings','⚙','Configurações']
] as const;

function Login(){return <section id="loginScreen" className="login-screen">
 <div className="login-art"><div className="login-glow"/><div className="brand-mark"><img src="brand.jpg" alt=""/><span>BatCaverna</span></div><div className="login-copy"><p>BATCAVERNA DOS CLTs</p><h1>Sua coleção.<br/>Sua comunidade.</h1><span>Jogos, filmes, séries, amigos e conversas em um aplicativo só seu.</span><div className="login-pills"><b>🎮 Jogos</b><b>🎬 Filmes & séries</b><b>🟦 Steam</b><b>🏆 Conquistas</b></div></div></div>
 <div className="auth-panel">
  <form id="loginForm" className="login-panel"><div><span className="eyebrow">BEM-VINDO</span><h2>Entrar</h2><p className="panel-note">Use seu usuário ou e-mail.</p></div><label>Usuário ou e-mail<input name="identifier" autoComplete="username" required/></label><label>Senha<input name="password" type="password" autoComplete="current-password" required/></label><div className="auth-row"><label className="remember"><input name="remember" type="checkbox"/> Manter conectado</label><button type="button" className="link-button" data-auth="recover">Esqueci a senha</button></div><button className="primary" type="submit" data-idle-label="Entrar na BatCaverna">Entrar na BatCaverna</button><p id="loginError" className="error" role="alert"/><div className="auth-switch">Ainda não tem perfil? <button type="button" className="link-button" data-auth="register">Criar perfil</button></div></form>
  <form id="registerForm" className="login-panel" hidden><div><span className="eyebrow">NOVA CONTA</span><h2>Criar perfil</h2><p className="panel-note">Comece sua BatCaverna em poucos passos.</p></div><label>Nome público<input name="name" maxLength={40} required/></label><label>Nome de usuário<input name="username" maxLength={40} pattern="[A-Za-z0-9_.-]+" required/></label><label>E-mail<input name="email" type="email" autoComplete="email" required/></label><label>Senha<input name="password" type="password" minLength={12} autoComplete="new-password" required/></label><button className="primary" type="submit">Criar meu perfil</button><p className="error" role="alert"/><div className="auth-switch"><button type="button" className="link-button" data-email-proof="signup">Já recebi a confirmação</button> Já tem conta? <button type="button" className="link-button" data-auth="login">Entrar</button></div></form>
  <form id="recoverForm" className="login-panel" hidden><div><span className="eyebrow">RECUPERAÇÃO</span><h2>Recuperar senha</h2><p className="panel-note">Receba o e-mail e conclua a recuperação aqui no aplicativo.</p></div><label>E-mail<input name="email" type="email" autoComplete="email" required/></label><button className="primary" type="submit">Enviar e-mail</button><p className="error" role="alert"/><div className="auth-switch"><button type="button" className="link-button" data-email-proof="recovery">Já recebi o e-mail</button><button type="button" className="link-button" data-auth="login">Voltar para entrar</button></div></form>
 </div>
 </section>}

export default function AppShell(){
 useEffect(()=>{
  const content=document.getElementById('content');if(!content)return;
  const observer=new MutationObserver(()=>{content.classList.remove('view-enter');requestAnimationFrame(()=>content.classList.add('view-enter'))});
  observer.observe(content,{childList:true});
  const click=(event:MouseEvent)=>{const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;button.classList.remove('button-pop');requestAnimationFrame(()=>button.classList.add('button-pop'))};
  document.addEventListener('click',click);return()=>{observer.disconnect();document.removeEventListener('click',click)};
 },[]);
 return <><Login/><div id="appShell" className="app-shell" hidden><aside className="sidebar"><div className="logo"><img src="brand.jpg" alt=""/><strong>BatCaverna</strong></div><nav id="mainNav">{nav.map(([view,icon,label])=><button key={view} data-view={view} className={view==='home'?'active':''}><span>{icon}</span>{label}{view==='notifications'&&<b id="navUnread" hidden/>}</button>)}</nav><div className="sidebar-foot"><small>Windows <span id="appVersion"/></small></div></aside><main><header className="topbar"><div><span id="pageEyebrow" className="eyebrow">VISÃO GERAL</span><h1 id="pageTitle">Início</h1></div><div className="account"><img id="accountAvatar" alt=""/><div><strong id="accountName">Minha conta</strong><small id="accountStatus">Online</small></div></div></header><div id="content" className="content" aria-live="polite"/></main></div><div id="toast" className="toast" role="status" hidden/></>;
}

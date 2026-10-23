// Login seguro por nome de usuário para clientes nativos.
import {readLimitedJson,BodyLimitError} from '../_shared/request-security.js';
import {checkLoginRate} from '../_shared/login-rate.js';
import {securityReporter} from '../_shared/security-events.js';
// A chave service_role permanece somente nos segredos da Edge Function.
const SB_URL = Deno.env.get('SUPABASE_URL') || '';
const SB_ANON = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SB_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const reportSecurity=securityReporter();

function reply(data: unknown, status = 200, extra:Record<string,string>={}) {
  try{reportSecurity({p_service:'login-username',p_route:'auth_login',p_status:status,p_elapsed:0});}catch{}
  const payload=status===401?{code:'invalid_credentials',message:'Usuário ou senha inválidos.'}:data;
  return new Response(JSON.stringify(payload), {
    status,
    headers: {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...extra}
  });
}

Deno.serve(async request => {
  if (request.method !== 'POST') return reply({message:'Método não permitido.'},405);
  if (!SB_URL || !SB_ANON || !SB_SERVICE) return reply({message:'Login por usuário indisponível.'},503);
  let body: {username?: unknown,password?: unknown};
  try { body = await readLimitedJson(request,8192); } catch(e) { return reply({message:'Dados inválidos.'},e instanceof BodyLimitError?413:400); }
  if(!body||typeof body!=='object'||Array.isArray(body))return reply({message:'Dados inválidos.'},400);
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!/^[\p{L}\p{N}_.-]{2,60}$/u.test(username) || password.length < 1 || password.length > 256)
    return reply({message:'Usuário ou senha inválidos.'},401);
  try {
    if(!await checkLoginRate(request,username,SB_URL,SB_SERVICE,fetch))return reply({message:'Muitas tentativas. Aguarde um minuto e tente novamente.'},429,{'Retry-After':'60'});
    const lookup = await fetch(`${SB_URL}/rest/v1/rpc/email_login_por_usuario`, {
      method:'POST', redirect:'error', signal:AbortSignal.timeout(6000),
      headers:{apikey:SB_SERVICE,authorization:`Bearer ${SB_SERVICE}`,'content-type':'application/json'},
      body:JSON.stringify({p_usuario:username})
    });
    const email = lookup.ok ? await lookup.json() : null;
    if (typeof email !== 'string' || !email.includes('@')) return reply({message:'Usuário ou senha inválidos.'},401);
    const auth = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
      method:'POST', redirect:'error', signal:AbortSignal.timeout(10000),
      headers:{apikey:SB_ANON,authorization:`Bearer ${SB_ANON}`,'content-type':'application/json'},
      body:JSON.stringify({email,password})
    });
    if (!auth.ok) return reply({message:'Usuário ou senha inválidos.'},401);
    const session = await auth.json();
    return reply(session);
  } catch { return reply({message:'Não foi possível concluir o login.'},503); }
});

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod windows_startup;
mod email_change;
mod game_detection;
mod account_preferences;
mod session_persistence;
mod catalog_disk_cache;
mod steam_local;
mod game_catalog;
mod progress_outbox;

mod native_auth;
mod auth_revocation;
mod api_errors;
mod v06;
mod desktop_runtime;
use serde::{Deserialize, Serialize};
use base64::Engine;
use serde_json::{json, Value};
use std::{collections::HashMap, sync::Mutex, time::{Duration, SystemTime, UNIX_EPOCH}};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_updater::UpdaterExt;

const SUPABASE_URL: &str = "https://luoqlhgfmixvfqbfcdoc.supabase.co";
const SUPABASE_KEY: &str = "sb_publishable_g_dTf0TrTXy_p8PjjHip2Q_ByqI2r_e";
const KEYRING_SERVICE: &str = "BatCavernaCLT";
const KEYRING_ACCOUNT: &str = "desktop-refresh-token";

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct User { id: String, email: String }

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Session { access_token: String, refresh_token: String, expires_at: u64, user: User }

#[derive(Deserialize)]
struct AuthUser { id: String, #[serde(default)] email: String }

#[derive(Deserialize)]
struct AuthReply { access_token: String, refresh_token: String, #[serde(default = "default_expiry")] expires_in: u64, user: AuthUser }

#[derive(Deserialize)]
struct Credentials { identifier: String, password: String, remember: bool }

#[derive(Deserialize)]
struct RegisterInput { name: String, username: String, email: String, password: String }

#[derive(Deserialize)]
struct PasswordInput { current: String, password: String }

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProfileInput { name: String, bio: String, banner: String, status: String, steam_id: String, #[serde(default)] avatar: Option<String>, #[serde(default)] games: Option<Vec<String>>, #[serde(default)] achievements: Option<Vec<u32>>, #[serde(default)] title_level: Option<u32> }

#[derive(Deserialize)]
struct PublishInput { text: String, #[serde(default)] media: Vec<String> }

#[derive(Deserialize)]
struct UploadInput { name: String, mime: String, base64: String }

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LikeInput { post_id: String, liked: bool }

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CommentInput { post_id: String, text: String }

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct MessageInput { friend_id: String, text: String, #[serde(default)] media: Option<String> }

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct InviteInput { user_id: String }

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct InviteReplyInput { invite_id: String, accept: bool }

struct AppState { client: reqwest::Client, session: Mutex<Option<Session>>, auth_gate: tokio::sync::Mutex<()> }

fn default_expiry() -> u64 { 3600 }
fn now() -> u64 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs() }
fn keyring() -> Result<keyring::Entry, String> { keyring::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT).map_err(|_| "O Windows não disponibilizou o armazenamento seguro.".into()) }
fn clear_keyring() { if let Ok(entry) = keyring() { let _ = entry.delete_credential(); } }

fn message(body: &str, status: reqwest::StatusCode) -> String {
    api_errors::message(body,status.as_u16())
}

async fn value(response: reqwest::Response) -> Result<Value, String> {
    let status = response.status();
    let body = response.text().await.map_err(|_| "A resposta do Supabase foi interrompida.".to_string())?;
    if !status.is_success() { return Err(message(&body, status)); }
    if body.trim().is_empty() || body.trim() == "null" { return Ok(Value::Null); }
    serde_json::from_str(&body).map_err(|_| "O Supabase enviou uma resposta inválida.".into())
}

fn auth(client: &reqwest::Client, path: &str) -> reqwest::RequestBuilder {
    client.post(format!("{SUPABASE_URL}{path}")).header("apikey", SUPABASE_KEY).header("content-type", "application/json")
}

async fn resolve_email(client: &reqwest::Client, identifier: &str) -> Result<String, String> {
    let clean = identifier.trim().to_lowercase();
    if clean.contains('@') { return Ok(clean); }
    let result = value(auth(client, "/rest/v1/rpc/email_login_por_usuario").json(&json!({"p_usuario": clean})).send().await.map_err(|_| "Não foi possível conectar ao Supabase.".to_string())?).await?;
    result.as_str().map(|email| email.trim().to_lowercase()).filter(|email| email.contains('@')).ok_or_else(|| "Usuário não encontrado.".into())
}

fn session(reply: AuthReply) -> Result<Session, String> {
    if reply.access_token.is_empty() || reply.refresh_token.is_empty() || reply.user.id.is_empty() { return Err("O Supabase não confirmou a sessão.".into()); }
    Ok(Session { access_token: reply.access_token, refresh_token: reply.refresh_token, expires_at: now() + reply.expires_in, user: User { id: reply.user.id, email: reply.user.email } })
}

async fn password_session(client: &reqwest::Client, email: &str, password: &str) -> Result<Session, String> {
    let response = auth(client, "/auth/v1/token?grant_type=password").json(&json!({"email": email, "password": password})).send().await.map_err(|_| "Não foi possível conectar ao Supabase.".to_string())?;
    let status = response.status();
    let body = response.text().await.map_err(|_| "A resposta do Supabase foi interrompida.".to_string())?;
    if !status.is_success() { return Err(message(&body, status)); }
    session(serde_json::from_str(&body).map_err(|_| "Sessão inválida.".to_string())?)
}

async fn username_session(client: &reqwest::Client, username: &str, password: &str) -> Result<Session, String> {
    let response = auth(client, "/functions/v1/login-username")
        .json(&json!({"username": username.trim().to_lowercase(), "password": password}))
        .send().await.map_err(|_| "Não foi possível conectar ao login por usuário.".to_string())?;
    let status = response.status();
    let body = response.text().await.map_err(|_| "A resposta do login foi interrompida.".to_string())?;
    if !status.is_success() {
        if status == reqwest::StatusCode::NOT_FOUND {
            return Err("O login por usuário ainda não foi ativado no Supabase. Use seu e-mail por enquanto.".into());
        }
        return Err(message(&body, status));
    }
    session(serde_json::from_str(&body).map_err(|_| "Sessão inválida.".to_string())?)
}

async fn refresh_session(client: &reqwest::Client, refresh_token: &str) -> Result<Session, String> {
    let response = auth(client, "/auth/v1/token?grant_type=refresh_token").json(&json!({"refresh_token": refresh_token})).send().await.map_err(|_| "Não foi possível renovar a sessão.".to_string())?;
    let status = response.status();
    let body = response.text().await.map_err(|_| "A renovação da sessão foi interrompida.".to_string())?;
    if !status.is_success() { return Err(if session_persistence::revoked(status.as_u16(),&body){"SESSION_REVOKED".into()}else{message(&body,status)}); }
    session(serde_json::from_str(&body).map_err(|_| "Sessão inválida.".to_string())?)
}

async fn revoke_session(client: &reqwest::Client, token: &str, scope: &str) -> Result<(), String> {
    auth_revocation::revoke(client,SUPABASE_URL,SUPABASE_KEY,token,scope).await
}

async fn current(state: &AppState) -> Result<Session, String> {
    let _auth_guard=state.auth_gate.lock().await;
    let existing = state.session.lock().map_err(|_| "Sessão indisponível.".to_string())?.clone().ok_or_else(|| "Entre novamente para continuar.".to_string())?;
    if existing.expires_at > now() + 60 { return Ok(existing); }
    let updated = refresh_session(&state.client, &existing.refresh_token).await?;
    session_persistence::rotate(&updated.refresh_token)?;
    *state.session.lock().map_err(|_| "Sessão indisponível.".to_string())? = Some(updated.clone());
    Ok(updated)
}

fn rest(client: &reqwest::Client, path: &str, token: &str) -> reqwest::RequestBuilder {
    client.get(format!("{SUPABASE_URL}{path}")).header("apikey", SUPABASE_KEY).bearer_auth(token)
}

async fn get(client: &reqwest::Client, path: &str, token: &str) -> Result<Value, String> {
    let mut last=None;
    for attempt in 0..2 {
        match rest(client,path,token).send().await {
            Ok(response)=>{let status=response.status();if attempt==0&&status.is_server_error(){tokio::time::sleep(Duration::from_millis(500)).await;continue;}return value(response).await;},
            Err(error)=>{last=Some(if error.is_timeout(){"A consulta demorou demais. Tente novamente."}else{"Não foi possível conectar ao Supabase. Verifique sua conexão."});if attempt==0{tokio::time::sleep(Duration::from_millis(400)).await;}}
        }
    }
    Err(last.unwrap_or("Consulta indisponível.").to_string())
}

async fn rpc(client: &reqwest::Client, function: &str, body: Value, token: &str) -> Result<Value, String> {
    value(client.post(format!("{SUPABASE_URL}/rest/v1/rpc/{function}"))
        .header("apikey", SUPABASE_KEY).bearer_auth(token).header("content-type", "application/json")
        .json(&body).send().await.map_err(|_| "Não foi possível consultar o Supabase.".to_string())?).await
}

async fn count(client: &reqwest::Client, path: &str, token: &str) -> Result<u64, String> {
    let separator = if path.contains('?') { '&' } else { '?' };
    let response = client.head(format!("{SUPABASE_URL}{path}{separator}select=id&limit=1")).header("apikey", SUPABASE_KEY).bearer_auth(token).header("prefer", "count=exact").send().await.map_err(|_| "Não foi possível calcular o resumo.".to_string())?;
    if !response.status().is_success() { return Err(format!("Não foi possível calcular o resumo (HTTP {}).", response.status().as_u16())); }
    Ok(response.headers().get("content-range").and_then(|v| v.to_str().ok()).and_then(|v| v.rsplit('/').next()).and_then(|v| v.parse().ok()).unwrap_or(0))
}

#[tauri::command]
async fn app_state(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let _auth_guard=state.auth_gate.lock().await;
    if state.session.lock().map_err(|_| "Sessão indisponível.".to_string())?.is_none() {
        if let Some(saved)=session_persistence::saved()? {
            match refresh_session(&state.client, &saved.token).await {
                Ok(restored) => {
                    session_persistence::restored(&saved,&restored.refresh_token)?;
                    *state.session.lock().map_err(|_| "Sessão indisponível.".to_string())? = Some(restored);
                },
                Err(error) => {
                    // Connectivity, rate limiting and server failures must never erase the credential.
                    if error=="SESSION_REVOKED" {clear_keyring();session_persistence::clear_pending();}
                    else {return Err("Não foi possível restaurar a sessão agora. Sua conexão foi preservada; tente abrir novamente quando houver internet.".into());}
                }
            }
        }
    }
    let owner = state.session.lock().map_err(|_| "Sessão indisponível.".to_string())?.clone();
    Ok(json!({"authenticated": owner.is_some(), "user": owner.map(|s| s.user), "version": env!("CARGO_PKG_VERSION")}))
}

#[tauri::command]
async fn check_for_updates(app: AppHandle) -> Result<Value, String> {
    let updater = app.updater().map_err(|error| format!("Não foi possível preparar a verificação de atualizações: {error}"))?;
    match updater.check().await.map_err(|error| format!("Não foi possível verificar atualizações: {error}"))? {
        Some(update) => Ok(json!({"available":true,"version":update.version,"notes":update.body,"date":update.date.map(|date|date.to_string())})),
        None => Ok(json!({"available":false})),
    }
}

#[tauri::command]
async fn install_update(version: String, app: AppHandle, state: tauri::State<'_,AppState>) -> Result<Value, String> {
    if version.trim().is_empty() || version.len() > 64 {
        return Err("Versão de atualização inválida.".into());
    }
    let updater = app.updater().map_err(|error| format!("Não foi possível preparar a atualização: {error}"))?;
    let update = updater.check().await.map_err(|error| format!("Não foi possível confirmar a atualização: {error}"))?
        .filter(|update| update.version == version)
        .ok_or_else(|| "A atualização mudou ou não está mais disponível. Verifique novamente.".to_string())?;
    let active=current(&state).await?;
    {let _auth_guard=state.auth_gate.lock().await;let latest=state.session.lock().map_err(|_|"Sessão indisponível.")?.clone().ok_or("Entre novamente antes de atualizar.")?;
     if latest.user.id!=active.user.id{return Err("Sua conta mudou. Tente atualizar novamente.".into());}
     session_persistence::prepare_update(&latest.refresh_token)?;
    }
    if let Err(error)=update.download_and_install(|_, _| {}, || {}).await{session_persistence::clear_pending();return Err(format!("Não foi possível baixar ou instalar a atualização: {error}"));}
    Ok(json!({"installed":true}))
}

#[tauri::command]
async fn login(credentials: Credentials, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let _auth_guard=state.auth_gate.lock().await;
    session_persistence::clear_pending();
    if credentials.password.is_empty() || credentials.password.len() > 256 { return Err("Informe sua senha.".into()); }
    let identifier = credentials.identifier.trim().to_lowercase();
    if identifier.is_empty() { return Err("Informe seu usuário ou e-mail.".into()); }
    let logged = if identifier.contains('@') {
        password_session(&state.client, &identifier, &credentials.password).await?
    } else {
        username_session(&state.client, &identifier, &credentials.password).await?
    };
    if credentials.remember { keyring()?.set_password(&logged.refresh_token).map_err(|_| "Não foi possível proteger a sessão neste computador.".to_string())?; } else { clear_keyring(); }
    let user = logged.user.clone();
    *state.session.lock().map_err(|_| "Sessão indisponível.".to_string())? = Some(logged);
    Ok(json!({"authenticated": true, "user": user}))
}

#[tauri::command]
async fn register(input: RegisterInput, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let name=input.name.trim(); let username=input.username.trim().to_lowercase(); let email=input.email.trim().to_lowercase();
    if name.is_empty() || name.chars().count()>40 { return Err("Informe um nome público de até 40 caracteres.".into()); }
    if username.is_empty() || username.len()>40 || !username.bytes().all(|b| b.is_ascii_alphanumeric() || matches!(b,b'_'|b'.'|b'-')) { return Err("Use apenas letras, números, ponto, traço ou sublinhado no usuário.".into()); }
    if !email.contains('@') || email.len()>254 { return Err("Informe um e-mail válido.".into()); }
    if input.password.len()<12 || input.password.len()>256 { return Err("A senha precisa ter pelo menos 12 caracteres.".into()); }
    let response=auth(&state.client,"/auth/v1/signup").json(&json!({"email":email,"password":input.password,"data":{"nome":name,"slug":username,"username":username}})).send().await.map_err(|_|"Não foi possível criar a conta.".to_string())?;
    let status=response.status(); let body=response.text().await.map_err(|_|"A resposta foi interrompida.".to_string())?;
    if !status.is_success(){return Err(message(&body,status));}
    let created: Value=serde_json::from_str(&body).map_err(|_|"O serviço enviou uma resposta inválida ao cadastro.".to_string())?;
    let confirmation_required=created["access_token"].as_str().map(|v|v.is_empty()).unwrap_or(true);
    Ok(json!({"confirmationRequired":confirmation_required,"message":if confirmation_required{"Conta criada. Confira seu e-mail para confirmar o cadastro."}else{"Conta criada. Você já pode entrar."}}))
}

#[tauri::command]
async fn recover_password(email: String, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let clean=email.trim().to_lowercase(); if !clean.contains('@') || clean.len()>254{return Err("Informe um e-mail válido.".into());}
    let response=auth(&state.client,"/auth/v1/recover").json(&json!({"email":clean})).send().await.map_err(|_|"Não foi possível solicitar a recuperação.".to_string())?;
    if !response.status().is_success(){let status=response.status();let body=response.text().await.unwrap_or_default();return Err(message(&body,status));}
    Ok(json!({"sent":true}))
}

#[tauri::command]
async fn change_password(input: PasswordInput, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    if input.password.len()<12 || input.password.len()>256{return Err("A nova senha precisa ter pelo menos 12 caracteres.".into());}
    let session=current(&state).await?;
    let _auth_guard=state.auth_gate.lock().await;
    let result=value(state.client.put(format!("{SUPABASE_URL}/auth/v1/user")).header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type","application/json").json(&json!({"password":input.password,"current_password":input.current})).send().await.map_err(|_|"Não foi possível alterar a senha.".to_string())?).await?;
    revoke_session(&state.client,&session.access_token,"others").await.map_err(|_|"A senha foi alterada, mas não foi possível confirmar a saída dos outros dispositivos. Tente novamente usando a nova senha.".to_string())?;
    Ok(result)
}

#[derive(Deserialize)]
struct EmailInput { current: String, email: String }
#[tauri::command]
async fn change_email(input:EmailInput,state:tauri::State<'_,AppState>)->Result<Value,String>{
 let email=input.email.trim().to_lowercase();
 if email.len()>254||email.chars().any(char::is_whitespace)||!email.split_once('@').is_some_and(|(a,b)|!a.is_empty()&&b.contains('.')&&!b.starts_with('.')&&!b.ends_with('.')){return Err("Informe um e-mail válido.".into());}
 let session=current(&state).await?;
 let fresh=password_session(&state.client,&session.user.email,&input.current).await.map_err(|_|"A senha atual está incorreta.".to_string())?;
 if fresh.user.id!=session.user.id{return Err("Sua sessão mudou.".into());}
 let result=value(state.client.put(format!("{SUPABASE_URL}/auth/v1/user")).header("apikey",SUPABASE_KEY).bearer_auth(&fresh.access_token).json(&json!({"email":email})).send().await.map_err(|_|"Não foi possível solicitar a troca de e-mail.".to_string())?).await?;
 Ok(json!({"email":result.get("email"),"pending":result.get("new_email"),"message":"Solicitação enviada. Confira os e-mails de confirmação para concluir a alteração."}))
}
#[tauri::command]
async fn launcher_settings(state:tauri::State<'_,AppState>)->Result<Value,String>{
 value(state.client.post(format!("{SUPABASE_URL}/rest/v1/rpc/clt_launcher_public")).header("apikey",SUPABASE_KEY).json(&json!({})).send().await.map_err(|_|"Não foi possível consultar o fundo de login.".to_string())?).await
}
#[tauri::command]
async fn launcher_permission(state:tauri::State<'_,AppState>)->Result<bool,String>{
 let session=current(&state).await?;Ok(rpc(&state.client,"clt_launcher_can_edit",json!({}),&session.access_token).await?.as_bool()==Some(true))
}
#[tauri::command]
async fn set_login_background(url:Option<String>,state:tauri::State<'_,AppState>)->Result<Value,String>{let session=current(&state).await?;rpc(&state.client,"clt_launcher_set_wallpaper",json!({"p_url":url}),&session.access_token).await}
#[tauri::command]
async fn upload_login_background(input:UploadInput,state:tauri::State<'_,AppState>)->Result<Value,String>{
 let session=current(&state).await?;
 if rpc(&state.client,"clt_launcher_can_edit",json!({}),&session.access_token).await?.as_bool()!=Some(true){return Err("Esta conta não tem permissão para alterar o login.".into());}
 let ext=match input.mime.as_str(){"image/png"=>"png","image/jpeg"=>"jpg","image/webp"=>"webp",_=>return Err("Escolha PNG, JPG ou WebP.".into())};
 if input.base64.len()>12*1024*1024{return Err("Escolha uma imagem de até 8 MB.".into());}
 let bytes=base64::engine::general_purpose::STANDARD.decode(input.base64).map_err(|_|"Imagem inválida.".to_string())?;
 if bytes.is_empty()||bytes.len()>8*1024*1024{return Err("Escolha uma imagem de até 8 MB.".into());}
 let path=format!("{}/login-{}.{}",session.user.id,SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis(),ext);
 value(state.client.post(format!("{SUPABASE_URL}/storage/v1/object/login-backgrounds/{path}")).header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type",&input.mime).body(bytes).send().await.map_err(|_|"Não foi possível enviar o fundo.".to_string())?).await?;
 Ok(json!({"url":format!("{SUPABASE_URL}/storage/v1/object/public/login-backgrounds/{path}")}))
}
#[tauri::command]
async fn friend_activity(state:tauri::State<'_,AppState>)->Result<Value,String>{
 let session=current(&state).await?;let friends=get(&state.client,&format!("/rest/v1/amigos?select=amigo_id&user_id=eq.{}&limit=200",session.user.id),&session.access_token).await?;
 let ids:Vec<&str>=friends.as_array().into_iter().flatten().filter_map(|f|f["amigo_id"].as_str()).collect();if ids.is_empty(){return Ok(json!([]));}
 let events=get(&state.client,&format!("/rest/v1/clt_activity_events?select=id,user_id,tipo,item_id,categoria,nome,status,meta,created_at&user_id=in.({})&order=created_at.desc,id.desc&limit=20",ids.join(",")),&session.access_token).await?;
 attach_authors(&state.client,events,&session.access_token).await
}
#[tauri::command]
async fn link_steam(steam_id:String,state:tauri::State<'_,AppState>)->Result<Value,String>{
 let session=current(&state).await?;let id=steam_id.trim();if !id.is_empty()&&(id.len()!=17||!id.bytes().all(|x|x.is_ascii_digit())){return Err("Informe o Steam ID da conta com 17 dígitos.".into());}
 value(state.client.patch(format!("{SUPABASE_URL}/rest/v1/perfis?id=eq.{}",session.user.id)).header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).json(&json!({"steam_id":if id.is_empty(){Value::Null}else{json!(id)}})).send().await.map_err(|_|"Não foi possível conectar a Steam.".to_string())?).await
}
#[tauri::command]
async fn link_retroachievements(username:String,state:tauri::State<'_,AppState>)->Result<Value,String>{
 let session=current(&state).await?;let user=username.trim();
 if user.is_empty(){return value(state.client.patch(format!("{SUPABASE_URL}/rest/v1/perfis?id=eq.{}",session.user.id)).header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("prefer","return=representation").json(&json!({"retroachievements_user":Value::Null,"retroachievements_ulid":Value::Null})).send().await.map_err(|_|"Não foi possível desconectar o RetroAchievements.".to_string())?).await;}
 if user.len()>64||!user.bytes().all(|b|b.is_ascii_alphanumeric()||b==b'_'||b==b'-'){return Err("Informe um usuário RetroAchievements válido.".into());}
 let profile=value(state.client.post(format!("{SUPABASE_URL}/functions/v1/bright-api")).timeout(Duration::from_secs(25)).header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type","application/json").json(&json!({"op":"raPerfil","usuario":user})).send().await.map_err(|_|"Não foi possível validar o RetroAchievements.".to_string())?).await?;
 let canonical=profile["usuario"].as_str().unwrap_or(user);let ulid=profile["ulid"].as_str().unwrap_or("");
 value(state.client.patch(format!("{SUPABASE_URL}/rest/v1/perfis?id=eq.{}",session.user.id)).header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("prefer","return=representation").json(&json!({"retroachievements_user":canonical,"retroachievements_ulid":if ulid.is_empty(){Value::Null}else{json!(ulid)}})).send().await.map_err(|_|"Não foi possível conectar o RetroAchievements.".to_string())?).await
}

#[tauri::command]
async fn logout(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    // Refresh before revocation; current() takes auth_gate itself.
    current(&state).await?;
    let _auth_guard=state.auth_gate.lock().await;
    let session=state.session.lock().map_err(|_| "Sessão indisponível.".to_string())?.clone().ok_or_else(|| "Entre novamente para continuar.".to_string())?;
    revoke_session(&state.client,&session.access_token,"local").await?;
    v06::stop();
    clear_keyring();
    session_persistence::clear_pending();
    *state.session.lock().map_err(|_| "Sessão indisponível.".to_string())? = None;
    Ok(json!({"authenticated": false}))
}

#[tauri::command]
async fn dashboard(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session = current(&state).await?; let user = &session.user.id; let token = &session.access_token;
    let games = format!("/rest/v1/itens?user_id=eq.{user}&categoria=eq.jogos");
    let media = format!("/rest/v1/itens?user_id=eq.{user}&categoria=eq.filmes");
    let total_games = count(&state.client, &games, token).await?;
    let playing = count(&state.client, &format!("{games}&or=(status.ilike.*progresso*,status.ilike.*jogando*)"), token).await?;
    let finished = count(&state.client, &format!("{games}&or=(status.ilike.*zerado*,status.ilike.*platina*)"), token).await?;
    let total_media = count(&state.client, &media, token).await?;
    let unread = count(&state.client, &format!("/rest/v1/notificacoes?destinatario_id=eq.{user}&read=eq.false"), token).await?;
    let profiles = get(&state.client, &format!("/rest/v1/perfis?select=id,nome,slug,avatar_url,banner_url,status_personalizado,bio,steam_id,retroachievements_user,retroachievements_ulid,fundo&id=eq.{user}&limit=1"), token).await?;
    let profile = profiles.as_array().and_then(|v| v.first()).cloned().unwrap_or_else(|| json!({"id":user,"nome":"Minha BatCaverna"}));
    let recent = get(&state.client, &format!("{games}&select=id,nome,status,capa,horas,plataforma&order=updated_at.desc,id.desc&limit=8"), token).await?;
    let updates = get(&state.client, &format!("/rest/v1/itens?select=id,nome,categoria,status,updated_at&user_id=eq.{user}&order=updated_at.desc,id.desc&limit=6"), token).await?;
    Ok(json!({"counts":{"totalGames":total_games,"playing":playing,"finished":finished,"totalMedia":total_media,"unread":unread},"profile":profile,"email":session.user.email,"recent":recent,"updates":updates}))
}

#[tauri::command]
async fn profile(user_id: Option<String>, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session=current(&state).await?; let id=user_id.unwrap_or_else(||session.user.id.clone()); let id=safe_id(&id)?;
    let own=id==session.user.id;
    let fields=if own{"*"}else{"id,nome,slug,avatar_url"};
    let source=if own{"perfis"}else{"perfis_publicos_clt"};
    let rows=get(&state.client,&format!("/rest/v1/{source}?select={fields}&id=eq.{id}&limit=1"),&session.access_token).await?;
    let mut p=rows.as_array().and_then(|x|x.first()).cloned().ok_or_else(||"Perfil não encontrado ou privado.".to_string())?;
    if !own {
        if let Ok(detail)=rpc(&state.client,"perfil_detalhes_autorizado",json!({"p_perfil_id":id}),&session.access_token).await {
            if let Some(row)=detail.as_array().and_then(|x|x.first()){if let Some(obj)=p.as_object_mut(){for key in ["fundo","listas","retroachievements_user","retroachievements_ulid"]{if let Some(value)=row.get(key){obj.insert(key.to_string(),value.clone());}}}}
        }
    }
    let items=get(&state.client,&format!("/rest/v1/itens?select=categoria,status,horas&user_id=eq.{id}&limit=1000"),&session.access_token).await.unwrap_or_else(|_|json!([]));
    let list=items.as_array().cloned().unwrap_or_default(); let total=list.len();
    let finished=list.iter().filter(|x|{let s=x.get("status").and_then(Value::as_str).unwrap_or("").to_lowercase();s.contains("zerado")||s.contains("platina")||s.contains("conclu")||s.contains("assistido")}).count();
    let hours:list_utils::F64Sum = list.iter().filter(|x|x.get("categoria").and_then(Value::as_str)==Some("jogos")).filter_map(|x|x.get("horas").and_then(Value::as_f64)).collect();
    if let Some(obj)=p.as_object_mut(){obj.insert("stats".into(),json!({"total":total,"finished":finished,"hours":hours.0.round()}));}
    Ok(p)
}

mod list_utils {
    #[derive(Default)] pub struct F64Sum(pub f64);
    impl FromIterator<f64> for F64Sum { fn from_iter<T: IntoIterator<Item=f64>>(iter:T)->Self{Self(iter.into_iter().sum())} }
}

#[tauri::command]
async fn update_profile(input: ProfileInput, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session=current(&state).await?; let name=input.name.trim(); let bio=input.bio.trim(); let banner=input.banner.trim(); let status=input.status.trim();
    if name.is_empty()||name.chars().count()>40{return Err("Informe um nome de até 40 caracteres.".into());}
    if bio.chars().count()>280{return Err("A bio deve ter até 280 caracteres.".into());}
    if !banner.is_empty()&&!banner.starts_with("https://"){return Err("O banner precisa usar HTTPS.".into());}
    if !matches!(status,"online"|"jogando"|"ausente"|"dnd"|"invisivel"){return Err("Status inválido.".into());}
    let steam=input.steam_id.trim();
    if !steam.is_empty()&&(steam.len()!=17||!steam.bytes().all(|b|b.is_ascii_digit())){return Err("Informe um Steam ID de 17 dígitos.".into());}
    if let Some(ref avatar)=input.avatar {if !avatar.is_empty()&&!avatar.starts_with("https://"){return Err("Foto inválida.".into());}}
    let old=get(&state.client,&format!("/rest/v1/perfis?select=*&id=eq.{}&limit=1",session.user.id),&session.access_token).await?;
    let existing=old.as_array().and_then(|a|a.first()).cloned().unwrap_or(json!({}));
    if input.achievements.as_ref().is_some_and(|v|v.len()>4){return Err("Selecione até quatro conquistas.".into());}
    if input.games.as_ref().is_some_and(|g|g.len()>8){return Err("Selecione até oito jogos.".into());}
    let result=rpc(&state.client,"salvar_personalizacao_perfil_clt",json!({"p_nome":name,"p_bio":if bio.is_empty(){Value::Null}else{json!(bio)},"p_banner_url":if banner.is_empty(){Value::Null}else{json!(banner)},"p_status":status,"p_titulo_destaque_nivel":input.title_level.map(|v|json!(v)).unwrap_or_else(||existing.get("titulo_destaque_nivel").cloned().unwrap_or(json!(0))),"p_jogos_destaque":input.games.map(|v|json!(v)).unwrap_or_else(||existing.get("jogos_destaque").cloned().unwrap_or(json!([]))),"p_conquistas_destaque":input.achievements.map(|v|json!(v)).unwrap_or_else(||existing.get("conquistas_destaque").cloned().unwrap_or(json!([])))}),&session.access_token).await?;
    let mut patch=json!({"steam_id":if steam.is_empty(){Value::Null}else{json!(steam)}});
    if let Some(avatar)=input.avatar {if !avatar.is_empty()&&!avatar.starts_with("https://"){return Err("Foto inválida.".into());}patch["avatar_url"]=if avatar.is_empty(){Value::Null}else{json!(avatar)};}
    value(state.client.patch(format!("{SUPABASE_URL}/rest/v1/perfis?id=eq.{}",session.user.id)).header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type","application/json").json(&patch).send().await.map_err(|_|"Não foi possível salvar foto e Steam.".to_string())?).await?;
    Ok(result)
}

#[tauri::command]
async fn update_profile_background(input: Value, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session=current(&state).await?;let url=input["url"].as_str().unwrap_or("").trim();
    if !url.is_empty()&&!url.starts_with("https://"){return Err("O fundo precisa usar HTTPS.".into());}
    let dark=input["escuro"].as_u64().unwrap_or(65).min(90);let blur=input["desfoque"].as_u64().unwrap_or(0).min(20);
    let body=json!({"fundo":if url.is_empty(){Value::Null}else{json!({"url":url,"escuro":dark,"desfoque":blur})}});
    value(state.client.patch(format!("{SUPABASE_URL}/rest/v1/perfis?id=eq.{}",session.user.id)).header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type","application/json").header("prefer","return=representation").json(&body).send().await.map_err(|_|"Não foi possível salvar o fundo do perfil.".to_string())?).await
}

#[tauri::command]
async fn library(category: String, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session = current(&state).await?; let user = &session.user.id;
    if !matches!(category.as_str(), "jogos"|"filmes"|"series"|"animes") { return Err("Categoria inválida.".into()); }
    let source = if category == "jogos" { "jogos" } else { "filmes" };
    let mut all = Vec::new();
    let mut offset = 0;
    loop {
        let page = get(&state.client, &format!("/rest/v1/itens?select=*&user_id=eq.{user}&categoria=eq.{source}&order=id.asc&offset={offset}&limit=500"), &session.access_token).await?;
        let batch = page.as_array().ok_or("A biblioteca retornou dados inválidos.")?;
        let count = batch.len(); all.extend(batch.iter().cloned());
        if count == 0 { break; }
        offset += count;
    }
    let rows = Value::Array(all);
    if category == "jogos" { return Ok(rows); }
    let filtered = rows.as_array().cloned().unwrap_or_default().into_iter().filter(|row| {
        let kind=row.get("tipo").and_then(Value::as_str).unwrap_or("").to_lowercase();
        let anime=kind.contains("anime")||kind.contains('🍥');
        let series=kind.contains("serie")||kind.contains("série")||kind.contains('📺');
        match category.as_str() { "animes"=>anime,"series"=>series&&!anime,"filmes"=>!anime&&!series,_=>false }
    }).collect();
    Ok(Value::Array(filtered))
}

fn safe_id(value: &str) -> Result<&str, String> {
    if value.is_empty() || value.len() > 80 || !value.bytes().all(|b| b.is_ascii_alphanumeric() || matches!(b, b'-' | b'_')) {
        return Err("Identificador inválido.".into());
    }
    Ok(value)
}

fn normalize_genres(value: &Value) -> Result<Value, String> {
    let raw: Vec<String> = match value {
        Value::Null => Vec::new(),
        Value::String(text) => text.split(|c| c == '•' || c == ',' || c == '|').map(str::to_owned).collect(),
        Value::Array(items) => items.iter().map(|v| v.as_str().map(str::to_owned).ok_or_else(|| "Gêneros inválidos.".to_string())).collect::<Result<_, _>>()?,
        _ => return Err("Gêneros inválidos.".into()),
    };
    let mut genres: Vec<String> = Vec::new();
    for entry in raw { let genre = entry.trim(); if !genre.is_empty() && !genres.iter().any(|g| g == genre) { genres.push(genre.to_string()); } }
    Ok(json!(genres))
}

fn normalize_steam_appid(value: &Value) -> Result<Value, String> {
    if value.is_null() || value.as_str() == Some("") || value.as_i64() == Some(0) { return Ok(Value::Null); }
    let id = value.as_u64().or_else(|| value.as_str().and_then(|s| s.parse::<u64>().ok())).filter(|n| *n > 0 && *n <= u32::MAX as u64).ok_or("Steam App ID inválido.")?;
    Ok(json!(id))
}

#[tauri::command]
async fn save_item(item: Value, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session = current(&state).await?;
    let object = item.as_object().ok_or_else(|| "Dados do título inválidos.".to_string())?;
    let name = object.get("nome").and_then(Value::as_str).unwrap_or("").trim();
    if name.is_empty() || name.chars().count() > 180 { return Err("Informe um nome de até 180 caracteres.".into()); }
    let category = object.get("categoria").and_then(Value::as_str).unwrap_or("");
    if !matches!(category, "jogos" | "filmes") { return Err("Categoria inválida.".into()); }
    let mut row = serde_json::Map::new();
    row.insert("nome".into(), json!(name)); row.insert("categoria".into(), json!(category));
    for key in ["tipo","status","capa","nota","horas","plataforma","loja","onde","ano","generos","review","data","inicio","prioridade","tempo_est","conquistas","preco","duracao","steam_appid"] {
        if let Some(value) = object.get(key) { row.insert(key.into(), if key == "generos" { normalize_genres(value)? } else if key == "steam_appid" { normalize_steam_appid(value)? } else { value.clone() }); }
    }
    let id = object.get("id").and_then(Value::as_str).map(str::to_owned).or_else(|| object.get("id").and_then(Value::as_i64).map(|v| v.to_string()));
    if let Some(appid) = row.get("steam_appid").and_then(Value::as_u64) {
        let matches = get(&state.client, &format!("/rest/v1/itens?select=id,nome&user_id=eq.{}&steam_appid=eq.{appid}&limit=2",session.user.id), &session.access_token).await?;
        if matches.as_array().is_some_and(|items| items.iter().any(|x| x["id"].as_str().map(str::to_owned).or_else(|| x["id"].as_i64().map(|v|v.to_string())) != id)) {
            return Err("Este jogo já está na sua biblioteca. Abra o título existente para editar seu progresso.".into());
        }
    }
    let response = if let Some(id) = id {
        let id = safe_id(&id)?;
        state.client.patch(format!("{SUPABASE_URL}/rest/v1/itens?id=eq.{id}&user_id=eq.{}&select=*", session.user.id))
            .header("apikey", SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type", "application/json").header("prefer", "return=representation").json(&row).send().await
    } else {
        row.insert("user_id".into(), json!(session.user.id));
        state.client.post(format!("{SUPABASE_URL}/rest/v1/itens?select=*"))
            .header("apikey", SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type", "application/json").header("prefer", "return=representation").json(&row).send().await
    }.map_err(|_| "Não foi possível salvar o título.".to_string())?;
    value(response).await
}

#[tauri::command]
async fn delete_item(id: String, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session = current(&state).await?; let id = safe_id(&id)?;
    value(state.client.delete(format!("{SUPABASE_URL}/rest/v1/itens?id=eq.{id}&user_id=eq.{}", session.user.id))
        .header("apikey", SUPABASE_KEY).bearer_auth(&session.access_token).header("prefer", "return=minimal")
        .send().await.map_err(|_| "Não foi possível excluir o título.".to_string())?).await
}


async fn attach_authors(client: &reqwest::Client, posts: Value, token: &str) -> Result<Value, String> {
    let rows = posts.as_array().cloned().unwrap_or_default();
    let mut ids: Vec<String> = rows.iter().filter_map(|p| p.get("user_id").and_then(Value::as_str).map(str::to_owned)).collect();
    ids.sort(); ids.dedup(); if ids.is_empty() { return Ok(Value::Array(rows)); }
    let people = get(client, &format!("/rest/v1/perfis_publicos_clt?select=id,nome,avatar_url&id=in.({})", ids.join(",")), token).await?;
    let lookup: HashMap<String, Value> = people.as_array().cloned().unwrap_or_default().into_iter().filter_map(|p| p.get("id").and_then(Value::as_str).map(|id| (id.to_owned(), p.clone()))).collect();
    Ok(Value::Array(rows.into_iter().map(|mut post| { if let Some(id) = post.get("user_id").and_then(Value::as_str) { post["author"] = lookup.get(id).cloned().unwrap_or(Value::Null); } post }).collect()))
}

#[tauri::command]
async fn feed(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session = current(&state).await?;
    let posts = get(&state.client, "/rest/v1/clt_posts?select=id,user_id,texto,midias,created_at&order=created_at.desc,id.desc&limit=30", &session.access_token).await?;
    attach_authors(&state.client, posts, &session.access_token).await
}

#[tauri::command]
async fn social_meta(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session = current(&state).await?;
    let likes = get(&state.client, "/rest/v1/clt_post_likes?select=post_id,user_id,created_at&order=created_at.desc&limit=1000", &session.access_token).await?;
    let comments = get(&state.client, "/rest/v1/clt_post_comments?select=id,post_id,user_id,texto,parent_id,created_at&order=created_at.asc&limit=1000", &session.access_token).await?;
    Ok(json!({"likes":likes,"comments":comments,"userId":session.user.id}))
}

#[tauri::command]
async fn toggle_like(input: LikeInput, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session = current(&state).await?; let post = safe_id(&input.post_id)?;
    let response = if input.liked {
        state.client.delete(format!("{SUPABASE_URL}/rest/v1/clt_post_likes?post_id=eq.{post}&user_id=eq.{}",session.user.id))
            .header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("prefer","return=minimal").send().await
    } else {
        state.client.post(format!("{SUPABASE_URL}/rest/v1/clt_post_likes"))
            .header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type","application/json").header("prefer","return=minimal")
            .json(&json!({"post_id":post,"user_id":session.user.id})).send().await
    }.map_err(|_| "Não foi possível atualizar a curtida.".to_string())?;
    value(response).await
}

#[tauri::command]
async fn add_comment(input: CommentInput, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session=current(&state).await?; let post=safe_id(&input.post_id)?; let text=input.text.trim();
    if text.is_empty() || text.chars().count()>500 { return Err("Escreva um comentário de até 500 caracteres.".into()); }
    value(state.client.post(format!("{SUPABASE_URL}/rest/v1/clt_post_comments?select=id,post_id,user_id,texto,parent_id,created_at"))
        .header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type","application/json").header("prefer","return=representation")
        .json(&json!({"post_id":post,"user_id":session.user.id,"texto":text})).send().await.map_err(|_| "Não foi possível comentar.".to_string())?).await
}

#[tauri::command]
async fn publish(input: PublishInput, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let clean = input.text.trim(); if (clean.is_empty()&&input.media.is_empty()) || clean.chars().count() > 2000 { return Err("Escreva uma mensagem ou adicione uma mídia.".into()); }
    if input.media.len()>4 || input.media.iter().any(|x|!x.starts_with(&format!("{SUPABASE_URL}/storage/v1/object/public/feed-media/"))){return Err("Mídia inválida.".into());}
    let session = current(&state).await?;
    value(state.client.post(format!("{SUPABASE_URL}/rest/v1/clt_posts?select=id,user_id,texto,midias,created_at")).header("apikey", SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type", "application/json").header("prefer", "return=representation").json(&json!({"user_id":session.user.id,"texto":clean,"midias":input.media})).send().await.map_err(|_| "Não foi possível enviar a publicação.".to_string())?).await
}

#[tauri::command]
async fn upload_media(input: UploadInput, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session=current(&state).await?;
    if input.name.len()>180 || input.base64.len()>17_000_000 || !matches!(input.mime.as_str(),"image/png"|"image/jpeg"|"image/webp"|"video/mp4"|"video/webm"){return Err("Arquivo inválido ou maior que 12 MB.".into());}
    let response=state.client.post(format!("{SUPABASE_URL}/functions/v1/media-upload")).header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type","application/json").json(&json!({"name":input.name,"mime":input.mime,"base64":input.base64})).send().await.map_err(|_|"Não foi possível enviar a mídia.".to_string())?;
    if response.status()==reqwest::StatusCode::NOT_FOUND{return Err("O envio de mídia ainda precisa ser ativado no Supabase.".into());}
    value(response).await
}

fn normalize_media_url(value: &str) -> Result<String, String> {
    let value = value.trim();
    if value.starts_with("https://") { return Ok(value.to_string()); }
    let path = value.trim_start_matches('/');
    if path.is_empty() || path.contains("..") || path.chars().any(|c| matches!(c, ':'|'?'|'#')) { return Err("URL de mídia inválida.".into()); }
    if path.starts_with("storage/v1/") { return Ok(format!("{SUPABASE_URL}/{path}")); }
    let bucket = path.split('/').next().unwrap_or("");
    let prefix = if matches!(bucket, "avatars"|"group-avatars"|"feed-media"|"chat-media"|"group-chat-media") { "" } else { "avatars/" };
    Ok(format!("{SUPABASE_URL}/storage/v1/object/public/{prefix}{path}"))
}
#[tauri::command]
async fn media_url(url: String, state: tauri::State<'_, AppState>) -> Result<String, String> {
    let url=normalize_media_url(&url)?;
    if !url.starts_with(&format!("{SUPABASE_URL}/")){return Ok(url);}
    let marker="/storage/v1/object/public/"; let Some(rest)=url.split(marker).nth(1) else{return Ok(url)};
    let mut parts=rest.splitn(2,'/'); let bucket=parts.next().unwrap_or(""); let path=parts.next().unwrap_or("");
    if !matches!(bucket,"avatars"|"group-avatars"|"feed-media"|"chat-media"|"group-chat-media") || path.is_empty(){return Err("Mídia inválida.".into());}
    let session=current(&state).await?;
    let signed=value(state.client.post(format!("{SUPABASE_URL}/storage/v1/object/sign/{bucket}/{path}")).header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type","application/json").json(&json!({"expiresIn":3600})).send().await.map_err(|_|"Não foi possível abrir a mídia.".to_string())?).await?;
    let value=signed.get("signedURL").or_else(||signed.get("signedUrl")).and_then(Value::as_str).ok_or_else(||"Mídia indisponível.".to_string())?;
    Ok(if value.starts_with("http"){value.to_string()}else{format!("{SUPABASE_URL}/storage/v1{value}")})
}

const CATALOG_ORIGIN: &str = "https://luoqlhgfmixvfqbfcdoc.supabase.co/functions/v1/native-api";
#[tauri::command]
async fn catalog(input: Value, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session=current(&state).await?;
    let provider=input["provider"].as_str().unwrap_or("");
    let query=input["query"].as_str().unwrap_or("").trim();
    if query.chars().count()>180{return Err("Pesquisa muito longa.".into());}
    if provider=="anilist" {
        if query.len()<2&&input["recommend"].as_bool()!=Some(true){return Err("Digite pelo menos dois caracteres.".into());}
        let gql=if input["recommend"].as_bool()==Some(true){"query($page:Int){Page(page:$page,perPage:30){pageInfo{lastPage hasNextPage}media(type:ANIME,isAdult:false,sort:POPULARITY_DESC){id isAdult title{romaji english}startDate{year}coverImage{large}genres episodes averageScore meanScore bannerImage siteUrl trailer{id site thumbnail}description(asHtml:false)}}}"}else{"query($s:String,$page:Int){Page(page:$page,perPage:30){pageInfo{lastPage hasNextPage}media(search:$s,type:ANIME,isAdult:false,sort:SEARCH_MATCH){id isAdult title{romaji english}startDate{year}coverImage{large}genres episodes averageScore meanScore bannerImage siteUrl trailer{id site thumbnail}description(asHtml:false)}}}"};
        return value(state.client.post("https://graphql.anilist.co").json(&json!({"query":gql,"variables":{"s":query,"page":input["page"].as_u64().unwrap_or(1).clamp(1,100)}})).send().await.map_err(|_|"AniList indisponível.".to_string())?).await;
    }
    let kind=input["kind"].as_str().unwrap_or("movie");
    let id=input["id"].as_u64();
    let recommend=input["recommend"].as_bool()==Some(true);
    let path=match provider {
        "igdb"|"rawg"=>if let Some(id)=id{format!("igdb/games/{id}")}else{"igdb/games".into()},
        "tmdb"=>{if !matches!(kind,"movie"|"tv"){return Err("Tipo inválido.".into());}if let Some(id)=id {format!("tmdb/{kind}/{id}{}",if input["providers"].as_bool()==Some(true){"/watch/providers"}else{""})}else{if recommend{format!("tmdb/discover/{kind}")}else{format!("tmdb/search/{kind}")}}},
        _=>return Err("Catálogo inválido.".into())
    };
    if id.is_none()&&!recommend&&query.len()<2{return Err("Digite pelo menos dois caracteres.".into());}
    let request=state.client.get(format!("{CATALOG_ORIGIN}/api/catalog/{path}")).bearer_auth(&session.access_token).query(&[(if matches!(provider,"igdb"|"rawg"){"search"}else{"query"},query),("language","pt-BR"),("page_size","40"),("page",&input["page"].as_u64().unwrap_or(1).clamp(1,100).to_string()),("with_genres",if input["anime"].as_bool()==Some(true){"16"}else{""}),("with_original_language",if input["anime"].as_bool()==Some(true){"ja"}else{""})]);
    let request=if recommend{request.query(&[("ordering","-added"),("sort_by","popularity.desc")])}else{request};
    let retry=request.try_clone();
    let response=match request.send().await{Ok(r) if !r.status().is_server_error()=>r,Ok(_)|Err(_)=>{tokio::time::sleep(Duration::from_millis(400)).await;retry.ok_or_else(||"Não foi possível consultar o catálogo.".to_string())?.send().await.map_err(|_|"Não foi possível consultar o catálogo.".to_string())?}};
    value(response).await
}
fn image_host(host: &str)->bool {
    host=="luoqlhgfmixvfqbfcdoc.supabase.co" || host=="cdn2.steamgriddb.com" || host=="cdn.steamgriddb.com" || ["igdb.com","steamstatic.com","tmdb.org","anilist.co","retroachievements.org"].iter().any(|d|host==*d||host.ends_with(&format!(".{d}")))
}
#[tauri::command]
async fn cover_image(app:tauri::AppHandle,url: String) -> Result<String,String> {
    let cache_dir=catalog_disk_cache::directory(&app);
    if let Some(ref root)=cache_dir{if let Some(hit)=catalog_disk_cache::read(root,&url){return Ok(hit)}}
    let mut parsed=reqwest::Url::parse(&url).map_err(|_|"Imagem inválida.".to_string())?;
    if parsed.scheme()!="https"||!parsed.username().is_empty()||parsed.password().is_some()||parsed.port().is_some()||!image_host(parsed.host_str().unwrap_or("")){return Err("Origem de capa não permitida.".into());}
    parsed.set_fragment(None);
    let client=reqwest::Client::builder().timeout(Duration::from_secs(15)).redirect(reqwest::redirect::Policy::custom(|a|{
        if a.previous().len()<4&&a.url().scheme()=="https"&&a.url().port().is_none()&&a.url().username().is_empty()&&a.url().password().is_none()&&image_host(a.url().host_str().unwrap_or("")){a.follow()}else{a.stop()}
    })).build().map_err(|_|"Imagem indisponível.".to_string())?;
    let mut r=client.get(parsed).send().await.map_err(|_|"Imagem indisponível.".to_string())?;
    if !r.status().is_success(){return Err("Capa indisponível.".into());}
    let mime=r.headers().get("content-type").and_then(|h|h.to_str().ok()).unwrap_or("").split(';').next().unwrap_or("").to_string();
    if !matches!(mime.as_str(),"image/png"|"image/jpeg"|"image/webp"|"image/gif"|"image/avif"){return Err("Formato de capa inválido.".into());}
    let mut bytes=Vec::new();while let Some(chunk)=r.chunk().await.map_err(|_|"Imagem interrompida.".to_string())?{if bytes.len()+chunk.len()>8*1024*1024{return Err("Capa muito grande.".into());}bytes.extend_from_slice(&chunk);}
    let data=format!("data:{mime};base64,{}",base64::engine::general_purpose::STANDARD.encode(bytes));
    if let Some(root)=cache_dir{catalog_disk_cache::write(&root,&url,&data);}
    Ok(data)
}
#[tauri::command]
async fn upload_profile_image(input: UploadInput, state: tauri::State<'_,AppState>)->Result<Value,String>{
    v06::moderated_upload(input,&state,"avatars").await
}

#[tauri::command]
async fn bright_api(input: Value, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session=current(&state).await?;
    let response=state.client.post(format!("{SUPABASE_URL}/functions/v1/bright-api")).timeout(Duration::from_secs(if input["op"].as_str()==Some("gratis"){50}else{25})).header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type","application/json").json(&input).send().await.map_err(|_|"Não foi possível consultar a Steam.".to_string())?;
    let result=value(response).await?;
    Ok(result)
}

#[tauri::command]
fn launch_game(appid: u64) -> Result<(), String> {
    if appid == 0 || appid > 9999999999 { return Err("Jogo inválido.".into()); }
    open::that(format!("steam://rungameid/{appid}")).map_err(|_| "Não foi possível abrir a Steam.".into())
}

fn allowed_provider_url(value: &str) -> bool {
    let Ok(url) = reqwest::Url::parse(value) else { return false; };
    if url.scheme() != "https" || !url.username().is_empty() || url.password().is_some() || url.port_or_known_default() != Some(443) { return false; }
    let host = url.host_str().unwrap_or("");
    if host == "batcavernaclt.gamersclt.workers.dev" { return matches!(url.path(), "/privacidade" | "/privacidade/"); }
    matches!(host, "store.steampowered.com" | "store.epicgames.com" | "www.deepl.com" | "deepl.com" | "www.igdb.com" | "igdb.com" | "www.themoviedb.org" | "anilist.co" | "retroachievements.org" | "www.retroachievements.org" | "supabase.com" | "firebase.google.com" | "sightengine.com")
}
#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    if !allowed_provider_url(&url) { return Err("Link externo não permitido.".into()); }
    open::that(url).map_err(|_|"Não foi possível abrir o navegador.".to_string())
}

#[tauri::command]
async fn friends(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session = current(&state).await?; let user = &session.user.id; let token = &session.access_token;
    let rows = get(&state.client, &format!("/rest/v1/amigos?select=amigo_id&user_id=eq.{user}&order=amigo_id.asc&limit=200"), token).await?;
    let ids: Vec<&str> = rows.as_array().into_iter().flatten().filter_map(|r| r.get("amigo_id").and_then(Value::as_str)).collect();
    if ids.is_empty() { return Ok(json!([])); }
    get(&state.client, &format!("/rest/v1/perfis_publicos_clt?select=id,nome,slug,avatar_url&id=in.({})&order=nome.asc", ids.join(",")), token).await
}

#[tauri::command]
async fn search_people(query: String, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session=current(&state).await?; let query=query.trim();
    if query.chars().count()<2 || query.chars().count()>80 { return Err("Digite pelo menos 2 caracteres.".into()); }
    let primary=value(state.client.post(format!("{SUPABASE_URL}/rest/v1/rpc/buscar_usuarios_clt"))
        .header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type","application/json")
        .json(&json!({"p_busca":query})).send().await.map_err(|_| "Não foi possível pesquisar pessoas.".to_string())?).await;
    primary
}

#[tauri::command]
async fn send_friend_invite(input: InviteInput, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session=current(&state).await?; let user=safe_id(&input.user_id)?;
    value(state.client.post(format!("{SUPABASE_URL}/rest/v1/rpc/enviar_convite_amizade"))
        .header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type","application/json")
        .json(&json!({"p_destinatario_id":user})).send().await.map_err(|_| "Não foi possível enviar o convite.".to_string())?).await
}

#[tauri::command]
async fn chat_messages(friend_id: String, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session=current(&state).await?; let friend=safe_id(&friend_id)?; let me=&session.user.id;
    // The production chat table predates message editing and does not expose
    // `updated_at`. Selecting only columns that exist keeps the whole history
    // readable without weakening RLS or deleting any message.
    get(&state.client,&format!("/rest/v1/clt_chat_messages?select=id,remetente_id,destinatario_id,texto,midia_url,created_at,lida&or=(and(remetente_id.eq.{me},destinatario_id.eq.{friend}),and(remetente_id.eq.{friend},destinatario_id.eq.{me}))&order=created_at.desc&limit=300"),&session.access_token).await
}

#[tauri::command]
async fn send_message(input: MessageInput, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session=current(&state).await?; let friend=safe_id(&input.friend_id)?; let text=input.text.trim();
    if (text.is_empty() && input.media.is_none()) || text.chars().count()>2000 { return Err("Escreva uma mensagem de até 2.000 caracteres.".into()); }
    if let Some(ref media)=input.media {if !media.starts_with(&format!("{}/",session.user.id))||media.contains("..")||media.contains('?')||media.contains('#'){return Err("Imagem de mensagem inválida.".into());}}
    value(state.client.post(format!("{SUPABASE_URL}/rest/v1/clt_chat_messages?select=id,remetente_id,destinatario_id,texto,midia_url,created_at,lida"))
        .header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type","application/json").header("prefer","return=representation")
        .json(&json!({"remetente_id":session.user.id,"destinatario_id":friend,"texto":text,"midia_url":input.media})).send().await.map_err(|_| "Não foi possível enviar a mensagem.".to_string())?).await
}

#[tauri::command]
async fn notifications(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session = current(&state).await?;
    get(&state.client, &format!("/rest/v1/notificacoes?select=id,tipo,mensagem,actor_id,referencia_id,read,created_at&destinatario_id=eq.{}&order=created_at.desc,id.desc&limit=100", session.user.id), &session.access_token).await
}

#[tauri::command]
async fn mark_notifications_read(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session = current(&state).await?;
    value(state.client.patch(format!("{SUPABASE_URL}/rest/v1/notificacoes?destinatario_id=eq.{}&read=eq.false", session.user.id)).header("apikey", SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type", "application/json").header("prefer", "return=minimal").json(&json!({"read":true})).send().await.map_err(|_| "Não foi possível atualizar as notificações.".to_string())?).await
}

#[tauri::command]
async fn respond_friend_invite(input: InviteReplyInput, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session=current(&state).await?; let invite=safe_id(&input.invite_id)?;
    let function=if input.accept {"aceitar_convite_amizade"} else {"recusar_convite_amizade"};
    value(state.client.post(format!("{SUPABASE_URL}/rest/v1/rpc/{function}"))
        .header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type","application/json")
        .json(&json!({"p_convite_id":invite})).send().await.map_err(|_| "Não foi possível responder ao convite.".to_string())?).await
}

#[tauri::command]
async fn journey_stats(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session=current(&state).await?;
    value(state.client.post(format!("{SUPABASE_URL}/rest/v1/rpc/clt_journey"))
        .header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type","application/json")
        .json(&json!({"p_action":"stats","p_data":{}})).send().await.map_err(|_| "Não foi possível carregar as estatísticas.".to_string())?).await
}

fn local_url(url: &tauri::Url) -> bool { (url.scheme() == "tauri" && url.host_str() == Some("localhost")) || (url.scheme() == "http" && url.host_str() == Some("tauri.localhost") && url.port().is_none()) }

fn main() {
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(Duration::from_secs(10))
        .tcp_keepalive(Duration::from_secs(30))
        .pool_idle_timeout(Duration::from_secs(90))
        .timeout(Duration::from_secs(25))
        .build()
        .expect("Cliente HTTPS");
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _| { if !args.iter().any(|arg| arg == "--autostart") { desktop_runtime::show_main(app); } }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(desktop_runtime::DesktopState::default())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if desktop_runtime::background_enabled(window.app_handle()) { api.prevent_close(); let _ = window.hide(); }
            }
        })
        .manage(AppState { client, session: Mutex::new(None), auth_gate: tokio::sync::Mutex::new(()) })
        .invoke_handler(tauri::generate_handler![account_preferences::desktop_layout,game_detection::running_processes, game_detection::detect_pc_game, desktop_runtime::desktop_preferences, desktop_runtime::test_windows_notification, desktop_runtime::client_log, desktop_runtime::diagnostic_status, desktop_runtime::diagnostic_clear, desktop_runtime::diagnostic_export, app_state, check_for_updates, install_update, login, register, recover_password, native_auth::resend_confirmation, native_auth::verify_email_proof, email_change::verify_email_change, change_password, change_email, launcher_settings, launcher_permission, set_login_background, upload_login_background, friend_activity, link_steam, link_retroachievements, logout, dashboard, profile, update_profile, update_profile_background, library, save_item, delete_item, progress_outbox::steam_local_achievements, progress_outbox::progress_sync, feed, social_meta, publish, upload_media, media_url, catalog, cover_image, upload_profile_image, bright_api, open_external, launch_game, toggle_like, add_comment, friends, search_people, send_friend_invite, chat_messages, send_message, notifications, mark_notifications_read, respond_friend_invite, journey_stats, v06::community, v06::upload_chat_image, v06::realtime_start, v06::realtime_presence])
        .setup(|app| {
            desktop_runtime::initialize(app.handle())?;
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into())).title("BatCaverna CLT").visible(!desktop_runtime::start_minimized(app.handle())).focused(!desktop_runtime::start_minimized(app.handle())).inner_size(1360.,860.).min_inner_size(980.,640.).devtools(cfg!(debug_assertions)).initialization_script(include_str!("../../src/webview-policy.js")).on_navigation(local_url).build()?;
            use tauri::{menu::{Menu,MenuItem}, tray::{MouseButton,MouseButtonState,TrayIconBuilder,TrayIconEvent}};
            let show=MenuItem::with_id(app,"show","Abrir BatCaverna",true,None::<&str>)?; let hide=MenuItem::with_id(app,"hide","Ocultar na bandeja",true,None::<&str>)?; let quit=MenuItem::with_id(app,"quit","Sair",true,None::<&str>)?;
            let menu=Menu::with_items(app,&[&show,&hide,&quit])?; let mut tray=TrayIconBuilder::new().tooltip("BatCaverna CLT").menu(&menu).on_menu_event(|app,event| match event.id.as_ref(){"show"=>desktop_runtime::show_main(app),"hide"=>if let Some(w)=app.get_webview_window("main"){let _=w.hide();},"quit"=>app.exit(0),_=>{}}).on_tray_icon_event(|tray,event|{if let TrayIconEvent::Click{button:MouseButton::Left,button_state:MouseButtonState::Up,..}=event{desktop_runtime::show_main(tray.app_handle());}});
            if let Some(icon)=app.default_window_icon(){tray=tray.icon(icon.clone());} tray.build(app)?; Ok(())
        }).run(tauri::generate_context!()).expect("Erro ao iniciar BatCaverna CLT");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn media_paths_preserve_buckets_and_reject_invalid_paths() {
        assert_eq!(normalize_media_url("friend/avatar.webp").unwrap(), format!("{SUPABASE_URL}/storage/v1/object/public/avatars/friend/avatar.webp"));
        assert_eq!(normalize_media_url("chat-media/friend/image.webp").unwrap(), format!("{SUPABASE_URL}/storage/v1/object/public/chat-media/friend/image.webp"));
        assert_eq!(normalize_media_url("/storage/v1/object/public/avatars/avatar.webp").unwrap(), format!("{SUPABASE_URL}/storage/v1/object/public/avatars/avatar.webp"));
        assert!(normalize_media_url("../avatar.webp").is_err());
        assert!(normalize_media_url("javascript:alert(1)").is_err());
        assert_eq!(normalize_media_url("https://avatars.example/avatar.webp").unwrap(), "https://avatars.example/avatar.webp");
    }
    #[test] fn steam_id_does_not_turn_empty_values_into_shared_zero() {
        assert_eq!(normalize_steam_appid(&Value::Null).unwrap(),Value::Null);
        assert_eq!(normalize_steam_appid(&json!(0)).unwrap(),Value::Null);
        assert_eq!(normalize_steam_appid(&json!("10")).unwrap(),json!(10));
        assert!(normalize_steam_appid(&json!(-1)).is_err());
        assert!(normalize_steam_appid(&json!(1.5)).is_err());
    }
    #[test] fn genres_accept_editor_text_and_catalog_arrays() {
        assert_eq!(normalize_genres(&json!("Ação • Aventura • RPG • Ação")).unwrap(), json!(["Ação", "Aventura", "RPG"]));
        assert_eq!(normalize_genres(&json!(["Ação", "RPG"])).unwrap(), json!(["Ação", "RPG"]));
        assert_eq!(normalize_genres(&json!("")).unwrap(), json!([]));
        assert_eq!(normalize_genres(&Value::Null).unwrap(), json!([]));
        assert!(normalize_genres(&json!([42])).is_err());
    }
    #[test] fn steamgrid_artwork_hosts_are_exact(){assert!(image_host("cdn2.steamgriddb.com"));assert!(!image_host("cdn2.steamgriddb.com.evil.test"));}
    #[test] fn invalid_steam_launch_ids_are_rejected() { assert!(launch_game(0).is_err()); assert!(launch_game(10_000_000_000).is_err()); }
    #[test] fn provider_links_only_allow_trusted_https_origins() {
        for url in ["https://www.deepl.com", "https://www.igdb.com", "https://www.themoviedb.org", "https://anilist.co", "https://retroachievements.org", "https://supabase.com", "https://firebase.google.com", "https://sightengine.com", "https://store.steampowered.com/app/42", "https://store.epicgames.com/", "https://batcavernaclt.gamersclt.workers.dev/privacidade"] { assert!(allowed_provider_url(url), "{url}"); }
        for url in ["http://www.deepl.com", "https://www.deepl.com.evil.test/", "https://www.deepl.com@evil.test/", "https://user@www.deepl.com/", "https://www.deepl.com:444/", "javascript:alert(1)", "file:///tmp/test", "https://example.com/"] { assert!(!allowed_provider_url(url), "{url}"); }
        let privacy = "https://batcavernaclt.gamersclt.workers.dev/privacidade";
        assert!(!allowed_provider_url(&privacy.replace("/privacidade", "/api/")));
    }
    #[test] fn direct_backend_only() { assert!(SUPABASE_URL.starts_with("https://")); assert!(SUPABASE_URL.ends_with(".supabase.co")); }
}

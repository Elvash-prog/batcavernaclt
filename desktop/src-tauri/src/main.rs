#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{collections::HashMap, sync::Mutex, time::{SystemTime, UNIX_EPOCH}};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

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

struct AppState { client: reqwest::Client, session: Mutex<Option<Session>> }

fn default_expiry() -> u64 { 3600 }
fn now() -> u64 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs() }
fn keyring() -> Result<keyring::Entry, String> { keyring::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT).map_err(|_| "O Windows não disponibilizou o armazenamento seguro.".into()) }
fn clear_keyring() { if let Ok(entry) = keyring() { let _ = entry.delete_credential(); } }

fn message(body: &str, status: reqwest::StatusCode) -> String {
    serde_json::from_str::<Value>(body).ok().and_then(|v| {
        ["message", "msg", "error_description", "error"].into_iter().find_map(|key| v.get(key).and_then(Value::as_str).map(str::to_owned))
    }).unwrap_or_else(|| if status == reqwest::StatusCode::UNAUTHORIZED { "Sua sessão expirou. Entre novamente.".into() } else { format!("O servidor não confirmou a operação (HTTP {}).", status.as_u16()) })
}

async fn value(response: reqwest::Response) -> Result<Value, String> {
    let status = response.status();
    let body = response.text().await.map_err(|_| "A resposta do Supabase foi interrompida.".to_string())?;
    if !status.is_success() { return Err(message(&body, status)); }
    if body.trim().is_empty() || body.trim() == "null" { return Ok(Value::Null); }
    serde_json::from_str(&body).map_err(|_| "O Supabase enviou uma resposta inválida.".into())
}

fn auth(client: &reqwest::Client, path: &str) -> reqwest::RequestBuilder {
    client.post(format!("{SUPABASE_URL}{path}")).header("apikey", SUPABASE_KEY).bearer_auth(SUPABASE_KEY).header("content-type", "application/json")
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

async fn refresh_session(client: &reqwest::Client, refresh_token: &str) -> Result<Session, String> {
    let response = auth(client, "/auth/v1/token?grant_type=refresh_token").json(&json!({"refresh_token": refresh_token})).send().await.map_err(|_| "Não foi possível renovar a sessão.".to_string())?;
    let status = response.status();
    let body = response.text().await.map_err(|_| "A renovação da sessão foi interrompida.".to_string())?;
    if !status.is_success() { return Err(message(&body, status)); }
    session(serde_json::from_str(&body).map_err(|_| "Sessão inválida.".to_string())?)
}

async fn current(state: &AppState) -> Result<Session, String> {
    let existing = state.session.lock().map_err(|_| "Sessão indisponível.".to_string())?.clone().ok_or_else(|| "Entre novamente para continuar.".to_string())?;
    if existing.expires_at > now() + 60 { return Ok(existing); }
    let updated = refresh_session(&state.client, &existing.refresh_token).await?;
    if let Ok(entry) = keyring() { if entry.get_password().is_ok() { let _ = entry.set_password(&updated.refresh_token); } }
    *state.session.lock().map_err(|_| "Sessão indisponível.".to_string())? = Some(updated.clone());
    Ok(updated)
}

fn rest(client: &reqwest::Client, path: &str, token: &str) -> reqwest::RequestBuilder {
    client.get(format!("{SUPABASE_URL}{path}")).header("apikey", SUPABASE_KEY).bearer_auth(token)
}

async fn get(client: &reqwest::Client, path: &str, token: &str) -> Result<Value, String> {
    value(rest(client, path, token).send().await.map_err(|_| "Não foi possível consultar o Supabase.".to_string())?).await
}

async fn count(client: &reqwest::Client, path: &str, token: &str) -> Result<u64, String> {
    let separator = if path.contains('?') { '&' } else { '?' };
    let response = client.head(format!("{SUPABASE_URL}{path}{separator}select=id&limit=1")).header("apikey", SUPABASE_KEY).bearer_auth(token).header("prefer", "count=exact").send().await.map_err(|_| "Não foi possível calcular o resumo.".to_string())?;
    if !response.status().is_success() { return Err(format!("Não foi possível calcular o resumo (HTTP {}).", response.status().as_u16())); }
    Ok(response.headers().get("content-range").and_then(|v| v.to_str().ok()).and_then(|v| v.rsplit('/').next()).and_then(|v| v.parse().ok()).unwrap_or(0))
}

#[tauri::command]
async fn app_state(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    if state.session.lock().map_err(|_| "Sessão indisponível.".to_string())?.is_none() {
        if let Ok(token) = keyring().and_then(|entry| entry.get_password().map_err(|_| "".into())) {
            match refresh_session(&state.client, &token).await {
                Ok(restored) => *state.session.lock().map_err(|_| "Sessão indisponível.".to_string())? = Some(restored),
                Err(_) => clear_keyring()
            }
        }
    }
    let owner = state.session.lock().map_err(|_| "Sessão indisponível.".to_string())?.clone();
    Ok(json!({"authenticated": owner.is_some(), "user": owner.map(|s| s.user), "version": env!("CARGO_PKG_VERSION")}))
}

#[tauri::command]
async fn login(credentials: Credentials, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    if credentials.password.is_empty() || credentials.password.len() > 256 { return Err("Informe sua senha.".into()); }
    let email = resolve_email(&state.client, &credentials.identifier).await?;
    let logged = password_session(&state.client, &email, &credentials.password).await?;
    if credentials.remember { keyring()?.set_password(&logged.refresh_token).map_err(|_| "Não foi possível proteger a sessão neste computador.".to_string())?; } else { clear_keyring(); }
    let user = logged.user.clone();
    *state.session.lock().map_err(|_| "Sessão indisponível.".to_string())? = Some(logged);
    Ok(json!({"authenticated": true, "user": user}))
}

#[tauri::command]
fn logout(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    clear_keyring();
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
    let profiles = get(&state.client, &format!("/rest/v1/perfis?select=id,nome,slug,avatar_url,banner_url,status_personalizado&id=eq.{user}&limit=1"), token).await?;
    let profile = profiles.as_array().and_then(|v| v.first()).cloned().unwrap_or_else(|| json!({"id":user,"nome":"Minha BatCaverna"}));
    let recent = get(&state.client, &format!("{games}&select=id,nome,status,capa,horas,plataforma&order=updated_at.desc,id.desc&limit=8"), token).await?;
    let updates = get(&state.client, &format!("/rest/v1/itens?select=id,nome,categoria,status,updated_at&user_id=eq.{user}&order=updated_at.desc,id.desc&limit=6"), token).await?;
    Ok(json!({"counts":{"totalGames":total_games,"playing":playing,"finished":finished,"totalMedia":total_media,"unread":unread},"profile":profile,"recent":recent,"updates":updates}))
}

#[tauri::command]
async fn library(category: String, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session = current(&state).await?; let user = &session.user.id;
    let extra = match category.as_str() { "jogos" => "categoria=eq.jogos", "filmes" => "categoria=eq.filmes&or=(tipo.eq.filme,tipo.is.null)", "series" => "categoria=eq.filmes&tipo=eq.serie", "animes" => "categoria=eq.filmes&tipo=eq.anime", _ => return Err("Categoria inválida.".into()) };
    get(&state.client, &format!("/rest/v1/itens?select=id,nome,categoria,tipo,status,capa,nota,horas,plataforma,onde,updated_at&user_id=eq.{user}&{extra}&order=updated_at.desc,id.desc&limit=200"), &session.access_token).await
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
async fn publish(text: String, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let clean = text.trim(); if clean.is_empty() || clean.chars().count() > 500 { return Err("Escreva entre 1 e 500 caracteres.".into()); }
    let session = current(&state).await?;
    value(state.client.post(format!("{SUPABASE_URL}/rest/v1/clt_posts?select=id,user_id,texto,midias,created_at")).header("apikey", SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type", "application/json").header("prefer", "return=representation").json(&json!({"user_id":session.user.id,"texto":clean,"midias":[]})).send().await.map_err(|_| "Não foi possível enviar a publicação.".to_string())?).await
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
async fn notifications(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session = current(&state).await?;
    get(&state.client, &format!("/rest/v1/notificacoes?select=id,tipo,mensagem,actor_id,referencia_id,read,created_at&destinatario_id=eq.{}&order=created_at.desc,id.desc&limit=100", session.user.id), &session.access_token).await
}

#[tauri::command]
async fn mark_notifications_read(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session = current(&state).await?;
    value(state.client.patch(format!("{SUPABASE_URL}/rest/v1/notificacoes?destinatario_id=eq.{}&read=eq.false", session.user.id)).header("apikey", SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type", "application/json").header("prefer", "return=minimal").json(&json!({"read":true})).send().await.map_err(|_| "Não foi possível atualizar as notificações.".to_string())?).await
}

fn local_url(url: &tauri::Url) -> bool { (url.scheme() == "tauri" && url.host_str() == Some("localhost")) || (url.scheme() == "http" && url.host_str() == Some("tauri.localhost") && url.port().is_none()) }

fn main() {
    let client = reqwest::Client::builder().redirect(reqwest::redirect::Policy::none()).build().expect("Cliente HTTPS");
    tauri::Builder::default().manage(AppState { client, session: Mutex::new(None) })
        .invoke_handler(tauri::generate_handler![app_state, login, logout, dashboard, library, feed, publish, friends, notifications, mark_notifications_read])
        .setup(|app| {
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into())).title("BatCaverna CLT").inner_size(1360.,860.).min_inner_size(980.,640.).on_navigation(local_url).build()?;
            use tauri::{menu::{Menu,MenuItem}, tray::TrayIconBuilder};
            let show=MenuItem::with_id(app,"show","Abrir BatCaverna",true,None::<&str>)?; let hide=MenuItem::with_id(app,"hide","Ocultar na bandeja",true,None::<&str>)?; let quit=MenuItem::with_id(app,"quit","Sair",true,None::<&str>)?;
            let menu=Menu::with_items(app,&[&show,&hide,&quit])?; let mut tray=TrayIconBuilder::new().tooltip("BatCaverna CLT").menu(&menu).on_menu_event(|app,event| match event.id.as_ref(){"show"=>if let Some(w)=app.get_webview_window("main"){let _=w.show();let _=w.unminimize();let _=w.set_focus();},"hide"=>if let Some(w)=app.get_webview_window("main"){let _=w.hide();},"quit"=>app.exit(0),_=>{}});
            if let Some(icon)=app.default_window_icon(){tray=tray.icon(icon.clone());} tray.build(app)?; Ok(())
        }).run(tauri::generate_context!()).expect("Erro ao iniciar BatCaverna CLT");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn direct_backend_only() { assert!(SUPABASE_URL.starts_with("https://")); assert!(SUPABASE_URL.ends_with(".supabase.co")); }
}

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{collections::HashMap, sync::Mutex, time::{Duration, SystemTime, UNIX_EPOCH}};
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

#[derive(Deserialize)]
struct RegisterInput { name: String, username: String, email: String, password: String }

#[derive(Deserialize)]
struct PasswordInput { current: String, password: String }

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProfileInput { name: String, bio: String, banner: String, status: String, steam_id: String }

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
struct MessageInput { friend_id: String, text: String }

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct InviteInput { user_id: String }

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct InviteReplyInput { invite_id: String, accept: bool }

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
    Ok(json!({"message":"Conta criada. Confira seu e-mail para confirmar o cadastro."}))
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
    password_session(&state.client,&session.user.email,&input.current).await.map_err(|_|"A senha atual está incorreta.".to_string())?;
    value(state.client.put(format!("{SUPABASE_URL}/auth/v1/user")).header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type","application/json").json(&json!({"password":input.password})).send().await.map_err(|_|"Não foi possível alterar a senha.".to_string())?).await
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
    let profiles = get(&state.client, &format!("/rest/v1/perfis?select=id,nome,slug,avatar_url,banner_url,status_personalizado,bio,steam_id,fundo&id=eq.{user}&limit=1"), token).await?;
    let profile = profiles.as_array().and_then(|v| v.first()).cloned().unwrap_or_else(|| json!({"id":user,"nome":"Minha BatCaverna"}));
    let recent = get(&state.client, &format!("{games}&select=id,nome,status,capa,horas,plataforma&order=updated_at.desc,id.desc&limit=8"), token).await?;
    let updates = get(&state.client, &format!("/rest/v1/itens?select=id,nome,categoria,status,updated_at&user_id=eq.{user}&order=updated_at.desc,id.desc&limit=6"), token).await?;
    Ok(json!({"counts":{"totalGames":total_games,"playing":playing,"finished":finished,"totalMedia":total_media,"unread":unread},"profile":profile,"email":session.user.email,"recent":recent,"updates":updates}))
}

#[tauri::command]
async fn profile(user_id: Option<String>, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session=current(&state).await?; let id=user_id.unwrap_or_else(||session.user.id.clone()); let id=safe_id(&id)?;
    let own=id==session.user.id;
    let fields=if own{"id,nome,slug,avatar_url,banner_url,status_personalizado,bio,steam_id,fundo"}else{"id,nome,slug,avatar_url"};
    let source=if own{"perfis"}else{"perfis_publicos_clt"};
    let rows=get(&state.client,&format!("/rest/v1/{source}?select={fields}&id=eq.{id}&limit=1"),&session.access_token).await?;
    let mut p=rows.as_array().and_then(|x|x.first()).cloned().ok_or_else(||"Perfil não encontrado ou privado.".to_string())?;
    if !own {
        if let Ok(detail)=rpc(&state.client,"perfil_detalhes_autorizado",json!({"p_perfil_id":id}),&session.access_token).await {
            if let Some(row)=detail.as_array().and_then(|x|x.first()){if let Some(obj)=p.as_object_mut(){if let Some(f)=row.get("fundo"){obj.insert("fundo".into(),f.clone());}}}
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
    let result=rpc(&state.client,"salvar_personalizacao_perfil_clt",json!({"p_nome":name,"p_bio":if bio.is_empty(){Value::Null}else{json!(bio)},"p_banner_url":if banner.is_empty(){Value::Null}else{json!(banner)},"p_status":status,"p_titulo_destaque_nivel":0,"p_jogos_destaque":[],"p_conquistas_destaque":[]}),&session.access_token).await?;
    let steam=input.steam_id.trim();
    if steam.is_empty()||steam.bytes().all(|b|b.is_ascii_digit()){
        let value=if steam.is_empty(){Value::Null}else{json!(steam)};
        let _=state.client.patch(format!("{SUPABASE_URL}/rest/v1/perfis?id=eq.{}",session.user.id)).header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type","application/json").json(&json!({"steam_id":value})).send().await;
    }
    Ok(result)
}

#[tauri::command]
async fn library(category: String, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session = current(&state).await?; let user = &session.user.id;
    if !matches!(category.as_str(), "jogos"|"filmes"|"series"|"animes") { return Err("Categoria inválida.".into()); }
    let source = if category == "jogos" { "jogos" } else { "filmes" };
    let rows = get(&state.client, &format!("/rest/v1/itens?select=id,nome,categoria,tipo,status,capa,nota,horas,plataforma,loja,onde,ano,generos,review,updated_at&user_id=eq.{user}&categoria=eq.{source}&order=updated_at.desc,id.desc&limit=500"), &session.access_token).await?;
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
    for key in ["tipo","status","capa","nota","horas","plataforma","loja","onde","ano","generos","review"] {
        if let Some(value) = object.get(key) { row.insert(key.into(), value.clone()); }
    }
    let id = object.get("id").and_then(Value::as_str).map(str::to_owned).or_else(|| object.get("id").and_then(Value::as_i64).map(|v| v.to_string()));
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

#[tauri::command]
async fn media_url(url: String, state: tauri::State<'_, AppState>) -> Result<String, String> {
    if !url.starts_with(SUPABASE_URL){return if url.starts_with("https://"){Ok(url)}else{Err("URL de mídia inválida.".into())};}
    let marker="/storage/v1/object/public/"; let Some(rest)=url.split(marker).nth(1) else{return Ok(url)};
    let mut parts=rest.splitn(2,'/'); let bucket=parts.next().unwrap_or(""); let path=parts.next().unwrap_or("");
    if !matches!(bucket,"avatars"|"group-avatars"|"feed-media"|"chat-media"|"group-chat-media") || path.is_empty(){return Err("Mídia inválida.".into());}
    let session=current(&state).await?;
    let signed=value(state.client.post(format!("{SUPABASE_URL}/storage/v1/object/sign/{bucket}/{path}")).header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type","application/json").json(&json!({"expiresIn":3600})).send().await.map_err(|_|"Não foi possível abrir a mídia.".to_string())?).await?;
    let value=signed.get("signedURL").or_else(||signed.get("signedUrl")).and_then(Value::as_str).ok_or_else(||"Mídia indisponível.".to_string())?;
    Ok(if value.starts_with("http"){value.to_string()}else{format!("{SUPABASE_URL}/storage/v1{value}")})
}

#[tauri::command]
async fn bright_api(input: Value, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session=current(&state).await?;
    let response=state.client.post(format!("{SUPABASE_URL}/functions/v1/bright-api")).header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type","application/json").json(&input).send().await.map_err(|_|"Não foi possível consultar a Steam.".to_string())?;
    value(response).await
}

#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    if !(url.starts_with("https://store.steampowered.com/")||url.starts_with("https://store.epicgames.com/")){return Err("Link externo não permitido.".into());}
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
    if let Ok(rows)=primary { return Ok(rows); }
    let q=urlencoding::encode(query);
    get(&state.client,&format!("/rest/v1/perfis_publicos_clt?select=id,nome,slug,avatar_url,codigo_convite&or=(slug.ilike.*{q}*,nome.ilike.*{q}*,codigo_convite.eq.{q})&id=neq.{}&limit=30",session.user.id),&session.access_token).await
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
    get(&state.client,&format!("/rest/v1/clt_chat_messages?select=id,remetente_id,destinatario_id,texto,midia_url,created_at,lida&or=(and(remetente_id.eq.{me},destinatario_id.eq.{friend}),and(remetente_id.eq.{friend},destinatario_id.eq.{me}))&order=created_at.asc&limit=300"),&session.access_token).await
}

#[tauri::command]
async fn send_message(input: MessageInput, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session=current(&state).await?; let friend=safe_id(&input.friend_id)?; let text=input.text.trim();
    if text.is_empty() || text.chars().count()>2000 { return Err("Escreva uma mensagem de até 2.000 caracteres.".into()); }
    value(state.client.post(format!("{SUPABASE_URL}/rest/v1/clt_chat_messages?select=id,remetente_id,destinatario_id,texto,midia_url,created_at,lida"))
        .header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type","application/json").header("prefer","return=representation")
        .json(&json!({"remetente_id":session.user.id,"destinatario_id":friend,"texto":text})).send().await.map_err(|_| "Não foi possível enviar a mensagem.".to_string())?).await
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
        .timeout(Duration::from_secs(25))
        .build()
        .expect("Cliente HTTPS");
    tauri::Builder::default().manage(AppState { client, session: Mutex::new(None) })
        .invoke_handler(tauri::generate_handler![app_state, login, register, recover_password, change_password, logout, dashboard, profile, update_profile, library, save_item, delete_item, feed, social_meta, publish, upload_media, media_url, bright_api, open_external, toggle_like, add_comment, friends, search_people, send_friend_invite, chat_messages, send_message, notifications, mark_notifications_read, respond_friend_invite, journey_stats])
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

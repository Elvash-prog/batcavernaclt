#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use base64::{engine::general_purpose::STANDARD, Engine};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, time::Duration};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

const SERVER: &str = "https://batcavernaclt.gamersclt.workers.dev";
const LIMIT: usize = 26 * 1024 * 1024;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApiRequest { path: String, method: String, headers: HashMap<String, String>, body_base64: Option<String> }
#[derive(Serialize)]
struct ApiResponse { status: u16, headers: HashMap<String, String>, body: String }

fn allowed_path(path: &str, method: &str) -> bool {
    if path.len() > 4096 || !path.starts_with('/') || path.starts_with("//") || path.contains('\\') || path.contains('#') { return false; }
    let p = path.split('?').next().unwrap_or("");
    match method {
        "GET" => p == "/config.js" || p == "/api/steam-free"
            || p.strip_prefix("/api/steam-cover/").is_some_and(|id| !id.is_empty() && id.len() <= 10 && id.bytes().all(|b| b.is_ascii_digit()))
            || ((p.starts_with("/api/catalog/rawg/") || p.starts_with("/api/catalog/tmdb/")) && !p.contains("..") && !p.contains('%')),
        "POST" => matches!(p, "/api/account/login" | "/api/media/upload" | "/api/media/prepare" | "/api/media/video-review"),
        _ => false,
    }
}
fn local_url(url: &tauri::Url) -> bool {
    (url.scheme() == "tauri" && url.host_str() == Some("localhost"))
        || (url.scheme() == "http" && url.host_str() == Some("tauri.localhost") && url.port().is_none())
}
fn require_local(window: &tauri::WebviewWindow) -> Result<(), String> {
    if window.label() == "main" && window.url().map(|u| local_url(&u)).unwrap_or(false) { Ok(()) }
    else { Err("Origem não permitida.".into()) }
}

#[tauri::command]
async fn backend_request(window: tauri::WebviewWindow, client: tauri::State<'_, reqwest::Client>, request: ApiRequest) -> Result<ApiResponse, String> {
    require_local(&window)?;
    if !allowed_path(&request.path, &request.method) { return Err("Rota não permitida.".into()); }
    let method = reqwest::Method::from_bytes(request.method.as_bytes()).map_err(|_| "Método inválido.")?;
    let mut outgoing = client.request(method, format!("{SERVER}{}", request.path));
    for (key, value) in request.headers {
        if matches!(key.to_ascii_lowercase().as_str(), "authorization" | "content-type" | "accept") && value.len() <= 8192 {
            outgoing = outgoing.header(key, value);
        }
    }
    if let Some(encoded) = request.body_base64 {
        if encoded.len() > (LIMIT * 4 / 3 + 4) { return Err("Arquivo muito grande.".into()); }
        let body = STANDARD.decode(encoded).map_err(|_| "Envio inválido.")?;
        if body.len() > LIMIT { return Err("Arquivo muito grande.".into()); }
        outgoing = outgoing.body(body);
    }
    // Same public endpoints and server-side authentication; no privileged keys or CORS changes.
    let mut response = outgoing.send().await.map_err(|_| "Não foi possível conectar. Confira sua internet e tente novamente.")?;
    if response.status().is_redirection() { return Err("Redirecionamento inesperado do servidor.".into()); }
    let status = response.status().as_u16();
    let headers = response.headers().iter().filter(|(k,_)| matches!(k.as_str(),"content-type"|"retry-after"))
        .filter_map(|(k,v)| v.to_str().ok().map(|v|(k.to_string(),v.to_string()))).collect();
    let mut bytes = Vec::new();
    while let Some(chunk) = response.chunk().await.map_err(|_| "Resposta interrompida.")? {
        if bytes.len() + chunk.len() > 5 * 1024 * 1024 { return Err("Resposta muito grande.".into()); }
        bytes.extend_from_slice(&chunk);
    }
    Ok(ApiResponse { status, headers, body: String::from_utf8(bytes).map_err(|_| "Resposta inválida.")? })
}

#[tauri::command]
fn open_external(window: tauri::WebviewWindow, url: String) -> Result<(), String> {
    require_local(&window)?;
    let parsed = tauri::Url::parse(&url).map_err(|_| "Link inválido.")?;
    if parsed.scheme() != "https" || parsed.host_str().is_none() || !parsed.username().is_empty() || parsed.password().is_some() {
        return Err("Somente links HTTPS são permitidos.".into());
    }
    open::that_detached(parsed.as_str()).map_err(|_| "Não foi possível abrir o navegador.".into())
}

fn main() {
    tauri::Builder::default()
        .manage(reqwest::Client::builder().timeout(Duration::from_secs(60)).redirect(reqwest::redirect::Policy::none()).build().expect("Cliente HTTPS"))
        .invoke_handler(tauri::generate_handler![backend_request, open_external])
        .setup(|app| {
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("BatCaverna CLT").inner_size(1360., 860.).min_inner_size(980., 640.)
                .on_navigation(local_url).build()?;
            use tauri::{menu::{Menu, MenuItem}, tray::TrayIconBuilder};
            let show = MenuItem::with_id(app, "show", "Abrir BatCaverna", true, None::<&str>)?;
            let hide = MenuItem::with_id(app, "hide", "Ocultar na bandeja", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Sair", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &hide, &quit])?;
            let mut tray = TrayIconBuilder::new().tooltip("BatCaverna CLT").menu(&menu).on_menu_event(|app,event| {
                match event.id.as_ref() {
                    "show" => if let Some(w) = app.get_webview_window("main") { let _ = w.show(); let _ = w.unminimize(); let _ = w.set_focus(); },
                    "hide" => if let Some(w) = app.get_webview_window("main") { let _ = w.hide(); },
                    "quit" => app.exit(0), _ => {}
                }
            });
            if let Some(icon) = app.default_window_icon() { tray = tray.icon(icon.clone()); }
            tray.build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!()).expect("Erro ao iniciar BatCaverna CLT");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn proxy_scope() {
        assert!(allowed_path("/config.js", "GET"));
        assert!(allowed_path("/api/account/login", "POST"));
        assert!(allowed_path("/api/catalog/tmdb/search/movie?query=batman", "GET"));
        assert!(!allowed_path("https://evil.test/api/account/login", "POST"));
        assert!(!allowed_path("//evil.test/config.js", "GET"));
        assert!(!allowed_path("/api/catalog/tmdb/../../config.js", "GET"));
        assert!(!allowed_path("/api/catalog/tmdb/%2e%2e/config.js", "GET"));
        assert!(!allowed_path("/api/account/login", "DELETE"));
        assert!(!allowed_path("/api/steam-cover/../../config.js", "GET"));
    }
}

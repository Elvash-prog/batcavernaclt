use super::*;
use std::collections::HashSet;
use tauri_plugin_notification::NotificationExt;

#[derive(Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct DesktopPreferences { pub background: bool, pub notifications: bool }
impl Default for DesktopPreferences {
    fn default() -> Self { Self { background: true, notifications: true } }
}
#[derive(Default)]
pub struct DesktopState(pub Mutex<DesktopPreferences>);

pub fn show_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show(); let _ = window.unminimize(); let _ = window.set_focus();
    }
}
pub fn background_enabled(app: &tauri::AppHandle) -> bool {
    app.state::<DesktopState>().inner().0.lock().map(|p| p.background).unwrap_or(true)
}
pub fn initialize(app: &tauri::AppHandle) -> Result<(), String> {
    let path = app.path().app_config_dir().map_err(|_| "Configurações do Windows indisponíveis.")?.join("desktop-preferences.json");
    if let Ok(bytes) = std::fs::read(path) {
        if let Ok(prefs) = serde_json::from_slice::<DesktopPreferences>(&bytes) {
            *app.state::<DesktopState>().inner().0.lock().map_err(|_| "Configurações indisponíveis.")? = prefs;
        }
    }
    start_notifications(app.clone()); Ok(())
}
#[tauri::command]
pub fn desktop_preferences(input: Option<DesktopPreferences>, app: tauri::AppHandle) -> Result<DesktopPreferences, String> {
    let state = app.state::<DesktopState>();
    if let Some(prefs) = input {
        let dir = app.path().app_config_dir().map_err(|_| "Configurações do Windows indisponíveis.")?;
        std::fs::create_dir_all(&dir).map_err(|_| "Não foi possível salvar as configurações.")?;
        let bytes = serde_json::to_vec(&prefs).map_err(|_| "Configurações inválidas.")?;
        std::fs::write(dir.join("desktop-preferences.json"), bytes).map_err(|_| "Não foi possível salvar as configurações.")?;
        *state.inner().0.lock().map_err(|_| "Configurações indisponíveis.")? = prefs;
    }
    let prefs = state.inner().0.lock().map_err(|_| "Configurações indisponíveis.")?.clone(); Ok(prefs)
}
#[tauri::command]
pub fn test_windows_notification(app: tauri::AppHandle) -> Result<(), String> {
    app.notification().builder().title("BatCaverna CLT").body("As notificações do Windows estão funcionando. Ao fechar a janela, o programa pode continuar na bandeja.").show()
        .map_err(|_| "O Windows não exibiu a notificação. Confira as permissões de notificações do aplicativo.")
}
fn notice_id(n: &Value) -> Option<String> { match &n["id"] { Value::String(id) => Some(id.clone()), Value::Number(id) => Some(id.to_string()), _ => None } }
fn fresh_notifications(rows: &[Value], seen: &HashSet<String>, initialized: bool) -> Vec<Value> {
    if !initialized { return Vec::new(); }
    rows.iter().filter(|n| n["read"].as_bool() != Some(true) && notice_id(n).is_some_and(|id| !seen.contains(&id))).cloned().collect()
}
fn start_notifications(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut owner = String::new(); let mut initialized = false; let mut seen = HashSet::new();
        let mut interval = tokio::time::interval(Duration::from_secs(15));
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
        loop {
            interval.tick().await;
            let state = app.state::<AppState>();
            let Ok(session) = current(&state).await else { owner.clear(); initialized = false; seen.clear(); continue; };
            if owner != session.user.id { owner = session.user.id.clone(); initialized = false; seen.clear(); }
            let Ok(data) = get(&state.client, &format!("/rest/v1/notificacoes?select=id,mensagem,read,created_at&destinatario_id=eq.{owner}&order=created_at.desc,id.desc&limit=100"), &session.access_token).await else { continue; };
            let same_owner = state.session.lock().ok().and_then(|s| s.as_ref().map(|s| s.user.id.clone())).as_deref() == Some(owner.as_str());
            if !same_owner { continue; }
            let Some(rows) = data.as_array() else { continue; };
            let fresh = fresh_notifications(rows, &seen, initialized);
            let current_ids: HashSet<String> = rows.iter().filter_map(notice_id).collect();
            seen.extend(current_ids.iter().cloned()); if seen.len() > 2000 { seen.retain(|id| current_ids.contains(id)); }
            initialized = true;
            let enabled = app.state::<DesktopState>().inner().0.lock().map(|p| p.notifications).unwrap_or(false);
            let focused = app.get_webview_window("main").is_some_and(|w| w.is_visible().unwrap_or(false) && w.is_focused().unwrap_or(false));
            if !enabled || focused { continue; }
            for notice in fresh.iter().take(4).rev() {
                let body: String = notice["mensagem"].as_str().unwrap_or("Você recebeu uma nova atividade.").chars().take(240).collect();
                let _ = app.notification().builder().title("BatCaverna CLT").body(body).show();
            }
            if fresh.len() > 4 { let _ = app.notification().builder().title("BatCaverna CLT").body(format!("Você tem {} novas atividades. Abra a central de notificações.", fresh.len())).show(); }
        }
    });
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn notification_ids_accept_database_bigints() {
        let rows = vec![json!({"id":12,"read":false}), json!({"id":13,"read":false}), json!({"id":14,"read":true})];
        let seen = HashSet::from(["12".to_string()]);
        assert_eq!(fresh_notifications(&rows, &seen, true), vec![json!({"id":13,"read":false})]);
    }
    #[test] fn notifications_skip_baseline_read_and_seen() {
        let rows = vec![json!({"id":"old","read":false}), json!({"id":"read","read":true}), json!({"id":"new","read":false})];
        let seen = HashSet::from(["old".to_string()]);
        assert!(fresh_notifications(&rows, &seen, false).is_empty());
        assert_eq!(fresh_notifications(&rows, &seen, true), vec![json!({"id":"new","read":false})]);
    }
}

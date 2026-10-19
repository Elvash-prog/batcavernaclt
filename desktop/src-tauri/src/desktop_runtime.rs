use super::*;
use std::collections::{HashMap, HashSet};
use std::io::Write;
use std::path::PathBuf;
use std::sync::LazyLock;
use std::time::Instant;
use tauri_plugin_notification::NotificationExt;

const DIAGNOSTIC_LIMIT: u64 = 1024 * 1024;
#[derive(Default)]
struct NotificationMemory {
    ids: HashSet<String>,
    fingerprints: HashMap<String, Instant>,
}
static NOTIFICATION_MEMORY: LazyLock<Mutex<NotificationMemory>> = LazyLock::new(|| Mutex::new(NotificationMemory::default()));

#[derive(Deserialize)]
pub struct DiagnosticInput { pub level: String, pub stage: String, pub message: String }

fn clean_log(value: &str, limit: usize) -> String {
    let filtered: String = value.chars().filter(|c| !c.is_control() || *c == ' ').take(limit).collect();
    filtered.split_whitespace().map(|part| {
        if part.contains('@') && part.contains('.') { "[email]".to_string() }
        else if part.starts_with("eyJ") || part.len() > 180 { "[dado-protegido]".to_string() }
        else { part.to_string() }
    }).collect::<Vec<_>>().join(" ")
}
fn diagnostic_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Ok(path) = std::env::var("BATCAVERNA_SMOKE_LOG") { if !path.trim().is_empty() { return Ok(PathBuf::from(path)); } }
    Ok(app.path().app_log_dir().map_err(|_| "Pasta de diagnóstico indisponível.")?.join("batcaverna.log"))
}
fn append_diagnostic(app: &tauri::AppHandle, level: &str, stage: &str, message: &str) -> Result<(), String> {
    let path = diagnostic_path(app)?;
    if let Some(parent) = path.parent() { std::fs::create_dir_all(parent).map_err(|_| "Não foi possível preparar o diagnóstico.")?; }
    if std::fs::metadata(&path).map(|m| m.len() >= DIAGNOSTIC_LIMIT).unwrap_or(false) {
        let previous = path.with_extension("previous.log"); let _ = std::fs::remove_file(&previous); let _ = std::fs::rename(&path, previous);
    }
    let mut file = std::fs::OpenOptions::new().create(true).append(true).open(path).map_err(|_| "Não foi possível gravar o diagnóstico.")?;
    writeln!(file, "{} [{}] {} — {}", chrono::Utc::now().to_rfc3339(), clean_log(level, 16).to_uppercase(), clean_log(stage, 80), clean_log(message, 900)).map_err(|_| "Não foi possível gravar o diagnóstico.".to_string())
}

#[tauri::command]
pub fn client_log(input: DiagnosticInput, app: tauri::AppHandle) -> Result<(), String> { append_diagnostic(&app, &input.level, &input.stage, &input.message) }
#[tauri::command]
pub fn diagnostic_status(app: tauri::AppHandle) -> Result<Value, String> {
    let path = diagnostic_path(&app)?; let size = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
    Ok(json!({"path":path.to_string_lossy(),"size":size}))
}
#[tauri::command]
pub fn diagnostic_clear(app: tauri::AppHandle) -> Result<(), String> {
    let path = diagnostic_path(&app)?; let _ = std::fs::remove_file(path.with_extension("previous.log"));
    std::fs::write(&path, "").map_err(|_| "Não foi possível limpar o diagnóstico.".to_string())?;
    append_diagnostic(&app, "INFO", "DIAGNOSTIC_CLEAR", "Histórico limpo pelo usuário")
}
#[tauri::command]
pub fn diagnostic_export(app: tauri::AppHandle) -> Result<Value, String> {
    append_diagnostic(&app, "INFO", "DIAGNOSTIC_EXPORT", "Diagnóstico exportado pelo usuário")?;
    let source = diagnostic_path(&app)?; let downloads = app.path().download_dir().map_err(|_| "Pasta Downloads indisponível.")?;
    std::fs::create_dir_all(&downloads).map_err(|_| "Pasta Downloads indisponível.")?;
    let name = format!("BatCaverna-Diagnostico-{}.txt", chrono::Local::now().format("%Y%m%d-%H%M%S")); let target = downloads.join(name);
    let logs = std::fs::read_to_string(source).unwrap_or_else(|_| "Nenhum evento registrado.\n".to_string());
    let report = format!("BatCaverna CLT {}\nSistema: {} {}\nGerado: {}\n\n{}", env!("CARGO_PKG_VERSION"), std::env::consts::OS, std::env::consts::ARCH, chrono::Local::now().to_rfc3339(), logs);
    std::fs::write(&target, report).map_err(|_| "Não foi possível exportar o diagnóstico.".to_string())?; let _ = open::that(&downloads);
    Ok(json!({"path":target.to_string_lossy()}))
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct DesktopPreferences { pub background: bool, pub notifications: bool, pub sound: bool, pub autostart: bool, pub start_minimized: bool }
impl Default for DesktopPreferences {
    fn default() -> Self { Self { background: true, notifications: true, sound: true, autostart: false, start_minimized: false } }
}
#[derive(Default)]
pub struct DesktopState(pub Mutex<DesktopPreferences>);

pub fn show_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show(); let _ = window.unminimize(); let _ = window.set_focus();
    }
}
pub fn start_minimized(app: &tauri::AppHandle) -> bool {
    app.state::<DesktopState>().inner().0.lock().map(|p| p.start_minimized).unwrap_or(false)
}
fn show_notification(app: &tauri::AppHandle, body: &str) -> Result<(), String> {
    let sound=app.state::<DesktopState>().inner().0.lock().map(|p| p.sound).unwrap_or(false);
    let mut notice=app.notification().builder().title("BatCaverna CLT").body(body);
    // notify-rust maps the Windows sound enum name "Default" to the OS toast sound.
    // Omitting sound produces a silent Windows toast. No extra player avoids double audio.
    if sound { notice=notice.sound("Default"); }
    notice.show().map_err(|_|"O Windows não exibiu a notificação. Confira as permissões do aplicativo.".into())
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
    // O diagnóstico ajuda a explicar falhas, mas nunca pode impedir o aplicativo de abrir.
    let _ = append_diagnostic(app, "INFO", "APP_START", &format!("Inicialização nativa {}", env!("CARGO_PKG_VERSION")));
    start_notifications(app.clone()); Ok(())
}
#[tauri::command]
pub fn desktop_preferences(input: Option<DesktopPreferences>, app: tauri::AppHandle) -> Result<DesktopPreferences, String> {
    let state = app.state::<DesktopState>();
    if let Some(prefs) = input {
        let dir = app.path().app_config_dir().map_err(|_| "Configurações do Windows indisponíveis.")?;
        std::fs::create_dir_all(&dir).map_err(|_| "Não foi possível salvar as configurações.")?;
        let bytes = serde_json::to_vec(&prefs).map_err(|_| "Configurações inválidas.")?;
        let previous=crate::windows_startup::snapshot()?;
        crate::windows_startup::set(prefs.autostart)?;
        if std::fs::write(dir.join("desktop-preferences.json"), bytes).is_err() {
            crate::windows_startup::restore(previous.as_deref())?;
            return Err("Não foi possível salvar as configurações.".into());
        }
        *state.inner().0.lock().map_err(|_| "Configurações indisponíveis.")? = prefs;
    }
    let mut prefs = state.inner().0.lock().map_err(|_| "Configurações indisponíveis.")?.clone(); prefs.autostart=crate::windows_startup::enabled()?; Ok(prefs)
}
#[tauri::command]
pub fn test_windows_notification(app: tauri::AppHandle) -> Result<(), String> {
    show_notification(&app,"Teste de notificação da BatCaverna CLT.")
}
fn notice_id(n: &Value) -> Option<String> { match &n["id"] { Value::String(id) => Some(id.clone()), Value::Number(id) => Some(id.to_string()), _ => None } }
fn notice_key(owner: &str, n: &Value) -> Option<String> { notice_id(n).map(|id| format!("{owner}:{id}")) }
fn notice_fingerprint(owner: &str, n: &Value) -> String {
    let value = |key: &str| n[key].as_str().unwrap_or("").trim().to_lowercase();
    format!("{owner}|{}|{}|{}|{}", value("tipo"), value("referencia_id"), value("actor_id"), value("mensagem"))
}
fn register_notification(owner: &str, notice: &Value) -> bool {
    let Some(key) = notice_key(owner, notice) else { return false; };
    let fingerprint = notice_fingerprint(owner, notice);
    NOTIFICATION_MEMORY.lock().map(|mut memory| {
        memory.fingerprints.retain(|_, seen_at| seen_at.elapsed() < Duration::from_secs(12));
        if memory.ids.len() >= 2000 { memory.ids.retain(|value| value.starts_with(&format!("{owner}:"))); if memory.ids.len() >= 2000 { memory.ids.clear(); } }
        let id_is_new = memory.ids.insert(key);
        let fingerprint_is_new = !memory.fingerprints.contains_key(&fingerprint);
        memory.fingerprints.insert(fingerprint, Instant::now());
        id_is_new && fingerprint_is_new
    }).unwrap_or(false)
}
fn fresh_notifications(rows: &[Value], seen: &HashSet<String>, initialized: bool) -> Vec<Value> {
    if !initialized { return Vec::new(); }
    rows.iter().filter(|n| n["read"].as_bool() != Some(true) && notice_id(n).is_some_and(|id| !seen.contains(&id))).cloned().collect()
}
pub fn realtime_notification(app: &tauri::AppHandle, owner: &str, notice: &Value) {
    if notice["read"].as_bool() == Some(true) { return; }
    if !register_notification(owner, notice) { return; }
    let enabled = app.state::<DesktopState>().inner().0.lock().map(|p| p.notifications).unwrap_or(false);
    let focused = app.get_webview_window("main").is_some_and(|w| w.is_visible().unwrap_or(false) && w.is_focused().unwrap_or(false));
    if !enabled || focused { return; }
    let body: String = notice["mensagem"].as_str().unwrap_or("Você recebeu uma nova atividade.").chars().take(240).collect();
    let _ = show_notification(&app, &body);
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
            let Ok(data) = get(&state.client, &format!("/rest/v1/notificacoes?select=id,mensagem,tipo,referencia_id,actor_id,read,created_at&destinatario_id=eq.{owner}&order=created_at.desc,id.desc&limit=100"), &session.access_token).await else { continue; };
            let same_owner = state.session.lock().ok().and_then(|s| s.as_ref().map(|s| s.user.id.clone())).as_deref() == Some(owner.as_str());
            if !same_owner { continue; }
            let Some(rows) = data.as_array() else { continue; };
            if let Ok(memory) = NOTIFICATION_MEMORY.lock() {
                seen.extend(rows.iter().filter(|n| notice_key(&owner, n).is_some_and(|key| memory.ids.contains(&key))).filter_map(notice_id));
            }
            let fresh = fresh_notifications(rows, &seen, initialized);
            let current_ids: HashSet<String> = rows.iter().filter_map(notice_id).collect();
            seen.extend(current_ids.iter().cloned()); if seen.len() > 2000 { seen.retain(|id| current_ids.contains(id)); }
            initialized = true;
            let enabled = app.state::<DesktopState>().inner().0.lock().map(|p| p.notifications).unwrap_or(false);
            let focused = app.get_webview_window("main").is_some_and(|w| w.is_visible().unwrap_or(false) && w.is_focused().unwrap_or(false));
            if !enabled || focused { continue; }
            for notice in fresh.iter().take(4).rev() {
                if !register_notification(&owner, notice) { continue; }
                let body: String = notice["mensagem"].as_str().unwrap_or("Você recebeu uma nova atividade.").chars().take(240).collect();
                let _ = show_notification(&app, &body);
            }
            if fresh.len() > 4 { let _ = show_notification(&app, &format!("Você tem {} novas atividades. Abra a central de notificações.", fresh.len())); }
        }
    });
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn old_preferences_keep_notifications_audible_without_enabling_startup() {
        let p:DesktopPreferences=serde_json::from_str(r#"{"background":false,"notifications":true}"#).unwrap();
        assert!(p.sound);assert!(!p.autostart);assert!(!p.start_minimized);assert!(!p.background);
    }
    #[test] fn startup_and_sound_choices_survive_serialization() {
        let p=DesktopPreferences{sound:false,autostart:true,start_minimized:true,..Default::default()};
        let next:DesktopPreferences=serde_json::from_slice(&serde_json::to_vec(&p).unwrap()).unwrap();
        assert!(!next.sound);assert!(next.autostart&&next.start_minimized);
    }
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
    #[test] fn realtime_notification_keys_are_scoped_to_the_account() {
        assert_eq!(notice_key("user-a", &json!({"id": 42})), Some("user-a:42".into()));
        assert_eq!(notice_key("user-b", &json!({"id": "42"})), Some("user-b:42".into()));
        assert_eq!(notice_key("user-a", &json!({"message": "sem id"})), None);
    }
    #[test] fn notification_fingerprint_groups_the_same_event_for_one_account() {
        let notice = json!({"id": 42, "tipo":"mensagem", "referencia_id":"chat-1", "actor_id":"friend", "mensagem":"Olá"});
        assert_eq!(notice_fingerprint("user-a", &notice), "user-a|mensagem|chat-1|friend|olá");
        assert_ne!(notice_fingerprint("user-a", &notice), notice_fingerprint("user-b", &notice));
    }
    #[test] fn diagnostic_text_hides_email_tokens_and_long_values() {
        assert_eq!(clean_log("conta exemplo@teste.com", 100), "conta [email]");
        assert_eq!(clean_log("eyJabc.def.ghi", 100), "[dado-protegido]");
        assert!(clean_log(&"x".repeat(300), 400).contains("dado-protegido"));
    }
}

//! Sends error diagnostics of signed-in accounts to clt_report_client_error.
//! Kept apart from desktop_runtime so the local diagnostic code never touches tokens.
use super::*;

/// Uses the current session without refreshing it and ignores every failure, so
/// reporting can neither sign the user out nor log about itself. The caller passes
/// text already redacted by the local diagnostic rules.
pub async fn send(state: &AppState, stage: &str, message: &str) {
    if stage.is_empty() || message.is_empty() { return; }
    let token = state.session.lock().ok().and_then(|session| session.clone())
        .filter(|session| session.expires_at > now() + 60).map(|session| session.access_token);
    let Some(token) = token else { return };
    let body = json!({"p_platform": "windows", "p_version": env!("CARGO_PKG_VERSION"), "p_stage": stage, "p_message": message});
    let _ = tokio::time::timeout(Duration::from_secs(10), rpc(&state.client, "clt_report_client_error", body, &token)).await;
}

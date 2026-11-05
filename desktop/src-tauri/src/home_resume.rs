use crate::{current, safe_id, value, AppState, SUPABASE_KEY, SUPABASE_URL};
use serde_json::{json, Value};

#[tauri::command]
pub async fn set_home_status(id: String, category: String, status: String, expected: Option<String>, state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let session = current(&state).await?;
    let id = safe_id(&id)?;
    let allowed = match category.as_str() {
        "jogos" => ["⏸️ Pausado", "✅ Zerado"],
        "filmes" => ["⏸️ Pausado", "✅ Assistido"],
        _ => return Err("Categoria inválida.".into()),
    };
    if !allowed.contains(&status.as_str()) { return Err("Status inválido.".into()); }
    let stamp = match expected {
        Some(ref date) => { chrono::DateTime::parse_from_rfc3339(date).map_err(|_| "Atualize o início antes de alterar este título.")?; format!("eq.{date}") },
        None => "is.null".into(),
    };
    let response = state.client.patch(format!("{SUPABASE_URL}/rest/v1/itens"))
        .query(&[("id",format!("eq.{id}")),("user_id",format!("eq.{}",session.user.id)),("categoria",format!("eq.{category}")),("updated_at",stamp),("select","id,status,updated_at".into())])
        .header("apikey", SUPABASE_KEY).bearer_auth(&session.access_token).header("prefer", "return=representation")
        .json(&json!({"status":status})).send().await.map_err(|_| "Não foi possível confirmar o salvamento. Atualize o início antes de tentar novamente.")?;
    let rows = value(response).await?;
    if rows.as_array().map_or(true, |rows| rows.len()!=1) { return Err("O título mudou em outra tela. Atualize o início antes de tentar novamente.".into()); }
    Ok(rows)
}

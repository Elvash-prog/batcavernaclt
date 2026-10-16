use serde::Deserialize;
use serde_json::{json, Value};
use crate::{AppState, current, rest, value, SUPABASE_URL, SUPABASE_KEY};

#[derive(Deserialize)]
pub struct EmailChangeProof { email: String, code: String }

fn proof(email: &str, code: &str, owner: &Value, id: &str) -> Result<Value, String> {
 let email=email.trim().to_lowercase();let code=code.trim();
 if owner["id"].as_str()!=Some(id) {return Err("Sua sessão mudou. Entre novamente.".into());}
 let pending=owner["new_email"].as_str().unwrap_or("");
 if pending.is_empty(){return Err("Não há troca pendente. Confira o e-mail atual ou solicite uma nova alteração.".into());}
 if !email.eq_ignore_ascii_case(pending)&&!email.eq_ignore_ascii_case(owner["email"].as_str().unwrap_or("")){return Err("Informe o endereço atual ou novo que recebeu este código.".into());}
 if !(6..=10).contains(&code.len())||!code.bytes().all(|b|b.is_ascii_digit()){return Err("Informe o código numérico recebido por e-mail.".into());}
 Ok(json!({"email":email,"token":code,"type":"email_change"}))
}

#[tauri::command]
pub async fn verify_email_change(input:EmailChangeProof,state:tauri::State<'_,AppState>)->Result<Value,String>{
 let session=current(&state).await?;
 let before=value(rest(&state.client,"/auth/v1/user",&session.access_token).send().await.map_err(|_|"Não foi possível consultar sua conta.".to_string())?).await?;
 let payload=proof(&input.email,&input.code,&before,&session.user.id)?;
 let verified=value(state.client.post(format!("{SUPABASE_URL}/auth/v1/verify")).header("apikey",SUPABASE_KEY).json(&payload).send().await.map_err(|_|"A confirmação foi interrompida. Confira sua conta antes de reenviar.".to_string())?).await;
 // Verification can create a separate session. Keep the signed-in session and revoke only the temporary one.
 if let Ok(reply)=&verified {if let Some(token)=reply["access_token"].as_str(){let _=state.client.post(format!("{SUPABASE_URL}/auth/v1/logout?scope=local")).header("apikey",SUPABASE_KEY).bearer_auth(token).send().await;}}
 verified.map_err(|_|"Código não confirmado. Confira o destinatário e o código; solicite outro se expirou ou já foi utilizado.".to_string())?;
 let after=value(rest(&state.client,"/auth/v1/user",&session.access_token).send().await.map_err(|_|"Código enviado. Consulte sua conta para conferir a conclusão.".to_string())?).await?;
 if after["id"].as_str()!=Some(session.user.id.as_str()){return Err("Sua sessão mudou.".into());}
 let complete=after["new_email"].as_str().unwrap_or("").is_empty() && after["email"]==before["new_email"];
 if complete {let mut active=state.session.lock().map_err(|_|"Sessão indisponível.".to_string())?;if let Some(active)=active.as_mut(){if active.user.id!=session.user.id{return Err("Sua sessão mudou.".into());}active.user.email=after["email"].as_str().unwrap_or("").into();}}
 Ok(json!({"complete":complete,"email":after["email"],"message":if complete{"E-mail alterado. Use o novo endereço no próximo login."}else{"Código aceito. Confirme também o código enviado ao outro endereço."}}))
}

#[cfg(test)] mod tests {
 use super::*;
 #[test] fn binds_codes_to_signed_in_account_and_pending_change(){
  let owner=json!({"id":"mine","email":"old@example.com","new_email":"new@example.com"});
  for email in ["old@example.com"," NEW@example.com "]{assert_eq!(proof(email,"123456",&owner,"mine").unwrap()["type"],"email_change");}
  assert!(proof("other@example.com","123456",&owner,"mine").is_err());
  assert!(proof("new@example.com","123456",&owner,"other").is_err());
  assert!(proof("new@example.com","https://example.com",&owner,"mine").is_err());
  assert!(proof("new@example.com","123456",&json!({"id":"mine","email":"old@example.com"}),"mine").is_err());
 }
}

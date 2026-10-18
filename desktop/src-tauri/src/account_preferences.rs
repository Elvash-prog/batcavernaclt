use super::*;
#[tauri::command]
pub async fn desktop_layout(input:Option<Value>,state:tauri::State<'_,AppState>)->Result<Value,String>{
 let session=current(&state).await?;
 if let Some(input)=input {
  if input["owner"].as_str()!=Some(session.user.id.as_str()){return Err("Sua conta mudou. Abra novamente as configurações.".into());}
  let patch=input.get("patch").filter(|p|p.is_object()).ok_or("Aparência inválida.")?;
  if patch.to_string().len()>2*1024*1024{return Err("A imagem de fundo é muito grande para sincronizar.".into());}
  return rpc(&state.client,"clt_save_desktop_layout",json!({"p_patch":patch}),&session.access_token).await;
 }
 let rows=get(&state.client,&format!("/rest/v1/clt_desktop_layout?select=layout,updated_at&user_id=eq.{}&limit=1",session.user.id),&session.access_token).await?;
 Ok(rows.as_array().and_then(|r|r.first()).cloned().unwrap_or(Value::Null))
}

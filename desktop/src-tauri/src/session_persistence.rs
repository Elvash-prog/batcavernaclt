use super::*;
const UPDATE_ACCOUNT:&str="desktop-update-refresh-token";
#[derive(Serialize,Deserialize)]
pub struct SavedSession{pub token:String,pub remember:bool,pub pending:bool}
fn pending()->Result<keyring::Entry,String>{keyring::Entry::new(KEYRING_SERVICE,UPDATE_ACCOUNT).map_err(|_|"Armazenamento seguro indisponível.".into())}
pub fn clear_pending(){if let Ok(entry)=pending(){let _=entry.delete_credential();}}
pub fn revoked(status:u16,body:&str)->bool{
 if status!=400&&status!=401{return false}
 let code=serde_json::from_str::<Value>(body).ok().and_then(|v|v["error_code"].as_str().or(v["code"].as_str()).map(str::to_owned)).unwrap_or_default();
 matches!(code.as_str(),"refresh_token_not_found"|"refresh_token_already_used"|"session_not_found"|"session_expired"|"user_not_found"|"user_banned")
}
pub fn saved()->Result<Option<SavedSession>,String>{
 match pending()?.get_password(){Ok(raw)=>return serde_json::from_str(&raw).map(Some).map_err(|_|"Credencial de atualização inválida. Entre novamente.".into()),Err(keyring::Error::NoEntry)=>{},Err(_)=>return Err("Não foi possível ler sua sessão de atualização.".into())}
 match keyring()?.get_password(){Ok(token)=>Ok(Some(SavedSession{token,remember:true,pending:false})),Err(keyring::Error::NoEntry)=>Ok(None),Err(_)=>Err("Não foi possível ler sua sessão protegida. Tente novamente.".into())}
}
pub fn prepare_update(token:&str)->Result<(),String>{
 let remember=keyring()?.get_password().is_ok();
 let value=SavedSession{token:token.into(),remember,pending:true};
 pending()?.set_password(&serde_json::to_string(&value).map_err(|_|"Sessão inválida.")?).map_err(|_|"Não foi possível preservar a sessão antes da atualização.".into())
}
pub fn rotate(token:&str)->Result<(),String>{
 if keyring()?.get_password().is_ok(){keyring()?.set_password(token).map_err(|_|"Não foi possível salvar a sessão renovada.".to_string())?;}
 if let Ok(raw)=pending()?.get_password(){let mut value:SavedSession=serde_json::from_str(&raw).map_err(|_|"Sessão de atualização inválida.".to_string())?;value.token=token.into();pending()?.set_password(&serde_json::to_string(&value).map_err(|_|"Sessão inválida.")?).map_err(|_|"Não foi possível preservar a sessão atualizada.".to_string())?;}
 Ok(())
}
pub fn restored(saved:&SavedSession,token:&str)->Result<(),String>{
 if saved.remember{keyring()?.set_password(token).map_err(|_|"Não foi possível proteger a sessão restaurada.".to_string())?;}else{clear_keyring();}
 if saved.pending{clear_pending();}Ok(())
}
#[cfg(test)]mod tests{use super::*;
 #[test]fn only_confirmed_revocation_clears_credentials(){assert!(revoked(400,r#"{"error_code":"refresh_token_already_used"}"#));assert!(!revoked(503,r#"{"error_code":"session_expired"}"#));assert!(!revoked(429,"rate limit"));assert!(!revoked(400,r#"{"msg":"temporary failure"}"#));}
 #[test]fn update_handoff_preserves_remember_choice(){let value=SavedSession{token:"example".into(),remember:false,pending:true};let parsed:SavedSession=serde_json::from_str(&serde_json::to_string(&value).unwrap()).unwrap();assert!(!parsed.remember);assert!(parsed.pending);}
 #[cfg(windows)]
 #[test]fn windows_vault_child(){if let Ok(account)=std::env::var("BATCAVERNA_VAULT_TEST_ACCOUNT"){let entry=keyring::Entry::new("BatCaverna CI Vault",&account).unwrap();assert_eq!(entry.get_password().unwrap(),"synthetic-ci-credential");}}
 #[cfg(windows)]
 #[test]fn windows_vault_survives_another_process(){let account=format!("process-{}-{}",std::process::id(),now());let entry=keyring::Entry::new("BatCaverna CI Vault",&account).unwrap();entry.set_password("synthetic-ci-credential").unwrap();let result=std::process::Command::new(std::env::current_exe().unwrap()).args(["--exact","session_persistence::tests::windows_vault_child"]).env("BATCAVERNA_VAULT_TEST_ACCOUNT",&account).status();let _=entry.delete_credential();assert!(result.unwrap().success());}

}

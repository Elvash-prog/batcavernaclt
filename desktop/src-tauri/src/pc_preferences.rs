//! Per-account PC mappings live outside the WebView quota. Two generations retain
//! the previous valid file when Windows stops during a write. No tokens or images.
use super::*;
use std::{io::Write,path::{Path,PathBuf}};
static GATE:tokio::sync::Mutex<()>=tokio::sync::Mutex::const_new(());
fn clean(value:&Value)->Result<Value,String>{
 let object=value.as_object().ok_or("Preferências inválidas.")?;
 let mut mappings=Vec::new();
 if let Some(rows)=object.get("mappings"){
  let rows=rows.as_array().filter(|rows|rows.len()<=200).ok_or("Limite de 200 associações atingido.")?;
  for row in rows{let name=row["name"].as_str().filter(|v|!v.trim().is_empty()&&v.chars().count()<=180&&!v.chars().any(char::is_control)).ok_or("Nome de jogo inválido.")?;
   let process=row["process"].as_str().filter(|v|!v.trim().is_empty()&&v.chars().count()<=160&&!v.chars().any(|c|c.is_control()||c=='/'||c=='\\')).ok_or("Executável inválido.")?;
   let mut mapping=json!({"name":name,"process":process});if row["automatic"]==true{mapping["automatic"]=json!(true);}mappings.push(mapping);
  }
 }
 for key in ["enabled","trackTime"]{if object.get(key).is_some_and(|v|!v.is_boolean()){return Err("Preferência inválida.".into());}}
 Ok(json!({"enabled":object.get("enabled").and_then(Value::as_bool).unwrap_or(true),"trackTime":object.get("trackTime").and_then(Value::as_bool).unwrap_or(true),"mappings":mappings}))
}
fn load(root:&Path)->Result<Option<(u64,Value)>,String>{
 let mut valid=Vec::new();let mut exists=false;
 for slot in 0..2{let path=root.join(format!("settings-{slot}.json"));if path.exists(){exists=true;if std::fs::metadata(&path).map(|m|m.len()<=512*1024).unwrap_or(false){if let Ok(bytes)=std::fs::read(path){if let Ok(data)=serde_json::from_slice::<Value>(&bytes){if let (Some(generation),Ok(prefs))=(data["generation"].as_u64(),clean(&data["preferences"])){valid.push((generation,prefs));}}}}}}
 let newest=valid.into_iter().max_by_key(|v|v.0);if newest.is_none()&&exists{return Err("Não foi possível ler as associações. Os arquivos foram preservados.".into());}Ok(newest)
}
fn save(root:&Path,preferences:&Value)->Result<Value,String>{
 let preferences=clean(preferences)?;let generation=load(root)?.map(|v|v.0).unwrap_or(0).checked_add(1).ok_or("Preferências indisponíveis.")?;
 let bytes=serde_json::to_vec(&json!({"generation":generation,"preferences":preferences})).map_err(|_|"Preferências inválidas.")?;
 if bytes.len()>512*1024{return Err("Associações extensas demais.".into());}
 let error=||"Não foi possível guardar as associações no PC. Verifique o espaço em disco.".to_string();
 std::fs::create_dir_all(root).map_err(|_|error())?;let mut file=std::fs::File::create(root.join(format!("settings-{}.json",generation%2))).map_err(|_|error())?;
 file.write_all(&bytes).and_then(|_|file.sync_all()).map_err(|_|error())?;Ok(preferences)
}
fn root(app:&AppHandle,owner:&str)->Result<PathBuf,String>{if owner.is_empty()||!owner.chars().all(|c|c.is_ascii_hexdigit()||c=='-'){return Err("Conta inválida.".into());}Ok(app.path().app_data_dir().map_err(|_|"Armazenamento indisponível.")?.join("pc-games-v1").join(owner))}
#[tauri::command]
pub async fn pc_game_preferences(input:Value,app:AppHandle,state:tauri::State<'_,AppState>)->Result<Value,String>{
 let _guard=GATE.lock().await;let session=state.session.lock().map_err(|_|"Sessão indisponível.")?;let owner=&session.as_ref().ok_or("Entre na sua conta.")?.user.id;
 if input["owner"].as_str()!=Some(owner.as_str()){return Err("A conta mudou. Reabra as configurações.".into());}
 let path=root(&app,owner)?;if let Some(preferences)=input.get("preferences"){save(&path,preferences)}else{Ok(load(&path)?.map(|v|v.1).unwrap_or(Value::Null))}
}
#[cfg(test)]mod tests{use super::*;
 #[test]fn only_bounded_preferences_are_stored(){let p=clean(&json!({"enabled":false,"trackTime":false,"mappings":[{"name":"Control","process":"Control_DX12.exe","automatic":true,"image":"ignored"}],"token":"ignored"})).unwrap();assert_eq!(p["enabled"],false);assert!(p.get("token").is_none());assert!(p["mappings"][0].get("image").is_none());assert!(clean(&json!({"mappings":[{"name":"Control","process":"C:\\secret\\game.exe"}]})).is_err());}
 #[test]fn interrupted_generation_keeps_previous_mapping(){let dir=std::env::temp_dir().join(format!("bc-pc-prefs-{}-{}",std::process::id(),std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));let prefs=json!({"enabled":false,"mappings":[{"name":"RDR2","process":"RDR2"}]});save(&dir,&prefs).unwrap();std::fs::write(dir.join("settings-0.json"),b"{partial").unwrap();let recovered=load(&dir).unwrap().unwrap().1;assert_eq!(recovered["mappings"][0]["process"],"RDR2");save(&dir,&json!({"enabled":true,"mappings":[]})).unwrap();assert_eq!(load(&dir).unwrap().unwrap().1["enabled"],true);std::fs::remove_dir_all(dir).unwrap();}
}

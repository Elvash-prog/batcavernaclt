//! Account-scoped durable progress. Two fsynced generations retain a valid copy
//! if Windows terminates while replacing the other slot. Never stores tokens.
use super::*;
use std::{collections::BTreeMap,io::Write,path::{Path,PathBuf}};
static GATE:tokio::sync::Mutex<()>=tokio::sync::Mutex::const_new(());
#[derive(Default,Serialize,Deserialize)]
struct Outbox{generation:u64,#[serde(default)]plays:BTreeMap<String,Value>,#[serde(default)]achievements:BTreeMap<String,Value>,#[serde(default)]synced:BTreeMap<String,Value>}
fn load(root:&Path)->Result<Outbox,String>{
 let mut versions=Vec::new();let mut exists=false;
 for slot in 0..2{let path=root.join(format!("progress-{slot}.json"));if path.exists(){exists=true;if let Ok(bytes)=std::fs::read(path){if let Ok(value)=serde_json::from_slice::<Outbox>(&bytes){versions.push(value)}}}}
 versions.into_iter().max_by_key(|v|v.generation).map(Ok).unwrap_or_else(||if exists{Err("Não foi possível ler o progresso salvo neste PC. Os arquivos foram preservados.".into())}else{Ok(Outbox::default())})
}
fn save(root:&Path,data:&mut Outbox)->Result<(),String>{
 let fail=||"Não foi possível guardar o progresso no PC. Verifique o espaço em disco.".to_string();
 std::fs::create_dir_all(root).map_err(|_|fail())?;data.generation+=1;
 let bytes=serde_json::to_vec(data).map_err(|_|fail())?;
 let mut file=std::fs::File::create(root.join(format!("progress-{}.json",data.generation%2))).map_err(|_|fail())?;
 file.write_all(&bytes).and_then(|_|file.sync_all()).map_err(|_|fail())
}
fn root(app:&AppHandle,owner:&str)->Result<PathBuf,String>{
 if owner.is_empty()||!owner.chars().all(|c|c.is_ascii_hexdigit()||c=='-'){return Err("Conta inválida.".into())}
 Ok(app.path().app_data_dir().map_err(|_|"Armazenamento local indisponível.")?.join("progress-v1").join(owner))
}
fn owner(state:&AppState)->Result<String,String>{state.session.lock().map_err(|_|"Sessão indisponível.")?.as_ref().map(|s|s.user.id.clone()).ok_or("Entre na sua conta.".into())}
async fn send(state:&AppState,who:&str,op:&str,input:Value)->Result<Value,String>{
 let session=current(state).await?;if session.user.id!=who{return Err("Conta alterada; o progresso permanece salvo na conta anterior.".into())}
 value(state.client.post(format!("{SUPABASE_URL}/rest/v1/rpc/{op}")).timeout(Duration::from_secs(8)).header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).json(&input).send().await.map_err(|_|"Aguardando conexão para sincronizar.".to_string())?).await
}
async fn flush(state:&AppState,who:&str,root:&Path,data:&mut Outbox)->Result<(),String>{
 for (key,play) in data.plays.clone().into_iter().take(20){
  let hours=send(state,who,"clt_record_offline_play",json!({"p_item":play["item_id"],"p_session":key,"p_seconds":play["seconds"]})).await?;
  data.synced.insert(play["item_id"].to_string(),json!({"hours":hours,"at":chrono::Utc::now().to_rfc3339()}));
  data.plays.remove(&key);save(root,data)?;
 }
 for (appid,snapshot) in data.achievements.clone(){if snapshot["pending"]!=true{continue}
  let row=send(state,who,"clt_merge_local_achievements",json!({"p_appid":appid.parse::<u32>().map_err(|_|"Jogo inválido.")?,"p_snapshot":snapshot})).await?;
  let mut stored=steam_local::stored_snapshot(&row,appid.parse().unwrap_or(0));stored["pending"]=json!(false);data.achievements.insert(appid,stored);save(root,data)?;
 }Ok(())
}
#[tauri::command]
pub async fn progress_sync(input:Value,app:AppHandle,state:tauri::State<'_,AppState>)->Result<Value,String>{
 let _guard=GATE.lock().await;let who=owner(&state)?;if input["owner"].as_str()!=Some(who.as_str()){return Err("Conta alterada.".into())}let root=root(&app,&who)?;let mut data=load(&root)?;
 if input["op"]=="record"{
  let id=input["item_id"].as_i64().filter(|v|*v>0).ok_or("Jogo inválido.")?;
  let seconds=input["seconds"].as_u64().filter(|v|*v<=604800).ok_or("Tempo inválido.")?;
  let key=input["session"].as_str().filter(|v|v.len()==36&&v.chars().all(|c|c.is_ascii_hexdigit()||c=='-')).ok_or("Sessão inválida.")?;
  if let Some(old)=data.plays.get(key){if old["item_id"]!=id{return Err("Sessão pertence a outro jogo.".into())}}
  let seconds=seconds.max(data.plays.get(key).and_then(|v|v["seconds"].as_u64()).unwrap_or(0));
  data.plays.insert(key.into(),json!({"item_id":id,"seconds":seconds}));save(&root,&mut data)?;
 }
 let error=if input["op"]!="status"{flush(&state,&who,&root,&mut data).await.err()}else{None};
 let pending:Vec<Value>=data.plays.values().cloned().collect();
 // Status heartbeats carry summaries, not every cached achievement icon/description.
 let summaries:BTreeMap<String,Value>=data.achievements.iter().map(|(id,v)|(id.clone(),json!({"pending":v["pending"],"observed_at":v["observed_at"],"unlocked":v["unlocked"],"total":v["total"]}))).collect();
 Ok(json!({"plays":pending,"synced":data.synced,"achievements":summaries,"pending":!data.plays.is_empty()||data.achievements.values().any(|v|v["pending"]==true),"error":error}))
}
#[tauri::command]
pub async fn steam_local_achievements(appid:u32,steam_id:Option<String>,owner_id:String,app:AppHandle,state:tauri::State<'_,AppState>)->Result<Value,String>{
 if appid==0{return Err("Steam App ID inválido.".into())}
 let _guard=GATE.lock().await;let who=owner(&state)?;if owner_id!=who{return Err("Conta alterada.".into())}let root=root(&app,&who)?;let mut data=load(&root)?;let key=appid.to_string();
 // The selected account's configured Steam ID is already present in the renderer.
 // Reading its local files must not wait for an online profile request.
 let steam_id=steam_id.and_then(|v|v.parse::<u64>().ok());
 let local=tauri::async_runtime::spawn_blocking(move||steam_id.and_then(|id|steam_local::read(appid,id))).await.map_err(|_|"Não foi possível ler as conquistas locais.")?;
 if let Some(local)=local{
  let previous=data.achievements.get(&key).map(|v|json!({"achievements":v["lista"],"unlocked":v["unlocked"],"total":v["total"]}));
  let mut merged=steam_local::merge_snapshot(previous.as_ref(),&local,appid);merged["pending"]=json!(true);merged["persisted"]=json!(false);
  data.achievements.insert(key.clone(),merged);save(&root,&mut data)?;
 }
 let sync_error=flush(&state,&who,&root,&mut data).await.err();
 if !data.achievements.contains_key(&key){
  if let Ok(session)=current(&state).await{if session.user.id==who{
   if let Ok(rows)=get(&state.client,&format!("/rest/v1/steam_local_progress?select=steam_appid,unlocked,total,achievements,observed_at&user_id=eq.{who}&steam_appid=eq.{appid}&limit=1"),&session.access_token).await{
    if let Some(row)=rows.as_array().and_then(|v|v.first()){data.achievements.insert(key.clone(),steam_local::stored_snapshot(row,appid));save(&root,&mut data)?;}
   }
  }}
 }
 let mut result=data.achievements.get(&key).cloned().unwrap_or(json!({"found":false,"appid":appid,"lista":[],"persisted":false}));
 result["sync_error"]=json!(sync_error);Ok(result)
}
#[cfg(test)]mod tests{use super::*;
 #[test]fn durable_restart_and_torn_write_keep_unacknowledged_progress(){
  let root=std::env::temp_dir().join(format!("bc-outbox-{}-{}",std::process::id(),now()));let mut data=Outbox::default();
  data.plays.insert("session".into(),json!({"item_id":1,"seconds":3600}));save(&root,&mut data).unwrap();
  let mut restored=load(&root).unwrap();assert_eq!(restored.plays["session"]["seconds"],3600);
  restored.plays.insert("second".into(),json!({"seconds":30}));save(&root,&mut restored).unwrap();
  std::fs::write(root.join("progress-1.json"),b"{torn").unwrap();assert_eq!(load(&root).unwrap().plays.len(),2);
  std::fs::write(root.join("progress-0.json"),b"{torn").unwrap();assert!(load(&root).is_err());let _=std::fs::remove_dir_all(root);
 }
}

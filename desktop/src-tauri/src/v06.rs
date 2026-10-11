use super::*;
use futures_util::{SinkExt, StreamExt};
use std::sync::{atomic::{AtomicU64,Ordering},LazyLock};
use tauri::Emitter;
use tokio_tungstenite::{connect_async,tungstenite::Message};
static GENERATION:AtomicU64=AtomicU64::new(0);
static PRESENCE:LazyLock<Mutex<Value>>=LazyLock::new(||Mutex::new(json!({})));
pub fn stop(){GENERATION.fetch_add(1,Ordering::SeqCst);}
async fn write(state:&AppState,session:&Session,method:reqwest::Method,path:&str,body:Value)->Result<Value,String>{
 value(state.client.request(method,format!("{SUPABASE_URL}{path}")).header("apikey",SUPABASE_KEY).bearer_auth(&session.access_token).header("content-type","application/json").header("prefer","return=representation").json(&body).send().await.map_err(|_|"Não foi possível sincronizar a operação.".to_string())?).await
}
#[tauri::command]
pub async fn community(input:Value,state:tauri::State<'_,AppState>)->Result<Value,String>{
 let session=current(&state).await?;let me=&session.user.id;let token=&session.access_token;let op=input["op"].as_str().unwrap_or("");
 let ident=input["id"].as_str().unwrap_or("");
 let reaction_table=if input["group"].as_bool()==Some(true){"clt_chat_group_reactions"}else{"clt_chat_reactions"};
 let message_table=if input["group"].as_bool()==Some(true){"clt_chat_group_messages"}else{"clt_chat_messages"};
 match op{
 "clear_notifications"=>rpc(&state.client,"clt_desktop_clear_notifications",json!({}),token).await,
 "read_notification"=>{let id=safe_id(ident)?;write(&state,&session,reqwest::Method::PATCH,&format!("/rest/v1/notificacoes?id=eq.{id}&destinatario_id=eq.{me}"),json!({"read":true})).await},
 "ranking"=>rpc(&state.client,"ranking_clt",json!({}),token).await,
 "missions"=>rpc(&state.client,"missoes_clt",json!({}),token).await,
 "claim_mission"=>{let id=input["missionId"].as_u64().ok_or("Missão inválida.")?;rpc(&state.client,"resgatar_missao_clt",json!({"p_id":id}),token).await},
 "profile_bundle"=>{
   let id=safe_id(ident)?;if id!=me{let f=get(&state.client,&format!("/rest/v1/amigos?select=amigo_id&user_id=eq.{me}&amigo_id=eq.{id}&limit=1"),token).await?;if f.as_array().is_none_or(|a|a.is_empty()){return Err("Este perfil é restrito aos amigos.".into());}}
   let detail=rpc(&state.client,"perfil_detalhes_autorizado",json!({"p_perfil_id":id}),token).await?;
   if input["light"].as_bool()==Some(true){return Ok(json!({"detail":detail}));}
   let mut items=Vec::new();for offset in (0..10000).step_by(1000){let r=get(&state.client,&format!("/rest/v1/itens?select=id,user_id,categoria,nome,plataforma,status,nota,data,inicio,horas,loja,ano,prioridade,tempo_est,conquistas,capa,tipo,onde,duracao,steam_appid,generos,created_at,updated_at&user_id=eq.{id}&order=id.asc&offset={offset}&limit=1000"),token).await?;let rows=r.as_array().cloned().unwrap_or_default();let count=rows.len();items.extend(rows);if count<1000{break;}}
   let ranking=rpc(&state.client,"ranking_clt",json!({}),token).await.unwrap_or(json!([]));
   Ok(json!({"detail":detail,"items":items,"ranking":ranking}))
 },
 "reactions"=>{let ids=input["ids"].as_array().ok_or("Mensagens inválidas.")?;if ids.len()>300{return Err("Muitas mensagens.".into());}let values:Result<Vec<&str>,String>=ids.iter().map(|i|safe_id(i.as_str().unwrap_or(""))).collect();let values=values?;if values.is_empty(){return Ok(json!([]));}get(&state.client,&format!("/rest/v1/{reaction_table}?select=message_id,user_id,emoji&message_id=in.({})",values.join(",")),token).await},
 "react"=>{let id=safe_id(ident)?;let emoji=input["emoji"].as_str().unwrap_or("");if !["❤️","😂","🔥","👍"].contains(&emoji){return Err("Reação inválida.".into());}if input["remove"].as_bool()==Some(true){write(&state,&session,reqwest::Method::DELETE,&format!("/rest/v1/{reaction_table}?message_id=eq.{id}&user_id=eq.{me}&emoji=eq.{}",urlencoding::encode(emoji)),json!({})).await}else{let msg=get(&state.client,&format!("/rest/v1/{message_table}?select=id&id=eq.{id}&limit=1"),token).await?;let value=msg.as_array().and_then(|a|a.first()).and_then(|x|x.get("id")).cloned().ok_or("Mensagem indisponível.")?;write(&state,&session,reqwest::Method::POST,&format!("/rest/v1/{reaction_table}"),json!({"message_id":value,"user_id":me,"emoji":emoji})).await}},
 "edit_message"=>{let id=safe_id(ident)?;let text=input["text"].as_str().unwrap_or("").trim();if text.is_empty()||text.chars().count()>2000{return Err("Escreva até 2.000 caracteres.".into());}write(&state,&session,reqwest::Method::PATCH,&format!("/rest/v1/{message_table}?id=eq.{id}&remetente_id=eq.{me}"),json!({"texto":text})).await},
 "delete_message"=>{let id=safe_id(ident)?;write(&state,&session,reqwest::Method::DELETE,&format!("/rest/v1/{message_table}?id=eq.{id}&remetente_id=eq.{me}"),json!({})).await},
 "read_chat"=>{let id=safe_id(ident)?;write(&state,&session,reqwest::Method::PATCH,&format!("/rest/v1/clt_chat_messages?remetente_id=eq.{id}&destinatario_id=eq.{me}&lida=eq.false"),json!({"lida":true})).await},
 "stickers"=>get(&state.client,&format!("/rest/v1/clt_account_stickers?select=id,name,filename,path&user_id=eq.{me}&order=created_at.desc&limit=60"),token).await,
 "save_sticker"=>{let path=input["path"].as_str().unwrap_or("");let name=input["name"].as_str().unwrap_or("Figurinha");if !path.starts_with(&format!("{me}/"))||path.len()>300||name.chars().count()>80{return Err("Figurinha inválida.".into());}write(&state,&session,reqwest::Method::POST,"/rest/v1/clt_account_stickers",json!({"id":format!("desktop-{me}-{}",SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis()),"user_id":me,"name":name,"filename":name,"path":path})).await},
 "delete_sticker"=>{let id=safe_id(ident)?;write(&state,&session,reqwest::Method::DELETE,&format!("/rest/v1/clt_account_stickers?id=eq.{id}&user_id=eq.{me}"),json!({})).await},
 "groups"=>{let memberships=get(&state.client,&format!("/rest/v1/clt_chat_group_members?select=group_id&user_id=eq.{me}"),token).await?;let ids:Vec<&str>=memberships.as_array().into_iter().flatten().filter_map(|m|m["group_id"].as_str()).collect();if ids.is_empty(){return Ok(json!([]));}get(&state.client,&format!("/rest/v1/clt_chat_groups?select=*&id=in.({})",ids.join(",")),token).await},
 "group_messages"=>{let id=safe_id(ident)?;get(&state.client,&format!("/rest/v1/clt_chat_group_messages?select=*&group_id=eq.{id}&order=created_at.desc&limit=300"),token).await},
 "group_send"=>{let id=safe_id(ident)?;let text=input["text"].as_str().unwrap_or("").trim();let media=input["media"].as_str();if let Some(path)=media{if !path.starts_with(&format!("{me}/"))||path.contains(".."){return Err("Image de groupe invalide.".into());}}if (text.is_empty()&&media.is_none())||text.chars().count()>2000{return Err("Escreva até 2.000 caracteres.".into());}write(&state,&session,reqwest::Method::POST,"/rest/v1/clt_chat_group_messages",json!({"group_id":id,"remetente_id":me,"texto":text,"midia_path":media})).await},
 "read_group"=>{let id=safe_id(ident)?;let response=state.client.post(format!("{SUPABASE_URL}/rest/v1/clt_chat_group_reads?on_conflict=group_id,user_id")).header("apikey",SUPABASE_KEY).bearer_auth(token).header("content-type","application/json").header("prefer","resolution=merge-duplicates").json(&json!({"group_id":id,"user_id":me,"last_read_at":chrono::Utc::now().to_rfc3339()})).send().await.map_err(|_|"Falha ao marcar leitura.".to_string())?;value(response).await},
 "group_invite"=>{let id=safe_id(ident)?;rpc(&state.client,"responder_convite_grupo_clt",json!({"p_invite_id":id,"p_accept":input["accept"].as_bool().unwrap_or(false)}),token).await},
 "steam_details"=>{
   let id=if let Some(id)=input["appid"].as_u64(){id}else{let q=input["query"].as_str().unwrap_or("").trim();if q.len()<2||q.len()>180{return Err("Nome inválido.".into());}let r=value(state.client.get("https://store.steampowered.com/api/storesearch/").query(&[("term",q),("cc","br"),("l","portuguese")]).send().await.map_err(|_|"Steam indisponível.".to_string())?).await?;r["items"].as_array().and_then(|a|a.first()).and_then(|x|x["id"].as_u64()).ok_or("Jogo não encontrado na Steam.")?};
   let r=value(state.client.get("https://store.steampowered.com/api/appdetails").query(&[("appids",id.to_string()),("cc","br".into()),("l","brazilian".into())]).send().await.map_err(|_|"Steam indisponível.".to_string())?).await?;
   let d=&r[id.to_string()]["data"];if d.is_null(){return Err("Dados da Steam indisponíveis.".into());}let genres=d["genres"].as_array().cloned().unwrap_or_default();if genres.iter().any(|g|g["id"].as_str()==Some("71")){return Err("Título adulto indisponível.".into());}
   Ok(json!({"steam_appid":id,"nome":d["name"],"generos":genres,"capa":d["header_image"],"descricao":d["short_description"],"preco":d["price_overview"]["final_formatted"],"desenvolvedores":d["developers"],"lancamento":d["release_date"]["date"]}))
 },
 _=>Err("Operação não permitida.".into())
 }
}
#[tauri::command]
pub async fn upload_chat_image(input:UploadInput,group:Option<bool>,state:tauri::State<'_,AppState>)->Result<Value,String>{moderated_upload(input,&state,if group==Some(true){"group-chat-media"}else{"chat-media"}).await}
pub async fn moderated_upload(input:UploadInput,state:&AppState,bucket:&str)->Result<Value,String>{
 let session=current(state).await?;if input.base64.len()>14_000_000||!matches!(input.mime.as_str(),"image/png"|"image/jpeg"|"image/webp"){return Err("Imagem inválida.".into());}
 let bytes=base64::engine::general_purpose::STANDARD.decode(input.base64).map_err(|_|"Imagem inválida.".to_string())?;
 if bytes.is_empty()||bytes.len()>if bucket=="chat-media"||bucket=="group-chat-media"{5*1024*1024}else{10*1024*1024}{return Err("Imagem maior que o limite permitido.".into());}
 let ext=match input.mime.as_str(){"image/png"=>"png","image/jpeg"=>"jpg",_=>"webp"};let path=format!("{}/desktop-{}.{ext}",session.user.id,SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis());
 let r=state.client.post(format!("{CATALOG_ORIGIN}/api/media/upload")).query(&[("bucket",bucket),("path",path.as_str())]).bearer_auth(&session.access_token).header("content-type",&input.mime).body(bytes).send().await.map_err(|_|"Não foi possível enviar a imagem.".to_string())?;value(r).await?;
 Ok(json!({"path":path,"url":format!("{SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}")}))
}
fn envelope(topic:&str,event:&str,payload:Value,id:u64,join:&str)->Message{Message::Text(json!({"topic":topic,"event":event,"payload":payload,"ref":id.to_string(),"join_ref":join}).to_string().into())}
#[tauri::command]
pub async fn realtime_start(input:Value,app:tauri::AppHandle,state:tauri::State<'_,AppState>)->Result<(),String>{
 let session=current(&state).await?;let owner=session.user.id;let generation=GENERATION.fetch_add(1,Ordering::SeqCst)+1;*PRESENCE.lock().map_err(|_|"Presença indisponível.")?=input;
 tauri::async_runtime::spawn(async move{realtime_loop(app,owner,generation).await;});Ok(())
}
#[tauri::command]
pub fn realtime_presence(input:Value)->Result<(),String>{*PRESENCE.lock().map_err(|_|"Presença indisponível.")?=input;Ok(())}
async fn realtime_loop(app:tauri::AppHandle,owner:String,generation:u64){
 let url=format!("wss://luoqlhgfmixvfqbfcdoc.supabase.co/realtime/v1/websocket?apikey={SUPABASE_KEY}&vsn=1.0.0");
 while GENERATION.load(Ordering::SeqCst)==generation{
  let state=app.state::<AppState>();let session=match current(&state).await{Ok(s) if s.user.id==owner=>s,_=>break};
  let _=app.emit("desktop-connection",json!({"userId":owner,"status":"connecting"}));
  if let Ok(Ok((mut ws,_)))=tokio::time::timeout(Duration::from_secs(20),connect_async(&url)).await{
   let mut seq=10u64;let mut token=session.access_token;let changes=json!([{"event":"*","schema":"public","table":"clt_chat_messages","filter":format!("destinatario_id=eq.{owner}")},{"event":"*","schema":"public","table":"clt_chat_messages","filter":format!("remetente_id=eq.{owner}")},{"event":"*","schema":"public","table":"clt_chat_reactions"},{"event":"*","schema":"public","table":"notificacoes","filter":format!("destinatario_id=eq.{owner}")},{"event":"*","schema":"public","table":"clt_chat_group_messages"},{"event":"*","schema":"public","table":"clt_chat_group_reactions"}]);
   let topic="realtime:desktop-changes";let presence_topic="realtime:platinados-presenca";
   if ws.send(envelope(topic,"phx_join",json!({"config":{"broadcast":{"self":false},"presence":{"enabled":false},"postgres_changes":changes,"private":false},"access_token":token}),1,"1")).await.is_err(){continue;}
   if ws.send(envelope(presence_topic,"phx_join",json!({"config":{"presence":{"enabled":true,"key":owner},"broadcast":{"self":false},"private":false},"access_token":token}),2,"2")).await.is_err(){continue;}
   let mut tick=tokio::time::interval(Duration::from_secs(20));let mut last_response=std::time::Instant::now();
   loop{if GENERATION.load(Ordering::SeqCst)!=generation{let _=ws.close(None).await;return;}
    tokio::select!{
     _=tick.tick()=>{
      if last_response.elapsed()>Duration::from_secs(60){break;}
      let current_session=match current(&state).await{Ok(s) if s.user.id==owner=>s,_=>return};
      if current_session.access_token!=token{token=current_session.access_token;for (t,j) in [(topic,"1"),(presence_topic,"2")]{seq+=1;if ws.send(envelope(t,"access_token",json!({"access_token":token}),seq,j)).await.is_err(){break;}}}
      seq+=1;if ws.send(envelope("phoenix","heartbeat",json!({}),seq,"")).await.is_err(){break;}
      let payload=PRESENCE.lock().map(|v|v.clone()).unwrap_or(json!({}));let event=if payload["status"]=="invisivel"{"untrack"}else{"track"};seq+=1;
      if ws.send(envelope(presence_topic,"presence",json!({"type":"presence","event":event,"payload":payload}),seq,"2")).await.is_err(){break;}
     },
     frame=ws.next()=>{match frame{Some(Ok(Message::Text(text)))=>{last_response=std::time::Instant::now();if let Ok(v)=serde_json::from_str::<Value>(&text){let event=v["event"].as_str().unwrap_or("");if event=="postgres_changes"{let _=app.emit("desktop-change",json!({"userId":owner,"data":v["payload"]["data"]}));}if matches!(event,"presence_state"|"presence_diff"){let _=app.emit("desktop-presence",json!({"userId":owner,"event":event,"data":v["payload"]}));}if event=="system"&&v["topic"]==topic{let _=app.emit("desktop-connection",json!({"userId":owner,"status":if v["payload"]["status"]=="ok"{"connected"}else{"polling"}}));}if matches!(event,"phx_error"|"phx_close"){break;}}},Some(Ok(Message::Ping(p)))=>{let _=ws.send(Message::Pong(p)).await;},Some(Ok(_))=>{},_=>break}}
    }
   }
  }
  let _=app.emit("desktop-connection",json!({"userId":owner,"status":"polling"}));tokio::time::sleep(Duration::from_secs(5)).await;
 }
}

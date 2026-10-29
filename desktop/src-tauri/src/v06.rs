use super::*;
fn steam_title_key(title:&str)->String{title.chars().filter(|c|c.is_alphanumeric()).flat_map(char::to_lowercase).collect()}

fn steam_query_id(query:&str)->Option<u64>{
 let q=query.trim();
 let parsed=if q.chars().all(|c|c.is_ascii_digit()){q.parse::<u64>().ok()}else{
  let url=reqwest::Url::parse(q).ok()?;
  if url.scheme()!="https"||url.host_str()!=Some("store.steampowered.com"){return None;}
  let parts:Vec<_>=url.path_segments()?.collect();
  parts.iter().position(|p|*p=="app").and_then(|i|parts.get(i+1)).and_then(|id|id.parse::<u64>().ok())
 };
 parsed.filter(|id|*id>0&&*id<=2147483647)
}
#[cfg(test)]
fn steam_search_terms(query:&str)->Vec<String>{
 let q=query.trim().replace(['™','®'],"");let mut terms=vec![q.clone()];let lower=q.to_ascii_lowercase();
 for suffix in ["special edition","complete edition","definitive edition","deluxe edition","ultimate edition","game of the year","goty edition","remastered"]{
  if let Some(at)=lower.find(suffix){let base=q[..at].trim().trim_end_matches(['-',':',' ']).trim();if base.len()>=2&&!terms.iter().any(|t|t==base){terms.push(base.into());}}
 }
 let roman=q.split_whitespace().map(|word|match word.to_ascii_uppercase().as_str(){"II"=>"2","III"=>"3","IV"=>"4","V"=>"5","VI"=>"6","VII"=>"7","VIII"=>"8","IX"=>"9","X"=>"10",_=>word}).collect::<Vec<_>>().join(" ");
 if roman!=q&&!terms.contains(&roman){terms.push(roman);}terms.truncate(3);terms
}

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
 "features"=>{
   let action=input["action"].as_str().unwrap_or("");
   if !matches!(action,"lists"|"create_list"|"list_items"|"rename_list"|"share_list"|"delete_list"|"add_item"|"remove_item"|"save_recommendation"|"recommend"|"recommendations"|"recommendation_state"|"preferences"|"save_preferences"){return Err("Operação de recursos não permitida.".into());}
   let data=input.get("data").filter(|v|v.is_object()).cloned().unwrap_or_else(||json!({}));
   rpc(&state.client,"clt_features",json!({"p_action":action,"p_data":data}),token).await
 },
 "journey"=>{
   let action=input["action"].as_str().unwrap_or("");
   if !matches!(action,"stats"|"progress"|"save_progress"|"next_episode"|"next_season"){return Err("Operação de jornada não permitida.".into());}
   let data=input.get("data").filter(|v|v.is_object()).cloned().unwrap_or_else(||json!({}));
   rpc(&state.client,"clt_journey",json!({"p_action":action,"p_data":data}),token).await
 },
 "notification_message"=>{let id=safe_id(ident)?;get(&state.client,&format!("/rest/v1/clt_chat_messages?select=id,remetente_id,destinatario_id&id=eq.{id}&limit=1"),token).await},
 "record_pc_play"=>{let id=input["item_id"].as_i64().filter(|v|*v>0).ok_or("Jogo inválido.")?;let seconds=input["seconds"].as_i64().filter(|v|*v>=0&&*v<=604800).ok_or("Tempo inválido.")?;let session_id=input["session"].as_str().ok_or("Sessão inválida.")?;if session_id.len()!=36{return Err("Sessão inválida.".into())}rpc(&state.client,"clt_record_pc_play",json!({"p_item":id,"p_session":session_id,"p_seconds":seconds}),token).await},
 "clear_notifications"=>rpc(&state.client,"clt_desktop_clear_notifications",json!({}),token).await,
 "read_notification"=>{let id=safe_id(ident)?;write(&state,&session,reqwest::Method::PATCH,&format!("/rest/v1/notificacoes?id=eq.{id}&destinatario_id=eq.{me}"),json!({"read":true})).await},
 "ranking"=>match rpc(&state.client,"clt_progression_v2",json!({}),token).await{Ok(rows)=>Ok(rows),Err(_)=>rpc(&state.client,"ranking_clt",json!({}),token).await},
 "prepare_missions"=>{let period=input["period"].as_str().unwrap_or("");let ids=input["ids"].as_array().ok_or("Missões inválidas.")?;if period.len()>25||!period.chars().all(|c|c.is_ascii_alphanumeric()||c=='-'||c==':')||ids.len()>3||ids.iter().any(|x|!matches!(x.as_str(),Some("add_game_1"|"add_game_2"|"add_game_3"|"media_1"|"media_2"|"media_3"))){return Err("Missões inválidas.".into());}rpc(&state.client,"preparar_missoes_clt",json!({"p_periodo":period,"p_missoes":ids}),token).await},
 "mission_version"=>rpc(&state.client,"missoes_clt_versao",json!({}),token).await,
 "mutual_friends"=>{let id=safe_id(ident)?;let rows=get(&state.client,&format!("/rest/v1/amigos?select=amigo_id&user_id=eq.{id}"),token).await?;Ok(rows)},
 "missions"=>rpc(&state.client,"missoes_clt",json!({}),token).await,
 "missions_v2"=>rpc(&state.client,"clt_missions_v2",json!({}),token).await,
 "claim_mission"=>{let id=input["missionId"].as_u64().ok_or("Missão inválida.")?;rpc(&state.client,"resgatar_missao_clt",json!({"p_id":id}),token).await},
 "claim_mission_v2"=>{let id=safe_id(input["missionId"].as_str().unwrap_or(""))?;rpc(&state.client,"clt_claim_mission_v2",json!({"p_id":id}),token).await},
 "profile_bundle"=>{
   let id=safe_id(ident)?;if id!=me{let f=get(&state.client,&format!("/rest/v1/amigos?select=amigo_id&user_id=eq.{me}&amigo_id=eq.{id}&limit=1"),token).await?;if f.as_array().is_none_or(|a|a.is_empty()){return Err("Este perfil é restrito aos amigos.".into());}}
   let (personalization,mut detail)=tokio::try_join!(
     rpc(&state.client,"clt_desktop_profile",json!({"p_id":id}),token),
     rpc(&state.client,"perfil_detalhes_autorizado",json!({"p_perfil_id":id}),token)
   )?;
   if let Some(a)=detail.as_array_mut(){if a.is_empty(){a.push(json!({}));}if let (Some(obj),Some(p))=(a[0].as_object_mut(),personalization.as_object()){obj.extend(p.clone());}}

   if input["light"].as_bool()==Some(true){return Ok(json!({"detail":detail}));}
   let (items,ranking)=tokio::try_join!(
     async {
       let mut items=Vec::new();
       for offset in (0..10000).step_by(1000){
         let r=get(&state.client,&format!("/rest/v1/itens?select=id,user_id,categoria,nome,plataforma,status,nota,data,inicio,horas,loja,ano,prioridade,tempo_est,conquistas,capa,tipo,onde,duracao,steam_appid,generos,created_at,updated_at&user_id=eq.{id}&order=id.asc&offset={offset}&limit=1000"),token).await?;
         let rows=r.as_array().cloned().unwrap_or_default();
         let count=rows.len();items.extend(rows);
         if count<1000{break;}
       }
       Ok::<_,String>(items)
     },
     async {
       match rpc(&state.client,"clt_progression_v2",json!({}),token).await{
         Ok(rows)=>Ok(rows),
         Err(_)=>rpc(&state.client,"ranking_clt",json!({}),token).await
       }
     }
   )?;
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
 "group_manage"=>{
  let action=input["action"].as_str().unwrap_or("");
  if action=="create"{let name=input["name"].as_str().unwrap_or("").trim();if name.is_empty()||name.chars().count()>60{return Err("Informe um nome de até 60 caracteres.".into());}let members=input["members"].as_array().cloned().unwrap_or_default();if members.len()>50{return Err("Escolha até 50 amigos.".into());}for member in &members{safe_id(member.as_str().unwrap_or(""))?;}return rpc(&state.client,"criar_grupo_convites_clt",json!({"p_nome":name,"p_membros":members}),token).await;}
  let id=safe_id(ident)?;
  let membership=get(&state.client,&format!("/rest/v1/clt_chat_group_members?select=user_id,admin&group_id=eq.{id}&user_id=eq.{me}&limit=1"),token).await?;
  let member=membership.as_array().and_then(|rows|rows.first()).ok_or_else(||"Você não participa deste grupo.".to_string())?;
  if action=="members"{let mut members=get(&state.client,&format!("/rest/v1/clt_chat_group_members?select=user_id,admin&group_id=eq.{id}&limit=1000"),token).await?;let ids=members.as_array().into_iter().flatten().filter_map(|m|m["user_id"].as_str()).collect::<Vec<_>>().join(",");if !ids.is_empty(){let profiles=get(&state.client,&format!("/rest/v1/perfis_publicos_clt?select=id,nome,slug&id=in.({ids})"),token).await?;for member in members.as_array_mut().into_iter().flatten(){if let Some(profile)=profiles.as_array().into_iter().flatten().find(|p|p["id"]==member["user_id"]){member["nome"]=profile["nome"].clone();}}}return Ok(members);}
  if action=="leave"{return rpc(&state.client,"sair_grupo_clt",json!({"p_group_id":id}),token).await;}
  if member["admin"].as_bool()!=Some(true){return Err("Somente administradores podem alterar o grupo.".into());}
  match action{
   "rename"=>{let name=input["name"].as_str().unwrap_or("").trim();if name.is_empty()||name.chars().count()>60{return Err("Nome inválido.".into());}write(&state,&session,reqwest::Method::PATCH,&format!("/rest/v1/clt_chat_groups?id=eq.{id}"),json!({"nome":name})).await},
   "invite"|"remove"|"admin"=>{let user=safe_id(input["user_id"].as_str().unwrap_or(""))?;let mut args=json!({"p_group_id":id,"p_user_id":user});let function=match action{"invite"=>"convidar_grupo_clt","remove"=>"remover_membro_grupo_clt",_=>{args["p_admin"]=json!(input["admin"].as_bool().unwrap_or(false));"definir_admin_grupo_clt"}};rpc(&state.client,function,args,token).await},
   "photo"=>{let upload:UploadInput=serde_json::from_value(input["image"].clone()).map_err(|_|"Imagem inválida.".to_string())?;let uploaded=moderated_upload_at(upload,&state,"group-avatars",&id).await?;write(&state,&session,reqwest::Method::PATCH,&format!("/rest/v1/clt_chat_groups?id=eq.{id}"),json!({"foto_path":uploaded["path"]})).await},
   _=>Err("Configuração de grupo inválida.".into())
  }
 },
 "group_messages"=>{let id=safe_id(ident)?;get(&state.client,&format!("/rest/v1/clt_chat_group_messages?select=*&group_id=eq.{id}&order=created_at.desc&limit=300"),token).await},
 "group_send"=>{let id=safe_id(ident)?;let text=input["text"].as_str().unwrap_or("").trim();let media=input["media"].as_str();if let Some(path)=media{if !path.starts_with(&format!("{me}/"))||path.contains(".."){return Err("Imagem de grupo inválida.".into());}}if (text.is_empty()&&media.is_none())||text.chars().count()>2000{return Err("Escreva até 2.000 caracteres.".into());}write(&state,&session,reqwest::Method::POST,"/rest/v1/clt_chat_group_messages",json!({"group_id":id,"remetente_id":me,"texto":text,"midia_path":media})).await},
 "read_group"=>{let id=safe_id(ident)?;let response=state.client.post(format!("{SUPABASE_URL}/rest/v1/clt_chat_group_reads?on_conflict=group_id,user_id")).header("apikey",SUPABASE_KEY).bearer_auth(token).header("content-type","application/json").header("prefer","resolution=merge-duplicates").json(&json!({"group_id":id,"user_id":me,"last_read_at":chrono::Utc::now().to_rfc3339()})).send().await.map_err(|_|"Falha ao marcar leitura.".to_string())?;value(response).await},
 "group_invite"=>{let id=safe_id(ident)?;rpc(&state.client,"responder_convite_grupo_clt",json!({"p_invite_id":id,"p_accept":input["accept"].as_bool().unwrap_or(false)}),token).await},
 "steam_search"=>game_catalog::search(input["query"].as_str().unwrap_or(""),state).await,
 "steam_details"=>game_catalog::details(input,state).await,
 _=>Err("Operação não permitida.".into())
 }
}
#[tauri::command]
pub async fn upload_chat_image(input:UploadInput,group:Option<bool>,state:tauri::State<'_,AppState>)->Result<Value,String>{moderated_upload(input,&state,if group==Some(true){"group-chat-media"}else{"chat-media"}).await}
pub async fn moderated_upload(input:UploadInput,state:&AppState,bucket:&str)->Result<Value,String>{
 let session=current(state).await?;moderated_upload_at(input,state,bucket,&session.user.id).await
}
async fn moderated_upload_at(input:UploadInput,state:&AppState,bucket:&str,owner:&str)->Result<Value,String>{
 let session=current(state).await?;if input.base64.len()>14_000_000||!matches!(input.mime.as_str(),"image/png"|"image/jpeg"|"image/webp"){return Err("Imagem inválida.".into());}
 let bytes=base64::engine::general_purpose::STANDARD.decode(input.base64).map_err(|_|"Imagem inválida.".to_string())?;
 if bytes.is_empty()||bytes.len()>if bucket=="chat-media"||bucket=="group-chat-media"{5*1024*1024}else{10*1024*1024}{return Err("Imagem maior que o limite permitido.".into());}
 let ext=match input.mime.as_str(){"image/png"=>"png","image/jpeg"=>"jpg",_=>"webp"};let path=format!("{}/desktop-{}.{ext}",owner,SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis());
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
   let mut tick=tokio::time::interval(Duration::from_secs(5));let mut last_response=std::time::Instant::now();
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
     frame=ws.next()=>{match frame{Some(Ok(Message::Text(text)))=>{last_response=std::time::Instant::now();if let Ok(v)=serde_json::from_str::<Value>(&text){let event=v["event"].as_str().unwrap_or("");if event=="postgres_changes"{let data=&v["payload"]["data"];if data["table"]=="notificacoes"&&data["type"]=="INSERT"{desktop_runtime::realtime_notification(&app,&owner,&data["record"]);}let _=app.emit("desktop-change",json!({"userId":owner,"data":data}));}if matches!(event,"presence_state"|"presence_diff"){let _=app.emit("desktop-presence",json!({"userId":owner,"event":event,"data":v["payload"]}));}if event=="system"&&v["topic"]==topic{let _=app.emit("desktop-connection",json!({"userId":owner,"status":if v["payload"]["status"]=="ok"{"connected"}else{"polling"}}));}if matches!(event,"phx_error"|"phx_close"){break;}}},Some(Ok(Message::Ping(p)))=>{let _=ws.send(Message::Pong(p)).await;},Some(Ok(_))=>{},_=>break}}
    }
   }
  }
  let _=app.emit("desktop-connection",json!({"userId":owner,"status":"polling"}));tokio::time::sleep(Duration::from_secs(5)).await;
 }
}

#[cfg(test)]
mod title_tests{
 use super::{steam_title_key,steam_search_terms,steam_query_id};
 #[test] fn search_supports_store_links_and_app_ids(){assert_eq!(steam_query_id("https://store.steampowered.com/app/601150/Devil_May_Cry_5/"),Some(601150));assert_eq!(steam_query_id("601150"),Some(601150));assert_eq!(steam_query_id("https://evil.test/app/601150"),None);assert_eq!(steam_query_id("0"),None);}
 #[test] fn search_retries_editions_and_roman_sequels(){assert!(steam_search_terms("Devil May Cry 5 Special Edition").contains(&"Devil May Cry 5".to_string()));assert!(steam_search_terms("Dark Souls III").contains(&"Dark Souls 3".to_string()));}
 #[test] fn steam_names_ignore_brand_marks_but_keep_sequels_and_editions(){
  assert_eq!(steam_title_key("DARK SOULS™ III"),steam_title_key("Dark Souls III"));
  assert_ne!(steam_title_key("Dark Souls II"),steam_title_key("Dark Souls III"));
  assert_ne!(steam_title_key("Dark Souls III Deluxe Edition"),steam_title_key("Dark Souls III"));
 }
}

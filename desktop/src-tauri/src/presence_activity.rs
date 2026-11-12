use serde_json::Value;
/// A live websocket must not keep broadcasting an old renderer activity sample.
pub fn payload(mut value:Value,now_ms:u64)->Value{
 let sampled=value["online_at"].as_u64();let stale=sampled.is_some_and(|t|now_ms.saturating_sub(t)>45000||t>now_ms.saturating_add(300000));
 if stale||value["activity_shared"]==false||value["status"]=="invisivel"{value["jogo"]="".into();value["jogo_fonte"]="".into();}value["online_at"]=now_ms.into();value
}
#[cfg(test)]mod tests{use super::*;use serde_json::json;#[test]fn old_track_and_hidden_activity_are_cleared(){for v in [json!({"jogo":"Control","jogo_fonte":"pc","online_at":1}),json!({"jogo":"Control","activity_shared":false,"online_at":100000}),json!({"jogo":"Control","status":"invisivel","online_at":100000})]{let p=payload(v,100000);assert_eq!(p["jogo"],"");assert_eq!(p["jogo_fonte"],"");}}#[test]fn fresh_activity_keeps_its_source(){let p=payload(json!({"jogo":"Control","jogo_fonte":"pc","online_at":90000}),100000);assert_eq!(p["jogo"],"Control");assert_eq!(p["jogo_fonte"],"pc");}}

#[cfg(test)]mod freshness_tests{use super::*;use serde_json::json;#[test]fn live_socket_renews_presence_without_renewing_stale_game(){let p=payload(json!({"status":"online","jogo":"Closed","jogo_fonte":"pc","online_at":1}),100000);assert_eq!(p["online_at"],100000);assert_eq!(p["jogo"],"");assert_eq!(p["status"],"online");}}

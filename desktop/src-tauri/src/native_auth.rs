use serde::Deserialize;
use serde_json::{json, Value};
use crate::{AppState, SUPABASE_URL, SUPABASE_KEY};

#[derive(Deserialize)]
pub struct EmailProof { email: String, proof: String, recovery: bool, password: Option<String> }

fn proof_payload(email: &str, proof: &str, recovery: bool) -> Result<Value,String> {
 if proof.len()>4096{return Err("O código ou link é muito longo.".into());}
 let raw=proof.trim();let kind=if recovery{"recovery"}else{"email"};
 if (6..=10).contains(&raw.len())&&raw.bytes().all(|b|b.is_ascii_digit()){return Ok(json!({"email":email,"token":raw,"type":kind}));}
 let invalid=||"Informe o código ou copie o link original do e-mail, sem abri-lo.".to_string();
 let url=reqwest::Url::parse(raw).map_err(|_|invalid())?;
 if url.scheme()!="https"||url.host_str()!=Some("luoqlhgfmixvfqbfcdoc.supabase.co")||url.port().is_some()||!url.username().is_empty()||url.password().is_some()||url.fragment().is_some()||url.path()!="/auth/v1/verify"{return Err(invalid());}
 let mut params=std::collections::HashMap::new();for (k,v) in url.query_pairs(){if params.insert(k.to_string(),v.to_string()).is_some(){return Err(invalid());}}
 let kind=params.get("type").ok_or_else(invalid)?;
 if (recovery&&kind!="recovery")||(!recovery&&kind!="signup"&&kind!="email"){return Err(invalid());}
 if params.contains_key("token")&&params.contains_key("token_hash"){return Err(invalid());}
 let token=params.get("token_hash").or_else(||params.get("token")).ok_or_else(invalid)?;
 if !(20..=256).contains(&token.len())||!token.bytes().all(|b|b.is_ascii_alphanumeric()||b==b'_'||b==b'-'){return Err(invalid());}
 Ok(json!({"type":kind,"token_hash":token}))
}
fn email(value:&str)->Result<String,String>{let value=value.trim().to_lowercase();if value.len()>254||!value.contains('@')||value.chars().any(char::is_whitespace){return Err("Informe um e-mail válido.".into());}Ok(value)}
async fn request(client:&reqwest::Client,path:&str,method:reqwest::Method,body:Value,token:Option<&str>)->Result<Value,String>{
 let mut request=client.request(method,format!("{SUPABASE_URL}/auth/v1/{path}")).header("apikey",SUPABASE_KEY).json(&body);
 if let Some(token)=token{request=request.bearer_auth(token);}
 let response=request.send().await.map_err(|_|"Não foi possível conectar. Se o código já foi utilizado, solicite outro.".to_string())?;
 if !response.status().is_success(){return Err(if response.status().as_u16()==429{"Aguarde antes de tentar novamente."}else{"Não foi possível concluir. Confira o código e solicite outro se ele expirou ou já foi utilizado."}.into());}
 let text=response.text().await.map_err(|_|"A resposta foi interrompida. Tente novamente ou solicite outro e-mail.".to_string())?;
 if text.trim().is_empty(){Ok(Value::Null)}else{serde_json::from_str(&text).map_err(|_|"Resposta inválida do serviço de autenticação.".into())}
}
#[tauri::command]
pub async fn resend_confirmation(email:String,state:tauri::State<'_,AppState>)->Result<Value,String>{
 request(&state.client,"resend",reqwest::Method::POST,json!({"email":self::email(&email)?,"type":"signup"}),None).await?;
 Ok(json!({"sent":true}))
}
#[tauri::command]
pub async fn verify_email_proof(input:EmailProof,state:tauri::State<'_,AppState>)->Result<Value,String>{
 let email=self::email(&input.email)?;
 if input.recovery&&input.password.as_ref().map(|p|!(12..=256).contains(&p.chars().count())).unwrap_or(true){return Err("Use uma senha de 12 a 256 caracteres.".into());}
 let payload=proof_payload(&email,&input.proof,input.recovery)?;
 let session=request(&state.client,"verify",reqwest::Method::POST,payload,None).await?;
 let token=session["access_token"].as_str().filter(|t|!t.is_empty()).ok_or("O serviço não confirmou a verificação. Solicite outro e-mail.")?;
 let result=async{
  if !session["user"]["email"].as_str().unwrap_or("").eq_ignore_ascii_case(&email){return Err("Este código ou link não pertence ao e-mail informado. Solicite outro se necessário.".to_string());}
  if input.recovery{
   request(&state.client,"user",reqwest::Method::PUT,json!({"password":input.password}),Some(token)).await?;
   request(&state.client,"logout?scope=global",reqwest::Method::POST,json!({}),Some(token)).await.map_err(|_|"A senha foi alterada, mas a saída dos outros dispositivos não foi confirmada. Entre com a nova senha e altere-a novamente para tentar encerrar as outras sessões.".to_string())?;
  }
  Ok(json!({"message":if input.recovery{"Senha atualizada. Entre com sua nova senha."}else{"E-mail confirmado. Você já pode entrar."}}))
 }.await;
 // A proof never replaces the normal session or enters the OS keyring.
 let _=request(&state.client,"logout?scope=local",reqwest::Method::POST,json!({}),Some(token)).await;
 result
}
#[cfg(test)] mod tests{
 use super::*;
 #[test] fn otp_and_original_links(){
  assert_eq!(proof_payload("user@example.com","123456",true).unwrap()["type"],"recovery");
  let link="https://luoqlhgfmixvfqbfcdoc.supabase.co/auth/v1/verify?token=012345678901234567890123456789&type=email&redirect_to=https%3A%2F%2Fexample.com";
  assert_eq!(proof_payload("user@example.com",link,false).unwrap()["token_hash"],"012345678901234567890123456789");
  assert!(proof_payload("user@example.com",link,true).is_err());
 }
 #[test] fn reject_foreign_links_and_wrong_purposes(){
  for link in ["https://evil.test/auth/v1/verify?token=01234567890123456789&type=recovery","https://luoqlhgfmixvfqbfcdoc.supabase.co/auth/v1/verify?token=01234567890123456789&type=recovery&type=email","https://luoqlhgfmixvfqbfcdoc.supabase.co/auth/v1/verify?token=short&type=recovery","12345"]{assert!(proof_payload("user@example.com",link,true).is_err());}
 }
}

//! Game metadata comes from IGDB. Steam IDs are explicit IGDB links or user input.
use super::*;
fn key(text:&str)->String{text.chars().filter(|c|c.is_alphanumeric()).flat_map(char::to_lowercase).collect()}
pub async fn search(query:&str,state:tauri::State<'_,AppState>)->Result<Value,String>{
 let data=catalog(json!({"provider":"igdb","query":query}),state).await?;
 let rows:Vec<Value>=data["results"].as_array().into_iter().flatten().filter(|g|g["steam_appid"].as_u64().is_some()).map(|g|json!({"appid":g["steam_appid"],"igdb_id":g["id"],"nome":g["name"],"capa":g["cover_image"]})).collect();
 Ok(json!({"results":rows}))
}
pub async fn details(input:Value,state:tauri::State<'_,AppState>)->Result<Value,String>{
 let query=input["query"].as_str().unwrap_or("").trim();
 if query.len()<2{return Err("Informe o nome do jogo para consultar o IGDB.".into())}
 let data=catalog(json!({"provider":"igdb","query":query}),state.clone()).await?;
 let appid=input["appid"].as_u64().filter(|id|*id>0&&*id<=4294967295);
 let rows:Vec<&Value>=data["results"].as_array().into_iter().flatten().filter(|g|key(g["name"].as_str().unwrap_or(""))==key(query)||appid.is_some()&&g["steam_appid"].as_u64()==appid).collect();
 if rows.len()!=1{return Err("Selecione o título e a edição corretos no catálogo IGDB.".into())}
 let d=catalog(json!({"provider":"igdb","id":rows[0]["id"]}),state).await?;
 if let (Some(wanted),Some(found))=(appid,d["steam_appid"].as_u64()){if wanted!=found{return Err("O App ID não corresponde à edição encontrada no IGDB.".into())}}
 let genres:Vec<Value>=d["genres"].as_array().into_iter().flatten().map(|g|json!({"description":g["name"]})).collect();
 let shots:Vec<Value>=d["screenshots"].as_array().into_iter().flatten().map(|url|json!({"path_full":url})).collect();
 Ok(json!({"source":"IGDB","steam_appid":appid.or_else(||d["steam_appid"].as_u64()),"nome":d["name"],"generos":genres,"capa":d["cover_image"],"descricao":d["description_raw"],"desenvolvedores":d["developers"].as_array().into_iter().flatten().map(|v|v["name"].clone()).collect::<Vec<_>>(),"lancamento":d["released"],"screenshots":shots,"movies":[],"rating":d["rating"].as_f64().map(|v|v*2.0),"ratingCount":d["ratings_count"],"platformNames":d["platforms"].as_array().into_iter().flatten().filter_map(|v|v["platform"]["name"].as_str()).collect::<Vec<_>>() }))
}

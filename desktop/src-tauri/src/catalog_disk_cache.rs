//! Only public catalog cover images; private account media never enters this cache.
use super::*;
use std::{collections::hash_map::DefaultHasher,hash::{Hash,Hasher},path::{Path,PathBuf}};
const TTL:u64=30*24*3600;
const LIMIT:u64=256*1024*1024;
fn allowed(url:&str)->bool{let Ok(u)=reqwest::Url::parse(url)else{return false};if u.scheme()!="https"||u.port().is_some()||!u.username().is_empty()||u.password().is_some()||u.query().is_some()||u.fragment().is_some()||u.path().contains("..")||!u.path().bytes().all(|b|b.is_ascii_alphanumeric()||b"/_-.%".contains(&b)){return false}let host=u.host_str().unwrap_or("");match host{
 "images.igdb.com"=>u.path().starts_with("/igdb/image/upload/t_"),
 "cdn.steamgriddb.com"|"cdn2.steamgriddb.com"=>u.path().starts_with("/grid/")||u.path().starts_with("/hero/")||u.path().starts_with("/logo/")||u.path().starts_with("/icon/"),
 "shared.cloudflare.steamstatic.com"|"cdn.cloudflare.steamstatic.com"=>u.path().starts_with("/store_item_assets/steam/apps/")||u.path().starts_with("/steam/apps/"),
 "image.tmdb.org"=>u.path().starts_with("/t/p/"),
 "s4.anilist.co"=>u.path().starts_with("/file/anilistcdn/media/"),
 "media.retroachievements.org"|"cdn.retroachievements.org"=>true,
 _=>false}}
fn file(root:&Path,url:&str)->PathBuf{let mut hash=DefaultHasher::new();url.hash(&mut hash);root.join(format!("{:016x}.json",hash.finish()))}
fn now()->u64{SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs()}
pub fn directory(app:&tauri::AppHandle)->Option<PathBuf>{app.path().app_cache_dir().ok().map(|p|p.join("public-covers-v2"))}
pub fn read(root:&Path,url:&str)->Option<String>{if !allowed(url){return None}let path=file(root,url);let metadata=std::fs::metadata(&path).ok()?;if metadata.len()>12*1024*1024{return None}let value:Value=serde_json::from_slice(&std::fs::read(&path).ok()?).ok()?;if value["url"].as_str()!=Some(url)||now().saturating_sub(value["created"].as_u64()?)>=TTL{let _=std::fs::remove_file(path);return None}let data=value["data"].as_str()?;if !["data:image/jpeg;base64,","data:image/png;base64,","data:image/webp;base64,","data:image/gif;base64,","data:image/avif;base64,"].iter().any(|p|data.starts_with(p)){return None}let encoded=data.split_once(',')?.1;let bytes=base64::engine::general_purpose::STANDARD.decode(encoded).ok()?;if bytes.is_empty()||bytes.len()>8*1024*1024{return None}Some(data.into())}
pub fn write(root:&Path,url:&str,data:&str){if !allowed(url)||data.len()>11*1024*1024{return}let _=std::fs::create_dir_all(root);let path=file(root,url);let temp=root.join(format!("{}.tmp",SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_nanos()));if let Ok(bytes)=serde_json::to_vec(&json!({"url":url,"created":now(),"data":data})){if std::fs::write(&temp,bytes).is_ok(){let _=std::fs::remove_file(&path);let _=std::fs::rename(&temp,&path);}let _=std::fs::remove_file(temp);}
 let mut entries=std::fs::read_dir(root).into_iter().flatten().filter_map(Result::ok).filter_map(|e|{let m=e.metadata().ok()?;if !m.is_file(){return None}Some((m.modified().ok()?,m.len(),e.path()))}).collect::<Vec<_>>();entries.sort_by_key(|v|v.0);let mut size:u64=entries.iter().map(|e|e.1).sum();for(time,len,path)in entries{let expired=SystemTime::now().duration_since(time).unwrap_or_default().as_secs()>TTL;if size<=LIMIT&&!expired{continue}if std::fs::remove_file(path).is_ok(){size=size.saturating_sub(len);}}
}
#[cfg(test)]mod tests{use super::*;#[test]fn public_catalog_covers_are_cached(){for url in ["https://images.igdb.com/igdb/image/upload/t_cover_big/abc.jpg","https://cdn2.steamgriddb.com/grid/abc.png","https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/42/library_600x900.jpg","https://image.tmdb.org/t/p/w500/abc.jpg","https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/abc.jpg","https://media.retroachievements.org/Images/abc.png"]{assert!(allowed(url),"{url}");}}
#[test]fn private_or_ambiguous_media_never_cached(){for url in ["https://images.igdb.com.evil.test/igdb/image/upload/t_a/x.jpg","https://images.igdb.com/igdb/image/upload/t_a/x.jpg?token=secret","https://luoqlhgfmixvfqbfcdoc.supabase.co/storage/v1/object/authenticated/avatars/x","https://shared.cloudflare.steamstatic.com/profile/avatar.jpg"]{assert!(!allowed(url),"{url}");}}}

use serde::Deserialize;
use serde_json::{json, Value};
#[derive(Deserialize)]
pub struct Mapping { name: String, process: String }
#[derive(Deserialize)]
pub struct Detection { names: Vec<String>, mappings: Vec<Mapping> }
fn key(s: &str) -> String { s.chars().filter(char::is_ascii_alphanumeric).flat_map(char::to_lowercase).collect() }
fn match_game(names: &[String], mappings: &[Mapping], running: &[String]) -> Option<String> {
    for mapping in mappings {
        if names.contains(&mapping.name) && running.iter().any(|p|p.eq_ignore_ascii_case(mapping.process.trim_end_matches(".exe"))) { return Some(mapping.name.clone()); }
    }
    for name in names { let k=key(name); if k.len()>=5 && running.iter().any(|p|key(p)==k) {return Some(name.clone());} }
    None
}
#[cfg(windows)]
fn processes() -> Result<Vec<String>, String> {
    use std::{process::{Command,Stdio},os::windows::process::CommandExt,time::{Duration,Instant}};
    // Fixed command. Only executable names of visible applications are read; no window titles or paths.
    let mut child=Command::new("powershell.exe").args(["-NoProfile","-NonInteractive","-Command","Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 200 -ExpandProperty ProcessName | ConvertTo-Json -Compress"]).creation_flags(0x08000000).stdout(Stdio::piped()).stderr(Stdio::null()).spawn().map_err(|_|"Não foi possível consultar programas abertos.")?;
    let deadline=Instant::now()+Duration::from_secs(5);
    loop {match child.try_wait(){Ok(Some(_))=>break,Ok(None) if Instant::now()<deadline=>std::thread::sleep(Duration::from_millis(50)),_=>{let _=child.kill();let _=child.wait();return Err("A consulta de programas excedeu o tempo limite.".into())}}}
    let output=child.wait_with_output().map_err(|_|"Consulta indisponível.")?;
    if !output.status.success(){return Err("Consulta de programas indisponível.".into())}
    let raw=String::from_utf8_lossy(&output.stdout);let raw=raw.trim_start_matches('\u{feff}');
    let data:Value=serde_json::from_str(raw.trim()).unwrap_or(Value::Null);
    let rows=match data {Value::Array(v)=>v,Value::String(v)=>vec![Value::String(v)],_=>vec![]};
    Ok(rows.into_iter().filter_map(|v|v.as_str().map(str::to_owned)).filter(|s|s.len()<=160&&!s.chars().any(char::is_control)).collect())
}
#[cfg(not(windows))]
fn processes()->Result<Vec<String>,String>{Ok(vec![])}
#[tauri::command]
pub async fn running_processes()->Result<Value,String>{let rows=tauri::async_runtime::spawn_blocking(processes).await.map_err(|_|"Consulta indisponível.")??;Ok(json!(rows))}
#[tauri::command]
pub async fn detect_pc_game(input:Detection)->Result<Value,String>{
 if input.names.len()>2000||input.mappings.len()>200||input.names.iter().any(|s|s.len()>300)||input.mappings.iter().any(|m|m.name.len()>300||m.process.len()>160){return Err("Lista de jogos inválida.".into())}
 let running=tauri::async_runtime::spawn_blocking(processes).await.map_err(|_|"Consulta indisponível.")??;
 Ok(json!({"name":match_game(&input.names,&input.mappings,&running)}))
}
#[cfg(test)]
mod tests {use super::*;
 #[test]fn recognizes_only_library_games(){assert_eq!(match_game(&["Control".into()],&[],&["Control".into()]),Some("Control".into()));assert_eq!(match_game(&["Control".into()],&[],&["chrome".into()]),None);}
 #[test]fn mapping_must_belong_to_library(){let m=vec![Mapping{name:"Control".into(),process:"Control_DX12.exe".into()}];assert_eq!(match_game(&["Control".into()],&m,&["control_dx12".into()]),Some("Control".into()));assert_eq!(match_game(&[],&m,&["control_dx12".into()]),None);}
 #[test]fn does_not_guess_short_or_partial_names(){assert_eq!(match_game(&["RE2".into(),"Control".into()],&[],&["re2".into(),"ControlPanel".into()]),None);}
}
#[cfg(all(test,windows))]
#[test]
fn windows_query_returns_only_process_names(){let rows=processes().expect("Windows process query");assert!(rows.iter().all(|s|!s.contains('\\')&&!s.contains('/')&&!s.contains('\n')));}

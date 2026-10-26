use serde::Deserialize;
use serde_json::{json, Value};
#[derive(Deserialize)]
pub struct Mapping { name: String, process: String }
#[derive(Deserialize)]
pub struct Detection { names: Vec<String>, mappings: Vec<Mapping> }
fn key(s: &str) -> String { s.chars().filter(char::is_ascii_alphanumeric).flat_map(char::to_lowercase).collect() }
fn process_key(s: &str) -> String { let name=s.trim().trim_matches('"').rsplit(['\\','/']).next().unwrap_or("").to_ascii_lowercase(); name.strip_suffix(".exe").unwrap_or(&name).to_string() }
fn match_mapping(names: &[String], mappings: &[Mapping], running: &[String]) -> Option<String> {
    for mapping in mappings {
        if names.contains(&mapping.name) && running.iter().any(|p|process_key(p)==process_key(&mapping.process)) { return Some(mapping.name.clone()); }
    }
    None
}
fn match_game(names: &[String], mappings: &[Mapping], running: &[String]) -> Option<String> {
    if let Some(name)=match_mapping(names,mappings,running){return Some(name)}
    for name in names { let k=key(name); if k.len()>=5 && running.iter().any(|p|key(p)==k) {return Some(name.clone());} }
    None
}
#[cfg(windows)]
fn processes(visible_only: bool) -> Result<Vec<String>, String> {
    use std::collections::HashSet;
    use windows_sys::Win32::{Foundation::{CloseHandle,HANDLE,HWND,LPARAM,INVALID_HANDLE_VALUE},System::Diagnostics::ToolHelp::{CreateToolhelp32Snapshot,Process32FirstW,Process32NextW,PROCESSENTRY32W,TH32CS_SNAPPROCESS},UI::WindowsAndMessaging::{EnumWindows,IsWindowVisible,GetWindowThreadProcessId}};
    // EnumWindows is synchronous: this pointer remains valid for every callback.
    unsafe extern "system" fn collect(window: HWND, data: LPARAM) -> i32 {
        if IsWindowVisible(window)!=0 {let mut pid=0;GetWindowThreadProcessId(window,&mut pid);if pid!=0 {(*(data as *mut HashSet<u32>)).insert(pid);}}
        1
    }
    struct Snapshot(HANDLE);
    impl Drop for Snapshot {fn drop(&mut self){unsafe{CloseHandle(self.0);}}}
    unsafe {
        let mut visible=HashSet::<u32>::new();
        if EnumWindows(Some(collect),(&mut visible as *mut HashSet<u32>) as LPARAM)==0{return Err("Não foi possível consultar as janelas abertas.".into())}
        let handle=CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS,0);
        if handle==INVALID_HANDLE_VALUE{return Err("Não foi possível consultar os programas abertos.".into())}
        let snapshot=Snapshot(handle);let mut entry:PROCESSENTRY32W=std::mem::zeroed();entry.dwSize=std::mem::size_of::<PROCESSENTRY32W>() as u32;
        if Process32FirstW(snapshot.0,&mut entry)==0{return Err("Consulta de programas indisponível.".into())}
        let mut names=Vec::new();
        loop {
            if !visible_only || visible.contains(&entry.th32ProcessID){let length=entry.szExeFile.iter().position(|c|*c==0).unwrap_or(entry.szExeFile.len());let name=String::from_utf16_lossy(&entry.szExeFile[..length]);let name=name.strip_suffix(".exe").unwrap_or(&name).to_string();if !name.is_empty()&&name.len()<=160&&!name.chars().any(char::is_control){names.push(name)}}
            if Process32NextW(snapshot.0,&mut entry)==0{break}
        }
        names.sort();names.dedup();Ok(names)
    }
}
#[cfg(not(windows))]
fn processes(_visible_only: bool)->Result<Vec<String>,String>{Ok(vec![])}
#[tauri::command]
pub async fn running_processes()->Result<Value,String>{let rows=tauri::async_runtime::spawn_blocking(||processes(true)).await.map_err(|_|"Consulta indisponível.")??;Ok(json!(rows))}
#[tauri::command]
pub async fn detect_pc_game(input:Detection)->Result<Value,String>{
 if input.names.len()>2000||input.mappings.len()>200||input.names.iter().any(|s|s.len()>300)||input.mappings.iter().any(|m|m.name.len()>300||m.process.len()>160){return Err("Lista de jogos inválida.".into())}
 let (running,visible)=tauri::async_runtime::spawn_blocking(|| -> Result<_,String> {Ok((processes(false)?,processes(true)?))}).await.map_err(|_|"Consulta indisponível.")??;
 Ok(json!({"name":match_mapping(&input.names,&input.mappings,&running).or_else(||match_game(&input.names,&[],&visible))}))
}
#[cfg(test)]
mod tests {use super::*;
 #[test]fn recognizes_only_library_games(){assert_eq!(match_game(&["Control".into()],&[],&["Control".into()]),Some("Control".into()));assert_eq!(match_game(&["Control".into()],&[],&["chrome".into()]),None);}
 #[test]fn mapping_must_belong_to_library(){let m=vec![Mapping{name:"Control".into(),process:"Control_DX12.exe".into()}];assert_eq!(match_game(&["Control".into()],&m,&["control_dx12".into()]),Some("Control".into()));assert_eq!(match_game(&[],&m,&["control_dx12".into()]),None);}
 #[test]fn executable_paths_and_uppercase_extensions(){let m=vec![Mapping{name:"Red Dead Redemption 2".into(),process:r#""C:\Games\RDR2.EXE""#.into()}];assert_eq!(match_mapping(&["Red Dead Redemption 2".into()],&m,&["rdr2".into()]),Some("Red Dead Redemption 2".into()));}
 #[test]fn does_not_guess_short_or_partial_names(){assert_eq!(match_game(&["RE2".into(),"Control".into()],&[],&["re2".into(),"ControlPanel".into()]),None);}
}
#[cfg(all(test,windows))]
#[test]
fn windows_query_returns_only_process_names(){let rows=processes(true).expect("Windows process query");assert!(rows.iter().all(|s|!s.contains('\\')&&!s.contains('/')&&!s.contains('\n')));}

use serde::Deserialize;
use serde_json::{json, Value};
#[derive(Deserialize)]
pub struct Mapping { name: String, process: String }
#[derive(Deserialize)]
pub struct Detection { names: Vec<String>, mappings: Vec<Mapping> }
fn key(s: &str) -> String { s.chars().filter(char::is_ascii_alphanumeric).flat_map(char::to_lowercase).collect() }
fn process_key(s: &str) -> String { let name=s.trim().trim_matches('"').rsplit(['\\','/']).next().unwrap_or("").to_ascii_lowercase(); name.strip_suffix(".exe").unwrap_or(&name).to_string() }
fn match_mapping(names: &[String], mappings: &[Mapping], running: &[String]) -> Option<(String,String)> {
    for mapping in mappings {
        if let Some(process)=running.iter().find(|p|names.contains(&mapping.name)&&process_key(p)==process_key(&mapping.process)) { return Some((mapping.name.clone(),process_key(process))); }
    }
    None
}
fn words(s: &str)->Vec<String>{
    s.split(|c:char|!c.is_ascii_alphanumeric()).filter(|part|!part.is_empty()).map(str::to_ascii_lowercase).collect()
}
fn title_aliases(title:&str)->Vec<String>{
    const GENERIC:&[&str]=&["edition","edicao","edição","ultimate","complete","collection","remastered","enhanced","definitive","deluxe","goty"];
    let parts=words(title);let mut aliases=Vec::new();let full=key(title);if full.len()>=4{aliases.push(full);}
    let meaningful:Vec<&str>=parts.iter().map(String::as_str).filter(|part|!GENERIC.contains(part)).collect();
    if !meaningful.is_empty(){let joined=meaningful.concat();if joined.len()>=4{aliases.push(joined);}}
    if meaningful.first()==Some(&"the")&&meaningful.len()>1{let tail=&meaningful[1..];aliases.push(tail.concat());if tail.len()>=3{let acronym:String=tail.iter().filter_map(|part|part.chars().next()).collect();if acronym.len()>=3{aliases.push(acronym);}}}
    if meaningful.len()>=2{
        let acronym:String=meaningful.iter().filter_map(|part|part.chars().next()).collect();
        if acronym.len()>=3{aliases.push(acronym);}
    }
    aliases.sort();aliases.dedup();aliases
}
fn process_alias(process:&str)->String{
    let mut value=key(&process_key(process));
    const SUFFIXES:&[&str]=&["win64shipping","win32shipping","shipping","directx12","directx11","win64","win32","dx12","dx11","x64","x86","64","32"];
    loop{let before=value.len();for suffix in SUFFIXES{if value.ends_with(suffix)&&value.len()>suffix.len()+2{value.truncate(value.len()-suffix.len());break;}}if value.len()==before{break}}
    value
}
fn automatic_score(title:&str,process:&str)->u8{
    let process=process_alias(process);if process.len()<3{return 0}
    let aliases=title_aliases(title);if aliases.iter().any(|alias|alias==&process){return 100}
    if aliases.iter().any(|alias|process.len()>=6&&alias.starts_with(&process)&&process.len()*10>=alias.len()*7){return 82}
    0
}
fn match_automatic(names:&[String],running:&[String])->Option<(String,String,u8)>{
    let mut candidates:Vec<(String,String,u8)>=names.iter().flat_map(|name|running.iter().filter_map(move|process|{let score=automatic_score(name,process);(score>0).then(|| (name.clone(),process_key(process),score))})).collect();
    candidates.sort_by(|a,b|b.2.cmp(&a.2).then_with(||a.0.cmp(&b.0)).then_with(||a.1.cmp(&b.1)));
    let best=candidates.first()?.clone();
    if candidates.iter().skip(1).any(|candidate|candidate.2==best.2&&(candidate.0!=best.0||candidate.1!=best.1)){return None}
    Some(best)
}
fn match_game(names: &[String], mappings: &[Mapping], running: &[String]) -> Option<String> {
    match_mapping(names,mappings,running).map(|match_|match_.0).or_else(||match_automatic(names,running).map(|match_|match_.0))
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
 if let Some((name,process))=match_mapping(&input.names,&input.mappings,&running){return Ok(json!({"name":name,"process":process,"source":"mapping","confidence":100}))}
 if let Some((name,process,confidence))=match_automatic(&input.names,&visible){return Ok(json!({"name":name,"process":process,"source":"automatic","confidence":confidence}))}
 Ok(json!({"name":null,"process":null,"source":null,"confidence":0}))
}
#[cfg(test)]
mod tests {use super::*;
 #[test]fn recognizes_only_library_games(){assert_eq!(match_game(&["Control".into()],&[],&["Control".into()]),Some("Control".into()));assert_eq!(match_game(&["Control".into()],&[],&["chrome".into()]),None);}
 #[test]fn mapping_must_belong_to_library(){let m=vec![Mapping{name:"Control".into(),process:"Control_DX12.exe".into()}];assert_eq!(match_game(&["Control".into()],&m,&["control_dx12".into()]),Some("Control".into()));assert_eq!(match_game(&[],&m,&["control_dx12".into()]),None);}
 #[test]fn executable_paths_and_uppercase_extensions(){let m=vec![Mapping{name:"Red Dead Redemption 2".into(),process:r#""C:\Games\RDR2.EXE""#.into()}];assert_eq!(match_mapping(&["Red Dead Redemption 2".into()],&m,&["rdr2".into()]),Some(("Red Dead Redemption 2".into(),"rdr2".into())));}
 #[test]fn does_not_guess_short_or_partial_names(){assert_eq!(match_game(&["RE2".into(),"Control".into()],&[],&["re2".into(),"ControlPanel".into()]),None);}
 #[test]fn recognizes_common_game_executables(){
  assert_eq!(match_automatic(&["Red Dead Redemption 2".into()],&["RDR2.exe".into()]),Some(("Red Dead Redemption 2".into(),"rdr2".into(),100)));
  assert_eq!(match_automatic(&["Control".into()],&["Control_DX12.exe".into()]),Some(("Control".into(),"control_dx12".into(),100)));
  assert_eq!(match_automatic(&["The Elder Scrolls Online".into()],&["eso64.exe".into()]),Some(("The Elder Scrolls Online".into(),"eso64".into(),100)));
 }
 #[test]fn refuses_ambiguous_automatic_matches(){assert_eq!(match_automatic(&["Control".into(),"Control Ultimate Edition".into()],&["Control_DX12.exe".into()]),None);}
}
#[cfg(all(test,windows))]
#[test]
fn windows_query_returns_only_process_names(){let rows=processes(true).expect("Windows process query");assert!(rows.iter().all(|s|!s.contains('\\')&&!s.contains('/')&&!s.contains('\n')));}

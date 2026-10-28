use serde_json::{json, Value};
use std::{collections::BTreeMap, fs, path::{Path, PathBuf}};

const STEAM_ID_OFFSET: u64 = 76_561_197_960_265_728;
const MAX_CACHE_BYTES: u64 = 8 * 1024 * 1024;

fn integer(value: Option<&Value>) -> u64 {
    value.and_then(Value::as_u64).or_else(|| value.and_then(Value::as_i64).and_then(|n| u64::try_from(n).ok())).unwrap_or(0)
}

fn boolean(value: Option<&Value>) -> bool {
    value.and_then(Value::as_bool).unwrap_or_else(|| integer(value) != 0)
}

fn text(value: Option<&Value>, limit: usize) -> String {
    value.and_then(Value::as_str).unwrap_or("").trim().chars().take(limit).filter(|c| !c.is_control()).collect()
}

fn safe_icon(value: Option<&Value>) -> String {
    let url = text(value, 800);
    reqwest::Url::parse(&url).ok().filter(|u| u.scheme() == "https" && u.host_str().is_some_and(|host| {
        host == "steamstatic.com" || host.ends_with(".steamstatic.com") || host == "akamaihd.net" || host.ends_with(".akamaihd.net")
    })).map(|_| url).unwrap_or_default()
}

fn achievement(entry: &Value) -> Option<Value> {
    let id = text(entry.get("strID"), 240);
    let name = text(entry.get("strName"), 300);
    if id.is_empty() && name.is_empty() { return None; }
    let timestamp = integer(entry.get("rtUnlocked"));
    let when = (timestamp > 0).then(|| chrono::DateTime::from_timestamp(timestamp as i64, 0).map(|d| d.format("%Y-%m-%d").to_string())).flatten().unwrap_or_default();
    Some(json!({
        "id": if id.is_empty() { name.clone() } else { id },
        "nome": if name.is_empty() { "Conquista".to_string() } else { name },
        "desc": text(entry.get("strDescription"), 1200),
        "got": boolean(entry.get("bAchieved")),
        "quando": when,
        "icon": safe_icon(entry.get("strImage")),
        "source": "steam_local"
    }))
}

fn merge_entry(map: &mut BTreeMap<String, Value>, entry: Value) {
    let key = entry.get("id").and_then(Value::as_str).unwrap_or("").to_lowercase();
    if key.is_empty() { return; }
    let replace = map.get(&key).is_none_or(|old| !old.get("got").and_then(Value::as_bool).unwrap_or(false) && entry.get("got").and_then(Value::as_bool).unwrap_or(false));
    if replace { map.insert(key, entry); }
}

pub(crate) fn parse_game_cache(root: &Value, appid: u32) -> Option<Value> {
    let sections = root.as_array()?;
    for section in sections {
        let pair = section.as_array()?;
        if pair.first().and_then(Value::as_str) != Some("achievements") { continue; }
        let data = pair.get(1)?.get("data")?;
        let total = integer(data.get("nTotal")).min(10_000) as u32;
        let summary_unlocked = integer(data.get("nAchieved")).min(total as u64) as u32;
        if total == 0 { return None; }
        let mut items = BTreeMap::new();
        if let Some(object) = data.as_object() {
            for (name, list) in object {
                if !name.starts_with("vec") { continue; }
                for row in list.as_array().into_iter().flatten() {
                    if let Some(item) = achievement(row) { merge_entry(&mut items, item); }
                }
            }
        }
        let lista: Vec<Value> = items.into_values().filter(|row| row.get("got").and_then(Value::as_bool).unwrap_or(false)).collect();
        let unlocked = summary_unlocked.max(lista.len().min(total as usize) as u32);
        return Some(json!({"found":true,"source":"steam_local","appid":appid,"unlocked":unlocked,"total":total,"lista":lista}));
    }
    None
}

pub(crate) fn parse_progress_cache(root: &Value, appid: u32) -> Option<Value> {
    for row in root.get("mapCache")?.as_array()? {
        let pair = row.as_array()?;
        if integer(pair.first()) != appid as u64 { continue; }
        let data = pair.get(1)?;
        let total = integer(data.get("total")).min(10_000) as u32;
        if total == 0 { return None; }
        let unlocked = integer(data.get("unlocked")).min(total as u64) as u32;
        return Some(json!({"found":true,"source":"steam_local","appid":appid,"unlocked":unlocked,"total":total,"lista":[]}));
    }
    None
}

fn read_json(path: &Path) -> Option<Value> {
    let metadata = fs::metadata(path).ok()?;
    if !metadata.is_file() || metadata.len() == 0 || metadata.len() > MAX_CACHE_BYTES { return None; }
    serde_json::from_slice(&fs::read(path).ok()?).ok()
}

#[cfg(windows)]
fn steam_root() -> Option<PathBuf> {
    use windows_sys::Win32::System::Registry::{RegCloseKey, RegOpenKeyExW, RegQueryValueExW, HKEY_CURRENT_USER, KEY_QUERY_VALUE, REG_EXPAND_SZ, REG_SZ};
    fn wide(value: &str) -> Vec<u16> { value.encode_utf16().chain(Some(0)).collect() }
    unsafe {
        let mut key = std::ptr::null_mut();
        if RegOpenKeyExW(HKEY_CURRENT_USER, wide(r"Software\Valve\Steam").as_ptr(), 0, KEY_QUERY_VALUE, &mut key) == 0 {
            let mut size = 0; let mut kind = 0;
            let name = wide("SteamPath");
            if RegQueryValueExW(key, name.as_ptr(), std::ptr::null(), &mut kind, std::ptr::null_mut(), &mut size) == 0 && matches!(kind, REG_SZ | REG_EXPAND_SZ) && size > 2 && size <= 32768 && size % 2 == 0 {
                let mut value = vec![0u16; size as usize / 2];
                if RegQueryValueExW(key, name.as_ptr(), std::ptr::null(), &mut kind, value.as_mut_ptr().cast(), &mut size) == 0 {
                    while value.last() == Some(&0) { value.pop(); }
                    let path = PathBuf::from(String::from_utf16_lossy(&value));
                    if path.is_dir() { RegCloseKey(key); return Some(path); }
                }
            }
            RegCloseKey(key);
        }
    }
    [std::env::var_os("ProgramFiles(x86)"), std::env::var_os("ProgramFiles")].into_iter().flatten().map(PathBuf::from).map(|root| root.join("Steam")).find(|path| path.is_dir())
}

#[cfg(not(windows))]
fn steam_root() -> Option<PathBuf> { None }

pub(crate) fn read(appid: u32, steam_id: u64) -> Option<Value> {
    if appid == 0 || steam_id <= STEAM_ID_OFFSET { return None; }
    let account = steam_id - STEAM_ID_OFFSET;
    if account > u32::MAX as u64 { return None; }
    let cache = steam_root()?.join("userdata").join(account.to_string()).join("config").join("librarycache");
    read_json(&cache.join(format!("{appid}.json"))).and_then(|root| parse_game_cache(&root, appid))
        .or_else(|| read_json(&cache.join("achievement_progress.json")).and_then(|root| parse_progress_cache(&root, appid)))
}

pub(crate) fn merge_snapshot(existing: Option<&Value>, local: &Value, appid: u32) -> Value {
    let mut achievements = BTreeMap::new();
    for source in [existing.and_then(|row| row.get("achievements")), local.get("lista")].into_iter().flatten() {
        for row in source.as_array().into_iter().flatten() {
            if row.get("got").and_then(Value::as_bool).unwrap_or(true) { merge_entry(&mut achievements, row.clone()); }
        }
    }
    let lista: Vec<Value> = achievements.into_values().collect();
    let old_unlocked = existing.and_then(|row| row.get("unlocked")).and_then(Value::as_u64).unwrap_or(0);
    let old_total = existing.and_then(|row| row.get("total")).and_then(Value::as_u64).unwrap_or(0);
    let total = old_total.max(integer(local.get("total"))).min(10_000) as u32;
    let unlocked = old_unlocked.max(integer(local.get("unlocked"))).max(lista.len() as u64).min(total as u64) as u32;
    json!({"found":total>0,"source":"steam_local","appid":appid,"unlocked":unlocked,"total":total,"lista":lista,"persisted":true})
}

pub(crate) fn stored_snapshot(row: &Value, appid: u32) -> Value {
    json!({
        "found": integer(row.get("total")) > 0,
        "source": "steam_local_saved",
        "appid": appid,
        "unlocked": integer(row.get("unlocked")),
        "total": integer(row.get("total")),
        "lista": row.get("achievements").cloned().unwrap_or_else(|| json!([])),
        "persisted": true,
        "observed_at": row.get("observed_at").cloned().unwrap_or(Value::Null)
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn parses_local_achievement_page_and_keeps_unlocked_entries() {
        let input=json!([["achievements",{"data":{"nTotal":29,"nAchieved":3,"vecHighlight":[
            {"strID":"BLOOD","strName":"O sangue fala","strDescription":"Derrote o Decaído","bAchieved":true,"rtUnlocked":1792969200,"strImage":"https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/1/a.jpg"},
            {"strID":"LOCKED","strName":"Bloqueada","bAchieved":false}
        ]}}]]);
        let parsed=parse_game_cache(&input,2384600).unwrap();
        assert_eq!(parsed["unlocked"],3);assert_eq!(parsed["total"],29);assert_eq!(parsed["lista"].as_array().unwrap().len(),1);assert_eq!(parsed["lista"][0]["id"],"BLOOD");
    }
    #[test]
    fn parses_summary_fallback_and_rejects_other_apps() {
        let input=json!({"mapCache":[[2384600,{"unlocked":3,"total":29}]]});
        assert_eq!(parse_progress_cache(&input,2384600).unwrap()["unlocked"],3);assert!(parse_progress_cache(&input,10).is_none());
    }
    #[test]
    fn rejects_non_steam_icon_hosts() {
        let input=json!([["achievements",{"data":{"nTotal":1,"nAchieved":1,"vecHighlight":[{"strID":"A","strName":"A","bAchieved":true,"strImage":"https://evil.example/x.png"}]}}]]);
        assert_eq!(parse_game_cache(&input,1).unwrap()["lista"][0]["icon"],"");
    }
    #[test]
    fn permanent_snapshot_never_loses_an_unlock() {
        let old=json!({"unlocked":3,"total":29,"achievements":[{"id":"OLD","nome":"Antiga","got":true}]});
        let current=json!({"unlocked":1,"total":29,"lista":[{"id":"NEW","nome":"Nova","got":true}]});
        let merged=merge_snapshot(Some(&old),&current,2384600);
        assert_eq!(merged["unlocked"],3);assert_eq!(merged["total"],29);assert_eq!(merged["lista"].as_array().unwrap().len(),2);
    }
}

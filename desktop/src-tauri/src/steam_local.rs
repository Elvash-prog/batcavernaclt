use serde_json::{json, Value};
use std::{collections::BTreeMap, fs, path::{Path, PathBuf}};

const STEAM_ID_OFFSET: u64 = 76_561_197_960_265_728;
const MAX_CACHE_BYTES: u64 = 8 * 1024 * 1024;
const MAX_SCHEMA_BYTES: u64 = 32 * 1024 * 1024;

#[derive(Debug, Clone, PartialEq)]
enum BinaryValue {
    Text(String),
    Block(Vec<(String, BinaryValue)>),
}

impl BinaryValue {
    fn text(&self) -> Option<&str> { if let Self::Text(value) = self { Some(value) } else { None } }
    fn block(&self) -> Option<&[(String, BinaryValue)]> { if let Self::Block(value) = self { Some(value) } else { None } }
}

fn binary_find<'a>(entries: &'a [(String, BinaryValue)], key: &str) -> Option<&'a BinaryValue> {
    entries.iter().find(|(name, _)| name.eq_ignore_ascii_case(key)).map(|(_, value)| value)
}

fn binary_text<'a>(entries: &'a [(String, BinaryValue)], key: &str) -> Option<&'a str> {
    binary_find(entries, key).and_then(BinaryValue::text)
}

struct BinaryReader<'a> { bytes: &'a [u8], at: usize }

impl BinaryReader<'_> {
    fn byte(&mut self) -> Result<u8, String> {
        let value = *self.bytes.get(self.at).ok_or("arquivo binário incompleto")?;
        self.at += 1;
        Ok(value)
    }
    fn take(&mut self, size: usize) -> Result<&[u8], String> {
        let end = self.at.checked_add(size).filter(|end| *end <= self.bytes.len()).ok_or("valor binário incompleto")?;
        let value = &self.bytes[self.at..end];
        self.at = end;
        Ok(value)
    }
    fn cstring(&mut self) -> Result<String, String> {
        let rest = &self.bytes[self.at..];
        let size = rest.iter().position(|byte| *byte == 0).ok_or("texto binário sem terminador")?;
        let value = String::from_utf8_lossy(&rest[..size]).into_owned();
        self.at += size + 1;
        Ok(value)
    }
    fn wide_string(&mut self) -> Result<String, String> {
        let mut units = Vec::new();
        loop {
            let bytes = self.take(2)?;
            let value = u16::from_le_bytes([bytes[0], bytes[1]]);
            if value == 0 { return Ok(String::from_utf16_lossy(&units)); }
            units.push(value);
        }
    }
    fn block(&mut self, depth: usize) -> Result<Vec<(String, BinaryValue)>, String> {
        if depth > 64 { return Err("estrutura binária profunda demais".into()); }
        let mut entries = Vec::new();
        loop {
            let kind = self.byte()?;
            if matches!(kind, 0x08 | 0x0b) { return Ok(entries); }
            let name = self.cstring()?;
            let value = match kind {
                0x00 => BinaryValue::Block(self.block(depth + 1)?),
                0x01 => BinaryValue::Text(self.cstring()?),
                0x02 => { let b=self.take(4)?; BinaryValue::Text(i32::from_le_bytes([b[0],b[1],b[2],b[3]]).to_string()) },
                0x03 => { let b=self.take(4)?; BinaryValue::Text(f32::from_le_bytes([b[0],b[1],b[2],b[3]]).to_string()) },
                0x04 | 0x06 => { let b=self.take(4)?; BinaryValue::Text(u32::from_le_bytes([b[0],b[1],b[2],b[3]]).to_string()) },
                0x05 => BinaryValue::Text(self.wide_string()?),
                0x07 => { let b=self.take(8)?; BinaryValue::Text(u64::from_le_bytes([b[0],b[1],b[2],b[3],b[4],b[5],b[6],b[7]]).to_string()) },
                0x0a => { let b=self.take(8)?; BinaryValue::Text(i64::from_le_bytes([b[0],b[1],b[2],b[3],b[4],b[5],b[6],b[7]]).to_string()) },
                _ => return Err(format!("tipo binário desconhecido: {kind:#04x}")),
            };
            entries.push((name, value));
        }
    }
}

fn parse_binary(bytes: &[u8]) -> Result<Vec<(String, BinaryValue)>, String> {
    let mut reader = BinaryReader { bytes, at: 0 };
    let result = reader.block(0)?;
    if reader.at != bytes.len() { return Err("dados extras no arquivo binário".into()); }
    Ok(result)
}

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

fn read_bytes(path: &Path, limit: u64) -> Option<Vec<u8>> {
    let metadata = fs::metadata(path).ok()?;
    if !metadata.is_file() || metadata.len() == 0 || metadata.len() > limit { return None; }
    fs::read(path).ok()
}

fn localized(node: Option<&BinaryValue>) -> String {
    let Some(node) = node else { return String::new(); };
    if let Some(value) = node.text() { return value.trim().chars().take(300).collect(); }
    let Some(languages) = node.block() else { return String::new(); };
    for language in ["brazilian", "portuguese", "english"] {
        if let Some(value) = binary_text(languages, language).filter(|value| !value.trim().is_empty()) {
            return value.trim().chars().take(300).collect();
        }
    }
    languages.iter().find_map(|(name, value)| (!name.eq_ignore_ascii_case("token")).then(|| value.text()).flatten())
        .unwrap_or("").trim().chars().take(300).collect()
}

fn local_stats_cache(steam: &Path, account: u32, appid: u32) -> Option<Value> {
    let folder = steam.join("appcache").join("stats");
    let schema = parse_binary(&read_bytes(&folder.join(format!("UserGameStatsSchema_{appid}.bin")), MAX_SCHEMA_BYTES)?).ok()?;
    let game = binary_find(&schema, &appid.to_string()).or_else(|| schema.iter().find_map(|(_, value)| value.block().map(|_| value)))?.block()?;
    let stats = binary_find(game, "stats")?.block()?;
    let user_path = folder.join(format!("UserGameStats_{account}_{appid}.bin"));
    let user = parse_binary(&read_bytes(&user_path, MAX_CACHE_BYTES)?).ok()?;
    let cache = binary_find(&user, "cache")?.block()?;
    let mut unlocked = Vec::new();
    let mut total = 0u32;
    for (stat_id, stat_value) in stats {
        let Some(stat) = stat_value.block() else { continue; };
        let Some(bits) = binary_find(stat, "bits").and_then(BinaryValue::block) else { continue; };
        let state = binary_find(cache, stat_id).and_then(BinaryValue::block);
        let data = state.and_then(|value| binary_text(value, "data")).and_then(|value| value.trim().parse::<i64>().ok()).unwrap_or(0) as u32;
        let times = state.and_then(|value| binary_find(value, "AchievementTimes")).and_then(BinaryValue::block);
        for (bit_key, bit_value) in bits {
            let Some(bit) = bit_value.block() else { continue; };
            let index = binary_text(bit, "bit").unwrap_or(bit_key).trim().parse::<u32>().ok()?;
            if index >= 32 { return None; }
            let id = binary_text(bit, "name").unwrap_or("").trim().chars().take(240).collect::<String>();
            if id.is_empty() { continue; }
            total = total.saturating_add(1);
            if data & (1u32 << index) == 0 { continue; }
            let display = binary_find(bit, "display").and_then(BinaryValue::block);
            let name = localized(display.and_then(|value| binary_find(value, "name")));
            let description = localized(display.and_then(|value| binary_find(value, "desc")));
            let timestamp = times.and_then(|value| binary_text(value, &index.to_string())).and_then(|value| value.trim().parse::<i64>().ok()).unwrap_or(0);
            let when = chrono::DateTime::from_timestamp(timestamp, 0).map(|date| date.format("%Y-%m-%d").to_string()).unwrap_or_default();
            unlocked.push(json!({"id":id,"nome":name,"desc":description,"got":true,"quando":when,"icon":"","source":"steam_local"}));
        }
    }
    if total == 0 { return None; }
    Some(json!({"found":true,"source":"steam_local","cache_source":"appcache_stats","appid":appid,"unlocked":unlocked.len(),"total":total,"lista":unlocked}))
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
    let steam = steam_root()?;
    if let Some(stats) = local_stats_cache(&steam, account as u32, appid) { return Some(stats); }
    let cache = steam.join("userdata").join(account.to_string()).join("config").join("librarycache");
    read_json(&cache.join(format!("{appid}.json"))).and_then(|root| parse_game_cache(&root, appid)).map(|mut value| { value["cache_source"]=json!("librarycache_game"); value })
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
    enum TestValue<'a> { Text(&'a str), Int(i32), Block(Vec<(&'a str, TestValue<'a>)>) }
    fn binary_fixture(entries: Vec<(&str, TestValue<'_>)>) -> Vec<u8> {
        fn write(entries: Vec<(&str, TestValue<'_>)>, bytes: &mut Vec<u8>) {
            for (name, value) in entries {
                match value {
                    TestValue::Block(children) => { bytes.push(0); bytes.extend_from_slice(name.as_bytes()); bytes.push(0); write(children, bytes); }
                    TestValue::Text(text) => { bytes.push(1); bytes.extend_from_slice(name.as_bytes()); bytes.push(0); bytes.extend_from_slice(text.as_bytes()); bytes.push(0); }
                    TestValue::Int(number) => { bytes.push(2); bytes.extend_from_slice(name.as_bytes()); bytes.push(0); bytes.extend_from_slice(&number.to_le_bytes()); }
                }
            }
            bytes.push(8);
        }
        let mut bytes=Vec::new();write(entries,&mut bytes);bytes
    }
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
    #[test]
    fn reads_immediate_unlocks_from_steam_binary_stats() {
        let appid=2384600u32;let account=42u32;
        let root=std::env::temp_dir().join(format!("batcaverna-steam-local-{}",std::process::id()));
        let stats=root.join("appcache").join("stats");fs::create_dir_all(&stats).unwrap();
        let appid_text=appid.to_string();
        let schema=binary_fixture(vec![(appid_text.as_str(),TestValue::Block(vec![("stats",TestValue::Block(vec![("1",TestValue::Block(vec![("bits",TestValue::Block(vec![("0",TestValue::Block(vec![("name",TestValue::Text("BLOOD")),("display",TestValue::Block(vec![("name",TestValue::Block(vec![("brazilian",TestValue::Text("O sangue fala"))])),("desc",TestValue::Block(vec![("brazilian",TestValue::Text("Derrote o Decaído"))]))]))])),("1",TestValue::Block(vec![("name",TestValue::Text("LOCKED"))]))]))]))]))]))]))]);
        let user=binary_fixture(vec![("cache",TestValue::Block(vec![("1",TestValue::Block(vec![("data",TestValue::Int(1)),("AchievementTimes",TestValue::Block(vec![("0",TestValue::Int(1_792_969_200))]))]))]))]);
        fs::write(stats.join(format!("UserGameStatsSchema_{appid}.bin")),schema).unwrap();
        fs::write(stats.join(format!("UserGameStats_{account}_{appid}.bin")),user).unwrap();
        let parsed=local_stats_cache(&root,account,appid).unwrap();
        assert_eq!(parsed["cache_source"],"appcache_stats");assert_eq!(parsed["unlocked"],1);assert_eq!(parsed["total"],2);
        assert_eq!(parsed["lista"][0]["id"],"BLOOD");assert_eq!(parsed["lista"][0]["nome"],"O sangue fala");
        fs::remove_dir_all(root).unwrap();
    }
}

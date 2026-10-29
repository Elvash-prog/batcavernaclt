package dev.gamersclt.batcaverna.nativeapp;
import org.json.*;
import java.text.Normalizer;
import java.util.*;

/** Combines the official Steam catalogue with the user's permanent desktop snapshot. */
final class SteamAchievementProgress {
 static JSONObject merge(JSONObject official,JSONObject local)throws JSONException{
  LinkedHashMap<String,JSONObject> merged=new LinkedHashMap<>();
  JSONArray officialRows=official==null?null:official.optJSONArray("lista");
  for(int i=0;officialRows!=null&&i<officialRows.length();i++){
   JSONObject row=officialRows.optJSONObject(i);String key=key(row);
   if(row!=null&&!key.isEmpty())merged.put(key,new JSONObject(row.toString()).put("source","steam_official"));
  }
  JSONArray localRows=local==null?null:local.optJSONArray("achievements");
  for(int i=0;localRows!=null&&i<localRows.length();i++){
   JSONObject saved=localRows.optJSONObject(i);String key=key(saved);if(saved==null||key.isEmpty())continue;
   JSONObject row=merged.containsKey(key)?merged.get(key):new JSONObject();
   for(Iterator<String> keys=saved.keys();keys.hasNext();){String field=keys.next();Object value=saved.opt(field);if(value==null||value==JSONObject.NULL||value instanceof String&&((String)value).trim().isEmpty())continue;row.put(field,value);}
   row.put("got",true).put("source","steam_local");
   if(row.optString("nome").trim().isEmpty())row.put("nome",row.optString("id","Conquista"));
   merged.put(key,row);
  }
  List<JSONObject> sorted=new ArrayList<>(merged.values());
  sorted.sort((a,b)->{int earned=Boolean.compare(b.optBoolean("got"),a.optBoolean("got"));return earned!=0?earned:a.optString("nome").compareToIgnoreCase(b.optString("nome"));});
  JSONArray rows=new JSONArray();for(JSONObject row:sorted)rows.put(row);
  int officialUnlocked=0;for(int i=0;officialRows!=null&&i<officialRows.length();i++)if(officialRows.optJSONObject(i)!=null&&officialRows.optJSONObject(i).optBoolean("got"))officialUnlocked++;
  int localUnlocked=local==null?0:Math.max(0,local.optInt("unlocked"));
  int total=Math.max(rows.length(),local==null?0:Math.max(0,local.optInt("total")));
  return new JSONObject().put("lista",rows).put("unlocked",Math.max(officialUnlocked,localUnlocked)).put("total",total).put("local",local!=null&&local.optInt("total")>0).put("observed_at",local==null?"":local.optString("observed_at"));
 }
 private static String key(JSONObject row){if(row==null)return "";String value=row.optString("id",row.optString("nome",""));return Normalizer.normalize(value,Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+","");}
}

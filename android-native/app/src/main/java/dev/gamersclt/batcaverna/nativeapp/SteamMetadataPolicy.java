package dev.gamersclt.batcaverna.nativeapp;
import org.json.*;
final class SteamMetadataPolicy {
 static String key(String value){return java.text.Normalizer.normalize(value,java.text.Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(java.util.Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]","");}
 static JSONObject select(JSONArray rows,String name){
  if(key(name).isEmpty())return null;JSONObject chosen=null;int matches=0;
  for(int i=0;rows!=null&&i<rows.length();i++){JSONObject game=rows.optJSONObject(i);if(game!=null&&key(name).equals(key(game.optString("nome")))&&game.optLong("steamAppid")>0){chosen=game;matches++;}}
  return matches==1?chosen:null;
 }
}

package dev.gamersclt.batcaverna.nativeapp;
import java.util.LinkedHashSet;
final class MobileCoverPolicy {
 static String artwork(org.json.JSONArray rows,String name,String year,boolean media,boolean vertical){
  org.json.JSONObject chosen=null,dated=null;int matches=0,datedMatches=0;String wanted=titleKey(name);
  for(int i=0;i<rows.length();i++){org.json.JSONObject row=rows.optJSONObject(i);if(row==null||!wanted.equals(titleKey(row.optString("nome",row.optString("name",row.optString("title"))))))continue;
   chosen=row;matches++;String release=row.optString("ano",row.optString("released",""));if(year.matches("[0-9]{4}")&&release.startsWith(year)){dated=row;datedMatches++;}
  }
  if(datedMatches==1)chosen=dated;else if(matches!=1)return "";
  String source=chosen.optString(media?(vertical?"capa":"background_image"):(vertical?"cover_image":"background_image"));return CoverPolicy.publicUrl(source)?source:"";
 }
 private static String titleKey(String value){return java.text.Normalizer.normalize(value,java.text.Normalizer.Form.NFD).replaceAll("\\p{M}","").trim().toLowerCase(java.util.Locale.ROOT);}
 static String preferenceKey(boolean media){return media?"native_media_cover_vertical":"native_games_cover_vertical";}
 static String[] candidates(String source,String appid,boolean vertical){
  LinkedHashSet<String> out=new LinkedHashSet<>();
  if(appid!=null&&appid.matches("[1-9][0-9]{0,9}")){
   String file=vertical?"library_600x900.jpg":"header.jpg";
   for(String host:new String[]{"shared.cloudflare.steamstatic.com","shared.fastly.steamstatic.com"})out.add("https://"+host+"/store_item_assets/steam/apps/"+appid+"/"+file);
   out.add("https://cdn.cloudflare.steamstatic.com/steam/apps/"+appid+"/"+file);
  }
  for(String candidate:CoverPolicy.candidates(source,""))out.add(candidate);
  return out.toArray(new String[0]);
 }
}

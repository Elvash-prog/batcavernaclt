package dev.gamersclt.batcaverna.nativeapp;
import java.util.LinkedHashSet;
final class MobileCoverPolicy {
 static String artwork(org.json.JSONArray rows,String name,String year,boolean media,boolean vertical){
  org.json.JSONObject chosen=null,dated=null;int matches=0,datedMatches=0;String wanted=titleKey(name);
  for(int i=0;i<rows.length();i++){org.json.JSONObject row=rows.optJSONObject(i);if(row==null||!wanted.equals(titleKey(row.optString("nome",row.optString("name",row.optString("title"))))))continue;
   chosen=row;matches++;String release=row.optString("ano",row.optString("released",""));if(year.matches("[0-9]{4}")&&release.startsWith(year)){dated=row;datedMatches++;}
  }
  if(datedMatches==1)chosen=dated;else if(matches!=1)return "";
  String source=chosen.optString(media?(vertical?"capa":"background_image"):(vertical?"cover_image":"background_image"));if(!media&&(vertical?source.contains("/t_screenshot_"):source.contains("/t_cover_")))return "";return CoverPolicy.publicUrl(source)?source:"";
 }
 private static String titleKey(String value){return java.text.Normalizer.normalize(value,java.text.Normalizer.Form.NFD).replaceAll("\\p{M}","").trim().toLowerCase(java.util.Locale.ROOT);}
 static String preferenceKey(boolean media){return media?"native_media_cover_vertical":"native_games_cover_vertical";}
 static boolean fits(String source,boolean vertical){try{
  java.net.URI u=new java.net.URI(source);if(!CoverPolicy.publicUrl(source)||u.getQuery()!=null||u.getFragment()!=null)return false;
  String path=u.getRawPath();if("images.igdb.com".equals(u.getHost()))return vertical?path.startsWith("/igdb/image/upload/t_cover_"):path.matches("/igdb/image/upload/t_(screenshot|720p|1080p)_[^/]+/.*");
  if(u.getHost().endsWith(".steamstatic.com"))return vertical?path.matches(".*/library_600x900\\.[^/]+$"):path.matches(".*/(header|library_hero)\\.[^/]+$");
 }catch(Exception ignored){}return false;}
 private static boolean pinned(String source){try{java.net.URI u=new java.net.URI(source);return "https".equals(u.getScheme())&&u.getUserInfo()==null&&u.getPort()==-1&&("cdn.steamgriddb.com".equals(u.getHost())||"cdn2.steamgriddb.com".equals(u.getHost()))&&(u.getPath().startsWith("/grid/")||u.getPath().startsWith("/hero/"));}catch(Exception e){return false;}}
 static String[] candidates(String source,String appid,boolean vertical){
  LinkedHashSet<String> out=new LinkedHashSet<>();
  if(fits(source,vertical)||pinned(source))for(String candidate:CoverPolicy.candidates(source,""))out.add(candidate);
  if(appid!=null&&appid.matches("[1-9][0-9]{0,9}")){
   String file=vertical?"library_600x900.jpg":"header.jpg";
   for(String host:new String[]{"shared.cloudflare.steamstatic.com","shared.fastly.steamstatic.com"})out.add("https://"+host+"/store_item_assets/steam/apps/"+appid+"/"+file);
   out.add("https://cdn.cloudflare.steamstatic.com/steam/apps/"+appid+"/"+file);
  }
  for(String candidate:CoverPolicy.candidates(source,""))out.add(candidate);
  return out.toArray(new String[0]);
 }
}

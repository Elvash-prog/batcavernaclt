package dev.gamersclt.batcaverna.nativeapp;
import org.json.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/** Catalog metadata can update the draft, never personal progress or a pinned cover implicitly. */
final class CatalogRefreshInput {
 static JSONObject normalize(JSONObject source,boolean media)throws JSONException {
  JSONObject result=new JSONObject();
  String name=CatalogSelection.name(source);if(!name.isEmpty())result.put("nome",name);
  String year=CatalogSelection.year(source);if(!year.isEmpty())result.put("ano",year);
  for(String key:new String[]{"generos","tempo_est","steam_appid","duracao","onde","sinopse"})if(source.has(key)&&!source.isNull(key)&&(!key.equals("steam_appid")||source.optLong(key)>0))result.put(key,source.opt(key));
  JSONArray genres=source.optJSONArray("generos");if(genres!=null){List<String> values=new ArrayList<>();for(int i=0;i<genres.length();i++){JSONObject genre=genres.optJSONObject(i);String value=genre==null?genres.optString(i):genre.optString("name");if(!value.trim().isEmpty())values.add(value.trim());}result.put("generos",android.text.TextUtils.join(", ",values));}
  String cover=media?source.optString("capa"):source.optString("capa",source.optString("cover_image",source.optString("background_image")));if(!cover.isEmpty())result.put("capa",cover);
  result.put("capa_adulta",SensitiveCover.marked(source));return result;
 }
 static JSONObject merge(JSONObject current,JSONObject catalog,boolean replace,boolean useCover)throws JSONException {
  JSONObject result=new JSONObject(current.toString());
  for(String key:new String[]{"nome","ano","generos","tempo_est","steam_appid","duracao","onde","tipo"}){
   String value=catalog.isNull(key)?"":catalog.optString(key).trim(),existing=current.isNull(key)?"":current.optString(key).trim();
   if(!value.isEmpty()&&(replace||existing.isEmpty()))result.put(key,catalog.opt(key));
  }
  if(useCover&&!catalog.optString("capa").isEmpty())result.put("capa",catalog.optString("capa")).put("capa_adulta",catalog.optBoolean("capa_adulta"));
  return result;
 }
 static String number(String value){try{return new BigDecimal(value).setScale(2,RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();}catch(Exception ignored){return value;}}
 private CatalogRefreshInput(){}
}

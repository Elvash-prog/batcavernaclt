package dev.gamersclt.batcaverna.nativeapp;
import org.json.*;
final class GameFeedModel {
 static boolean manual(JSONObject row){JSONObject meta=row.optJSONObject("meta");String a=meta==null?"":meta.optString("acao");return a.equals("started")||a.equals("recommend")||a.equals("finished");}
 static String action(JSONObject row){JSONObject meta=row.optJSONObject("meta");String a=meta==null?"":meta.optString("acao");if(a.equals("started"))return "Começou a jogar";if(a.equals("recommend"))return "Recomenda";if(a.equals("finished"))return "Zerou";String s=java.text.Normalizer.normalize(row.optString("status"),java.text.Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(java.util.Locale.ROOT);if(s.contains("platina")||s.contains("100%"))return "Platinou";if(s.contains("zerado")||s.contains("finaliz")||s.contains("conclu"))return "Zerou";if(s.contains("progresso")||s.contains("jogando"))return "Começou a jogar";if(s.contains("paus"))return "Pausou";return a.equals("adicionou")?"Adicionou à biblioteca":"Atualizou na biblioteca";}
 static JSONObject title(JSONObject source)throws JSONException{JSONObject result=new JSONObject().put("categoria","jogos");for(String key:new String[]{"nome","capa","capa_adulta","ano","generos","plataforma","steam_appid"})if(source.has(key)&&!source.isNull(key))result.put(key,source.get(key));return result;}
}

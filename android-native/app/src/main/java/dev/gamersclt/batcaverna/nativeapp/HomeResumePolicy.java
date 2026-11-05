package dev.gamersclt.batcaverna.nativeapp;
import org.json.*;
import java.util.*;
/** Bounded mixed-category queue. Dates represent library updates, never inferred viewing. */
final class HomeResumePolicy {
 static String kind(JSONObject row){if("jogos".equals(row.optString("categoria")))return "jogos";String kind=LibraryCategory.classify(row.optString("tipo"));return kind.equals("anime")?"animes":kind.equals("serie")?"series":"filmes";}
 static String label(JSONObject row){switch(kind(row)){case "jogos":return "Jogo";case "series":return "Série";case "animes":return "Anime";default:return "Filme";}}
 static JSONArray select(JSONArray source,String filter){Map<String,JSONObject> unique=new LinkedHashMap<>();for(int i=0;i<source.length();i++){JSONObject row=source.optJSONObject(i);if(row==null)continue;String s=row.optString("status").toLowerCase(Locale.ROOT);if(!(s.contains("progresso")||s.contains("jogando")||s.contains("assistindo")||s.contains("maratonando")))continue;if(!filter.equals("all")&&!filter.equals(kind(row)))continue;unique.put(row.optString("id"),row);}List<JSONObject> rows=new ArrayList<>(unique.values());Collections.sort(rows,(a,b)->{int order=Long.compare(MessageTime.epoch(b.optString("updated_at")),MessageTime.epoch(a.optString("updated_at")));return order!=0?order:a.optString("id").compareTo(b.optString("id"));});JSONArray out=new JSONArray();for(int i=0;i<Math.min(8,rows.size());i++)out.put(rows.get(i));return out;}
}

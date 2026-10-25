package dev.gamersclt.batcaverna.nativeapp;

import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** One pass over the collection; pagination only limits rendered views, never totals. */
final class RetroLibraryPolicy {
 static final String[] ORDER={"progress","backlog","finished","platinum","paused","abandoned"};
 static Map<String,List<JSONObject>> groups(JSONArray games,JSONObject statuses,String query){
  Map<String,List<JSONObject>> groups=new LinkedHashMap<>();
  for(String key:ORDER)groups.put(key,new ArrayList<>());
  String term=query==null?"":query.trim().toLowerCase(Locale.ROOT);
  for(int i=0;games!=null&&i<games.length();i++){
   JSONObject game=games.optJSONObject(i);
   if(game==null||!game.optString("nome").toLowerCase(Locale.ROOT).contains(term))continue;
   String saved=statuses==null?"":statuses.optString(String.valueOf(game.optInt("gameId")));
   String key=RetroStatusPolicy.resolve(saved,!game.optString("premio").isEmpty(),game.optInt("total"),game.optInt("desbloqueadas"));
   groups.get(key).add(game);
  }
  return groups;
 }
 static int visibleCount(int total,int requested){return Math.min(Math.max(0,total),Math.max(6,requested));}
}

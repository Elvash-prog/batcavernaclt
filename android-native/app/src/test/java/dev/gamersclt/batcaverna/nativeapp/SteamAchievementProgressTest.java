package dev.gamersclt.batcaverna.nativeapp;
import org.junit.Test;
import static org.junit.Assert.*;
import org.json.*;

public class SteamAchievementProgressTest {
 @Test public void localUnlocksMergeWithOfficialMetadata()throws Exception{
  JSONObject official=new JSONObject().put("lista",new JSONArray()
   .put(new JSONObject().put("id","FIRST_WIN").put("nome","Primeira vitória").put("desc","Vença uma partida").put("icon","https://shared.akamai.steamstatic.com/first.jpg").put("got",JSONObject.NULL))
   .put(new JSONObject().put("id","FINISH").put("nome","Até o fim").put("got",JSONObject.NULL)));
  JSONObject local=new JSONObject().put("unlocked",1).put("total",2).put("observed_at","2026-10-29T00:00:00Z").put("achievements",new JSONArray().put(new JSONObject().put("id","first_win").put("got",true).put("quando","2026-10-28")));
  JSONObject result=SteamAchievementProgress.merge(official,local);JSONArray rows=result.getJSONArray("lista");
  assertTrue(result.getBoolean("local"));assertEquals(1,result.getInt("unlocked"));assertEquals(2,result.getInt("total"));assertEquals(2,rows.length());
  assertEquals("Primeira vitória",rows.getJSONObject(0).getString("nome"));assertEquals("Vença uma partida",rows.getJSONObject(0).getString("desc"));assertEquals("https://shared.akamai.steamstatic.com/first.jpg",rows.getJSONObject(0).getString("icon"));assertTrue(rows.getJSONObject(0).getBoolean("got"));assertEquals("steam_local",rows.getJSONObject(0).getString("source"));
 }
 @Test public void savedOnlyAchievementsRemainVisibleWithoutOfficialCatalogue()throws Exception{
  JSONObject local=new JSONObject().put("unlocked",3).put("total",29).put("achievements",new JSONArray().put(new JSONObject().put("id","A").put("nome","Conquista local").put("got",true)));
  JSONObject result=SteamAchievementProgress.merge(null,local);assertEquals(3,result.getInt("unlocked"));assertEquals(29,result.getInt("total"));assertEquals("Conquista local",result.getJSONArray("lista").getJSONObject(0).getString("nome"));
 }
}

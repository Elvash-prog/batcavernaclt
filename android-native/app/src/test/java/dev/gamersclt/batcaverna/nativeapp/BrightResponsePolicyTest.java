package dev.gamersclt.batcaverna.nativeapp;
import org.junit.Test;
import static org.junit.Assert.*;
import org.json.*;
public class BrightResponsePolicyTest {
 @Test public void successfulCatalogueWithEmptyErrorKeepsLockedEntriesAndIcons()throws Exception{
  JSONObject reply=new JSONObject("{\"erro\":\"\",\"lista\":[{\"id\":\"A\",\"icon\":\"https://shared.akamai.steamstatic.com/a.jpg\",\"got\":false}]}");
  assertFalse(BrightResponsePolicy.failed(200,reply));
  JSONObject result=SteamAchievementProgress.merge(reply,null);
  assertEquals(1,result.getJSONArray("lista").length());
  assertFalse(result.getJSONArray("lista").getJSONObject(0).getBoolean("got"));
  assertFalse(result.getJSONArray("lista").getJSONObject(0).getString("icon").isEmpty());
 }
 @Test public void actualErrorsRemainFailures()throws Exception{
  assertTrue(BrightResponsePolicy.failed(200,new JSONObject().put("erro","Indisponível")));
  assertTrue(BrightResponsePolicy.failed(503,new JSONObject().put("erro","")));
  assertFalse(BrightResponsePolicy.failed(200,new JSONObject()));
  assertFalse(BrightResponsePolicy.failed(200,new JSONObject().put("erro",JSONObject.NULL)));
 }
}

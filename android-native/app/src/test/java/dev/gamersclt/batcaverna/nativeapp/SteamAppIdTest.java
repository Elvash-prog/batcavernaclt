package dev.gamersclt.batcaverna.nativeapp;

import static org.junit.Assert.*;
import org.json.JSONObject;
import org.junit.Test;

public class SteamAppIdTest {
 @Test public void gamesOutsideSteamAreSavedWithoutAppId()throws Exception{
  for(Object value:new Object[]{JSONObject.NULL,"","null","0",0,"abc",-5,"99999999999"}){
   JSONObject draft=new JSONObject().put("nome","Grand Theft Auto VI").put("steam_appid",value);
   SteamAppId.normalize(draft);
   assertFalse(String.valueOf(value),draft.has("steam_appid"));
   assertEquals("Grand Theft Auto VI",draft.getString("nome"));
  }
 }
 @Test public void validAppIdIsKept()throws Exception{
  JSONObject draft=new JSONObject().put("steam_appid",1145360);
  SteamAppId.normalize(draft);
  assertEquals(1145360,draft.getInt("steam_appid"));
 }
}

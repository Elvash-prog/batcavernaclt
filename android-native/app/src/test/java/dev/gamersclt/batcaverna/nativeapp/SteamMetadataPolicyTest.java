package dev.gamersclt.batcaverna.nativeapp;
import org.json.*;
import org.junit.Test;
import static org.junit.Assert.*;
public class SteamMetadataPolicyTest {
 @Test public void confirmsTitleEvenWhenStoredSteamIdWasWrong()throws Exception{
  JSONObject wrong=new JSONObject().put("steamAppid",1).put("nome","Control"),correct=new JSONObject().put("steamAppid",2).put("nome","CONTROL: Resonant™").put("descricao","Descrição oficial").put("capa","https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2/hash/header.jpg");
  assertSame(correct,SteamMetadataPolicy.select(new JSONArray().put(wrong).put(correct),"CONTROL Resonant"));
 }
 @Test public void missingAndAmbiguousTitlesAreNotInvented()throws Exception{
  JSONObject game=new JSONObject().put("steamAppid",1).put("nome","Control");
  assertNull(SteamMetadataPolicy.select(new JSONArray().put(game),"CONTROL Resonant"));assertNull(SteamMetadataPolicy.select(new JSONArray().put(game).put(game),"Control"));assertNull(SteamMetadataPolicy.select(null,"Control"));
 }
 @Test public void unicodeNamesCannotCollapseIntoTheSameEmptyKey()throws Exception{
  JSONObject game=new JSONObject().put("steamAppid",1).put("nome","测试");
  assertNull(SteamMetadataPolicy.select(new JSONArray().put(game),"控制"));assertNull(SteamMetadataPolicy.select(new JSONArray().put(game),"™"));
 }
 @Test public void acceptsOfficialSteamCdnButRejectsLookalikes(){
  assertTrue(CoverPolicy.publicUrl("https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/3669870/hash/header.jpg"));
  assertFalse(CoverPolicy.publicUrl("https://shared.akamai.steamstatic.com.evil.test/header.jpg"));
  assertFalse(CoverPolicy.publicUrl("http://shared.akamai.steamstatic.com/header.jpg"));
 }
}

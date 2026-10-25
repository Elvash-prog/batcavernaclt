package dev.gamersclt.batcaverna.nativeapp;
import org.junit.Test;
import static org.junit.Assert.*;
public class MobilePresentationTest {
 @Test public void decimalHoursAreNotThousands(){assertEquals("3,7 h",HoursDisplay.format("3.717"));assertEquals("3,7 h",HoursDisplay.format(3.717));assertEquals("3.717,0 h",HoursDisplay.format(3717));assertEquals("0,0 h",HoursDisplay.format(0));}
 @Test public void invalidHoursStayUnavailable(){for(Object value:new Object[]{null,"null","","NaN","Infinity",-1})assertEquals("—",HoursDisplay.format(value));}
 @Test public void steamArtworkPrefersTheMobileOrientation(){String source="https://images.igdb.com/desktop.jpg";String[] landscape=MobileCoverPolicy.candidates(source,"461000",false),portrait=MobileCoverPolicy.candidates(source,"461000",true);assertTrue(landscape[0].endsWith("/header.jpg"));assertTrue(portrait[0].endsWith("/library_600x900.jpg"));assertEquals(source,landscape[landscape.length-1]);assertEquals(source,portrait[portrait.length-1]);}
 @Test public void invalidSteamIdentifiersCannotBecomeUrls(){assertEquals(0,MobileCoverPolicy.candidates("","../../evil",false).length);assertEquals(0,MobileCoverPolicy.candidates("","0",true).length);}
 @Test public void layoutPreferencesAreLocalAndSeparateByCategory(){assertEquals("native_games_cover_vertical",MobileCoverPolicy.preferenceKey(false));assertEquals("native_media_cover_vertical",MobileCoverPolicy.preferenceKey(true));assertNotEquals(MobileCoverPolicy.preferenceKey(false),MobileCoverPolicy.preferenceKey(true));}
 @Test public void catalogueArtworkRequiresUnambiguousTitleAndYear()throws Exception{
  org.json.JSONObject a=new org.json.JSONObject().put("name","Biped").put("released","2020-03-27").put("cover_image","https://images.igdb.com/poster.jpg").put("background_image","https://images.igdb.com/landscape.jpg");
  org.json.JSONArray rows=new org.json.JSONArray().put(a);
  assertEquals("https://images.igdb.com/landscape.jpg",MobileCoverPolicy.artwork(rows,"Biped","2020",false,false));
  assertEquals("https://images.igdb.com/poster.jpg",MobileCoverPolicy.artwork(rows,"Biped","2020",false,true));
  assertEquals("",MobileCoverPolicy.artwork(rows,"Biped","2021",false,false));
  rows.put(a);assertEquals("",MobileCoverPolicy.artwork(rows,"Biped","",false,false));
 }
 @Test public void catalogueArtworkRejectsUntrustedSources()throws Exception{
  org.json.JSONArray rows=new org.json.JSONArray().put(new org.json.JSONObject().put("name","Biped").put("background_image","https://example.com/wrong.jpg"));
  assertEquals("",MobileCoverPolicy.artwork(rows,"Biped","",false,false));
 }
}

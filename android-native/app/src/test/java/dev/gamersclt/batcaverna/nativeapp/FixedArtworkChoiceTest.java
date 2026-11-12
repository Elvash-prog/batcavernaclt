package dev.gamersclt.batcaverna.nativeapp;

import android.widget.ImageView;
import org.json.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import java.lang.reflect.Field;
import java.util.*;
import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class) @Config(sdk=35,manifest=Config.NONE)
public class FixedArtworkChoiceTest {
 @Test public void savedCoverBypassesOldChoicesAndEveryCatalogLookup()throws Exception{
  android.content.Context c=RuntimeEnvironment.getApplication();
  SessionPreferences.get(c).edit().putString("user_id","owner").putString("artwork_choices_v2:owner","{\"legacy\":\"https://cdn2.steamgriddb.com/grid/old.png\"}").apply();
  Field pending=MobileArtworkLoader.class.getDeclaredField("PENDING");pending.setAccessible(true);
  int before=((Map<?,?>)pending.get(null)).size();
  for(String source:new String[]{"https://images.igdb.com/igdb/image/upload/t_cover_big/a.jpg","https://cdn2.steamgriddb.com/grid/b.png","https://example.test/custom.jpg"}){
   JSONObject item=new JSONObject().put("nome","Selected game").put("capa",source).put("steam_appid",42);
   for(boolean vertical:new boolean[]{true,false})for(boolean media:new boolean[]{true,false}){
    List<String> shown=new ArrayList<>();ImageView view=new ImageView(c);
    MobileArtworkLoader.load(view,item,media,vertical,(target,url)->{shown.add(url);target.setImageResource(R.drawable.app_logo);});
    assertEquals(Collections.singletonList(source),shown);assertEquals(source,item.getString("capa"));
    assertEquals(before,((Map<?,?>)pending.get(null)).size());
   }
  }
 }
 @Test public void failureCandidatesNeverIncludeAnOlderOrSteamCover(){
  String selected="https://images.igdb.com/igdb/image/upload/t_cover_big/offline.jpg";
  assertArrayEquals(new String[]{selected},CoverPolicy.candidates(selected,"42"));
  assertArrayEquals(new String[]{selected},MobileCoverPolicy.candidates(selected,"42",false));
  assertTrue(CoverPolicy.candidates("","42").length>0);
 }
}

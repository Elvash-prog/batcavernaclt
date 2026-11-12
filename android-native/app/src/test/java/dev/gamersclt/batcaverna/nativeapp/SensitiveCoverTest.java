package dev.gamersclt.batcaverna.nativeapp;
import android.widget.ImageView;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class) @Config(sdk=35,manifest=Config.NONE)
public class SensitiveCoverTest {
 @Test public void explicitClickRevealsOnlyThisViewAndCanHideAgain()throws Exception{
  JSONObject item=new JSONObject().put("capa_adulta",true).put("nome","Synthetic game");
  ImageView a=new ImageView(RuntimeEnvironment.getApplication()),b=new ImageView(a.getContext());AtomicInteger loads=new AtomicInteger();
  SensitiveCover.load(a,item,loads::incrementAndGet);SensitiveCover.load(b,item,loads::incrementAndGet);
  assertEquals(0,loads.get());assertTrue(a.getContentDescription().toString().contains("Toque para mostrar"));
  Object hiddenTicket=a.getTag();a.performClick();assertEquals(1,loads.get());assertTrue(a.getContentDescription().toString().contains("ocultar"));
  assertTrue(b.getContentDescription().toString().contains("Toque para mostrar"));
  a.performClick();assertEquals(1,loads.get());assertNotSame(hiddenTicket,a.getTag());assertTrue(a.getContentDescription().toString().contains("Toque para mostrar"));
 }
 @Test public void rebindCannotReusePreviousConsentOrCachedPixels()throws Exception{
  ImageView a=new ImageView(RuntimeEnvironment.getApplication());AtomicInteger loads=new AtomicInteger();JSONObject flagged=new JSONObject().put("nsfw",true);
  SensitiveCover.load(a,flagged,loads::incrementAndGet);a.performClick();assertEquals(1,loads.get());
  SensitiveCover.load(a,flagged,loads::incrementAndGet);assertEquals(1,loads.get());assertTrue(a.getContentDescription().toString().contains("Toque para mostrar"));
  SensitiveCover.load(a,new JSONObject(),loads::incrementAndGet);assertEquals(2,loads.get());assertNull(a.getForeground());assertFalse(a.hasOnClickListeners());assertFalse(a.isClickable());
 }
 @Test public void allMetadataSourcesSurviveFeedCopy()throws Exception{
  for(String key:new String[]{"adult","capa_adulta","nsfw"})assertTrue(SensitiveCover.marked(new JSONObject().put(key,true)));
  JSONObject copy=GameFeedModel.title(new JSONObject().put("capa","https://example.test/selected.jpg").put("capa_adulta",true));
  assertTrue(copy.getBoolean("capa_adulta"));assertEquals("https://example.test/selected.jpg",copy.getString("capa"));
 }
}

package dev.gamersclt.batcaverna.nativeapp;
import android.widget.ImageView;
import org.json.*;
import org.junit.*;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class) @Config(sdk=35,manifest=Config.NONE)
public class SensitiveCoverTest {
 @Before public void owner(){SessionPreferences.get(RuntimeEnvironment.getApplication()).edit().putString("user_id","fixture-one").remove("explicit_content:fixture-one").remove("explicit_content:fixture-two").apply();}
 @Test public void filterRevealsAllMarkedImagesWithoutPerImageClicks()throws Exception{
  JSONObject item=new JSONObject().put("capa_adulta",true);ImageView a=new ImageView(RuntimeEnvironment.getApplication()),b=new ImageView(a.getContext());AtomicInteger loads=new AtomicInteger();
  SensitiveCover.load(a,item,loads::incrementAndGet);SensitiveCover.load(b,item,loads::incrementAndGet);assertEquals(0,loads.get());assertFalse(a.hasOnClickListeners());assertFalse(a.isClickable());
  android.widget.CheckBox filter=SensitiveCover.filter(a.getContext(),null);filter.performClick();assertTrue(filter.isChecked());assertEquals(2,loads.get());assertNull(a.getForeground());assertFalse(a.hasOnClickListeners());
  Object previous=a.getTag();SensitiveCover.setAllowed(a.getContext(),false);assertEquals(2,loads.get());assertNotSame(previous,a.getTag());assertTrue(a.getContentDescription().toString().contains("oculto pelo filtro"));
 }
 @Test public void ordinaryCoversAndCardNavigationRemainNormal()throws Exception{
  ImageView a=new ImageView(RuntimeEnvironment.getApplication());AtomicInteger loads=new AtomicInteger();SensitiveCover.load(a,new JSONObject().put("capa_adulta",false),loads::incrementAndGet);assertEquals(1,loads.get());assertFalse(a.isClickable());assertNull(a.getForeground());
  JSONArray rows=new JSONArray().put(new JSONObject().put("name","Lords of the Fallen").put("adult",false)).put(new JSONObject().put("name","Synthetic explicit").put("adult",true));assertEquals(1,SensitiveCover.filterRows(a.getContext(),rows).length());SensitiveCover.setAllowed(a.getContext(),true);assertEquals(2,SensitiveCover.filterRows(a.getContext(),rows).length());
 }
 @Test public void preferenceIsPersistedPerAccountAndFeedMarkSurvives()throws Exception{
  android.content.Context c=RuntimeEnvironment.getApplication();SensitiveCover.setAllowed(c,true);assertTrue(SensitiveCover.allowed(c));SessionPreferences.get(c).edit().putString("user_id","fixture-two").apply();assertFalse(SensitiveCover.allowed(c));SessionPreferences.get(c).edit().putString("user_id","fixture-one").apply();assertTrue(SensitiveCover.allowed(c));
  assertTrue(GameFeedModel.title(new JSONObject().put("capa_adulta",true)).getBoolean("capa_adulta"));
 }
}

package dev.gamersclt.batcaverna.nativeapp;
import android.app.Activity;
import android.content.Context;
import android.content.res.Configuration;
import android.os.Looper;
import android.provider.Settings;
import android.view.*;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import org.robolectric.annotation.GraphicsMode;
import static org.junit.Assert.*;
import static org.robolectric.Shadows.shadowOf;
@RunWith(RobolectricTestRunner.class) @Config(sdk={23,35},manifest=Config.NONE)
public class LibraryTabsTest {
 @Test public void selectionIsAccessibleAndDoesNotMoveNeighborButtons(){
  Activity a=Robolectric.buildActivity(Activity.class).setup().get();Settings.Global.putFloat(a.getContentResolver(),Settings.Global.ANIMATOR_DURATION_SCALE,0f);int[] calls={0};
  LibraryTabs tabs=tabs(a,"all",key->calls[0]++);a.setContentView(tabs);layout(tabs,320);
  Button movie=tabs.findViewWithTag("choices:movie"),anime=tabs.findViewWithTag("choices:anime");int x=movie.getLeft(),width=movie.getWidth();
  anime.performClick();shadowOf(Looper.getMainLooper()).idleFor(250,TimeUnit.MILLISECONDS);layout(tabs,320);
  assertEquals("anime",tabs.selected());assertTrue(anime.isSelected());assertFalse(movie.isSelected());assertEquals(x,movie.getLeft());assertEquals(width,movie.getWidth());
  AccessibilityNodeInfo info=anime.createAccessibilityNodeInfo();assertTrue(info.isCheckable());assertTrue(info.isChecked());assertTrue(anime.getContentDescription().toString().contains("selecionado"));
  anime.performClick();assertEquals(1,calls[0]);a.finish();
 }
 @Test public void countsAndProgrammaticSelectionNeverTriggerDataCallbacks(){
  Activity a=Robolectric.buildActivity(Activity.class).setup().get();int[] calls={0};LibraryTabs tabs=tabs(a,"all",key->calls[0]++);a.setContentView(tabs);layout(tabs,320);
  tabs.select("anime");Map<String,Integer> counts=new LinkedHashMap<>();counts.put("all",7);counts.put("anime",0);tabs.counts(counts);layout(tabs,320);
  Button anime=tabs.findViewWithTag("choices:anime");assertEquals("Animes (0)",anime.getText().toString());assertTrue(anime.isSelected());assertEquals("Animes, 0 títulos, selecionado",anime.getContentDescription().toString());assertEquals(0,calls[0]);a.finish();
 }
 @Test @Config(sdk=35) @GraphicsMode(GraphicsMode.Mode.NATIVE)
 public void largeTextScrollsWithoutTruncatingOrShrinkingTouchTargets(){
  Activity a=Robolectric.buildActivity(Activity.class).setup().get();Configuration config=new Configuration(a.getResources().getConfiguration());config.screenWidthDp=320;config.fontScale=1.6f;Context c=a.createConfigurationContext(config);
  LibraryTabs tabs=tabs(c,"anime",key->{});a.setContentView(tabs);layout(tabs,NativeSheet.dp(c,288));
  LinearLayout row=(LinearLayout)tabs.getChildAt(0);assertTrue("row="+row.getWidth()+", viewport="+tabs.getWidth()+", density="+c.getResources().getDisplayMetrics().density+", first="+((Button)row.getChildAt(0)).getTextSize()+"/"+row.getChildAt(0).getWidth(),row.getWidth()>tabs.getWidth());
  for(int i=0;i<row.getChildCount();i++){Button button=(Button)row.getChildAt(i);assertTrue(button.getHeight()>=NativeSheet.dp(c,48));assertEquals(0,button.getLayout().getEllipsisCount(0));}
  assertTrue(((Button)tabs.findViewWithTag("choices:anime")).isSelected());a.finish();
 }
 private LibraryTabs tabs(Context c,String initial,LibraryTabs.Selection callback){return new LibraryTabs(c,"choices",new String[]{"all","movie","series","anime"},new String[]{"Todos os títulos","Filmes","Séries","Animes"},initial,callback);}
 private void layout(View view,int width){view.measure(View.MeasureSpec.makeMeasureSpec(width,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(0,View.MeasureSpec.UNSPECIFIED));view.layout(0,0,width,view.getMeasuredHeight());}
}

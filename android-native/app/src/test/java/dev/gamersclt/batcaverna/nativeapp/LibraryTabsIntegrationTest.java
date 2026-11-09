package dev.gamersclt.batcaverna.nativeapp;
import android.app.Activity;
import android.os.Looper;
import android.view.*;
import android.widget.*;
import java.lang.reflect.*;
import java.util.concurrent.TimeUnit;
import org.json.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;
import static org.robolectric.Shadows.shadowOf;
@RunWith(RobolectricTestRunner.class) @Config(sdk=35,manifest=Config.NONE)
public class LibraryTabsIntegrationTest {
 @Test public void mediaAndProgressChoicesCombineWithSearchAndResetKeepsCategoryAndOrder()throws Exception{
  Activity a=Robolectric.buildActivity(Activity.class).setup().get();AccountDataView view=new AccountDataView(a,false,1);a.setContentView(view);fixture(view);layout(view);
  EditText search=(EditText)get(view,"search");search.setText("jornada");set(view,"order","rating");set(view,"genre","Drama");set(view,"platform","Netflix");draw(view);
  ((Button)view.findViewWithTag("library-type-tabs:4")).performClick();layout(view);
  assertEquals(4,get(view,"category"));assertEquals("jornada",search.getText().toString());assertEquals("rating",get(view,"order"));assertEquals("",get(view,"genre"));assertEquals("",get(view,"platform"));
  assertNotNull(view.findViewWithTag("anime-one"));assertNotNull(view.findViewWithTag("anime-two"));assertNull(view.findViewWithTag("movie"));assertNull(view.findViewWithTag("series"));
  ((Button)view.findViewWithTag("library-status-tabs:progress")).performClick();layout(view);
  assertNotNull(view.findViewWithTag("anime-one"));assertNull(view.findViewWithTag("anime-two"));assertTrue(((Button)view.findViewWithTag("library-status-tabs:progress")).isSelected());
  set(view,"genre","Ação");set(view,"platform","Crunchyroll");draw(view);
  assertTrue(((TextView)view.findViewWithTag("library-active-filters")).getText().toString().contains("Crunchyroll"));
  ((Button)get(view,"clearFilters")).performClick();layout(view);shadowOf(Looper.getMainLooper()).idleFor(220,TimeUnit.MILLISECONDS);
  assertEquals(4,get(view,"category"));assertEquals("rating",get(view,"order"));assertEquals("",search.getText().toString());assertEquals("all",get(view,"summaryFilter"));
  assertNotNull(view.findViewWithTag("anime-one"));assertNotNull(view.findViewWithTag("anime-two"));assertNull(view.findViewWithTag("movie"));a.finish();
 }
 @Test public void countUsesSearchBeforeProgressSelectionAndEmptyResultsKeepTheSelection()throws Exception{
  Activity a=Robolectric.buildActivity(Activity.class).setup().get();AccountDataView view=new AccountDataView(a,false,1);a.setContentView(view);fixture(view);layout(view);
  EditText search=(EditText)get(view,"search");search.setText("jornada anime");draw(view);
  assertEquals("Todos (2)",((Button)view.findViewWithTag("library-status-tabs:all")).getText().toString());
  ((Button)view.findViewWithTag("library-status-tabs:progress")).performClick();
  assertEquals("Todos (2)",((Button)view.findViewWithTag("library-status-tabs:all")).getText().toString());
  search.setText("nenhum título assim");draw(view);layout(view);
  assertNotNull(view.findViewWithTag("screen-state-empty"));assertEquals("progress",get(view,"summaryFilter"));assertEquals("Assistindo (0)",((Button)view.findViewWithTag("library-status-tabs:progress")).getText().toString());a.finish();
 }
 private void fixture(AccountDataView view)throws Exception{
  JSONArray rows=new JSONArray();rows.put(item("movie","Jornada Filme","filme","▶️ Assistindo","Drama","Netflix"));rows.put(item("series","Jornada Série","serie","✅ Concluído","Drama","Netflix"));rows.put(item("anime-one","Jornada Anime Um","anime","▶️ Assistindo","Ação","Crunchyroll"));rows.put(item("anime-two","Jornada Anime Dois","anime","⏳ Para Assistir","Ação","Netflix"));
  set(view,"all",rows);set(view,"loaded",true);set(view,"loading",false);set(view,"loadError","");draw(view);
 }
 private JSONObject item(String id,String name,String type,String status,String genre,String where)throws Exception{return new JSONObject().put("id",id).put("nome",name).put("categoria","filmes").put("tipo",type).put("status",status).put("generos",genre).put("onde",where);}
 private Object get(Object view,String name)throws Exception{Field field=AccountDataView.class.getDeclaredField(name);field.setAccessible(true);return field.get(view);}
 private void set(Object view,String name,Object value)throws Exception{Field field=AccountDataView.class.getDeclaredField(name);field.setAccessible(true);field.set(view,value);}
 private void draw(AccountDataView view)throws Exception{Method method=AccountDataView.class.getDeclaredMethod("render");method.setAccessible(true);method.invoke(view);}
 private void layout(View view){view.measure(View.MeasureSpec.makeMeasureSpec(412,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(900,View.MeasureSpec.EXACTLY));view.layout(0,0,412,900);}
}

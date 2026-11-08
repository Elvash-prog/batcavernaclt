package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.view.*;
import android.widget.*;
import org.json.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class) @Config(sdk={23,35},manifest=Config.NONE)
public class ListsViewTest {
 private JSONArray rows()throws Exception{return new JSONArray("[{\"id\":\"mine\",\"nome\":\"Séries de ficção\",\"mine\":true,\"count\":3},{\"id\":\"friend\",\"nome\":\"Férias\",\"owner_name\":\"João\",\"compartilhada\":true,\"count\":2}]");}
 private ListsView view(JSONArray rows,String query,int scope,int[] calls){return new ListsView(RuntimeEnvironment.getApplication(),rows,query,scope,new ListsView.Actions(){public void open(JSONObject row){calls[0]++;}public void create(){calls[1]++;}public void filter(String q,int s){}});}
 @Test public void searchesTitleAndOwnerWithoutChangingPrivacy()throws Exception{JSONArray rows=rows();assertTrue(ListsView.matches(rows.getJSONObject(0),"SERIES ficcao",1));assertTrue(ListsView.matches(rows.getJSONObject(1),"JOAO",2));assertFalse(ListsView.matches(rows.getJSONObject(0),"",2));assertEquals("Privada",ListsView.visibility(rows.getJSONObject(0)));assertEquals("Compartilhada com amigos",ListsView.visibility(rows.getJSONObject(1)));}
 @Test public void searchAndResetKeepTheActualListActions()throws Exception{int[] calls={0,0};ListsView v=view(rows(),"",0,calls);EditText query=v.findViewWithTag("lists-search");query.setText("JOAO");assertNull(v.findViewWithTag("list-card-mine"));assertNotNull(v.findViewWithTag("list-card-friend"));v.findViewWithTag("list-card-friend").performClick();assertEquals(1,calls[0]);query.setText("nada encontrado");v.findViewWithTag("lists-empty-action").performClick();assertNotNull(v.findViewWithTag("list-card-mine"));assertNotNull(v.findViewWithTag("list-card-friend"));assertEquals("",query.getText().toString());assertEquals(0,calls[1]);}
 @Test public void emptyCollectionCanCreateItsFirstList(){int[] calls={0,0};ListsView v=view(new JSONArray(),"",0,calls);v.findViewWithTag("lists-empty-action").performClick();assertEquals(1,calls[1]);assertEquals(0,calls[0]);}
 @Test public void restoredFilterAndLargeFontRemainUsable()throws Exception{Context c=RuntimeEnvironment.getApplication();android.content.res.Configuration config=new android.content.res.Configuration(c.getResources().getConfiguration());config.fontScale=1.6f;c.getResources().updateConfiguration(config,c.getResources().getDisplayMetrics());ListsView v=view(rows(),"ficcao",1,new int[]{0,0});v.measure(View.MeasureSpec.makeMeasureSpec(NativeSheet.dp(c,280),View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(0,View.MeasureSpec.UNSPECIFIED));v.layout(0,0,v.getMeasuredWidth(),v.getMeasuredHeight());View card=v.findViewWithTag("list-card-mine");assertNotNull(card);assertTrue(card.getHeight()>NativeSheet.dp(c,160));assertTrue(card.getContentDescription().toString().contains("Privada"));assertNull(v.findViewWithTag("list-card-friend"));assertEquals("ficcao",((EditText)v.findViewWithTag("lists-search")).getText().toString());}
}

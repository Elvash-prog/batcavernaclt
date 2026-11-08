package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.content.res.Configuration;
import android.view.*;
import android.widget.*;
import org.json.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class) @Config(sdk={23,35},manifest=Config.NONE)
public class StatisticsViewTest {
 @Test public void periodChangesDoNotRewriteTotalsOrIncludeUndatedCompletions()throws Exception{JSONObject input=fixture();String before=input.toString();StatisticsData data=new StatisticsData(input);assertEquals(50,data.completion());assertEquals(2,data.undated);assertEquals(6,data.period(6).size());long total=0;for(StatisticsData.Month m:data.period(6))total+=m.total();assertEquals(0,total);assertEquals(4,data.finished);assertEquals(before,input.toString());}
 @Test public void selectingAMonthShowsItsRecordedValues()throws Exception{StatisticsView view=new StatisticsView(context(412,1),fixture(),()->{},()->{});assertTrue(view.findViewWithTag("statistics-month-2026-02").performClick());assertTrue(((TextView)view.findViewWithTag("statistics-month-detail")).getText().toString().contains("fevereiro de 2026"));button(view,"6 meses").performClick();assertNull(view.findViewWithTag("statistics-month-2026-02"));assertNotNull(view.findViewWithTag("statistics-month-2026-12"));assertNotNull(view.findViewWithTag("stat-summary-0"));}
 @Test public void missingHistoryAndEmptyLibraryRemainDistinct()throws Exception{StatisticsData data=new StatisticsData(new JSONObject());assertEquals(-1,data.completion());assertTrue(data.period(12).isEmpty());int[] visits={0};StatisticsView view=new StatisticsView(context(320,1.6f),new JSONObject(),()->{},()->visits[0]++);assertNotNull(view.findViewWithTag("screen-state-empty"));assertTrue(button(view,"Explorar biblioteca").performClick());assertEquals(1,visits[0]);layout(view,280);assertTrue(view.getHeight()>0);View summary=view.findViewWithTag("stat-summary-0");assertTrue(summary.getWidth()>0);assertTrue(summary.getWidth()<=view.getWidth());}
 @Test public void invalidMonthKeysAndValuesAreExcluded()throws Exception{StatisticsData data=new StatisticsData(new JSONObject().put("months",new JSONArray().put(new JSONObject().put("mes","2026-13").put("jogos",8)).put(new JSONObject().put("mes","2026-02").put("jogos",-1))));assertEquals(1,data.months.size());assertEquals(0,data.months.get(0).total());}
 private JSONObject fixture()throws Exception{JSONArray months=new JSONArray();for(int i=1;i<=12;i++)months.put(new JSONObject().put("mes",String.format(java.util.Locale.ROOT,"2026-%02d",i)).put("jogos",i==2?2:0).put("midias",0));return new JSONObject().put("total",8).put("concluidos",4).put("sem_data",2).put("horas",12.5).put("jogos",5).put("filmes",1).put("series",1).put("animes",1).put("months",months);}
 private Context context(int width,float scale){Context app=RuntimeEnvironment.getApplication();Configuration config=new Configuration(app.getResources().getConfiguration());config.screenWidthDp=width;config.fontScale=scale;return app.createConfigurationContext(config);}
 private Button button(View v,String label){if(v instanceof Button&&label.contentEquals(((Button)v).getText()))return (Button)v;if(v instanceof ViewGroup)for(int i=0;i<((ViewGroup)v).getChildCount();i++){Button found=button(((ViewGroup)v).getChildAt(i),label);if(found!=null)return found;}return null;}
 private void layout(View v,int width){v.measure(View.MeasureSpec.makeMeasureSpec(NativeSheet.dp(v.getContext(),width),View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(0,View.MeasureSpec.UNSPECIFIED));v.layout(0,0,v.getMeasuredWidth(),v.getMeasuredHeight());}
}

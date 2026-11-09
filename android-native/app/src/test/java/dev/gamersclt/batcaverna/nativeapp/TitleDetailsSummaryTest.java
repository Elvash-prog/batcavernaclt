package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.content.res.Configuration;
import android.view.View;
import android.widget.*;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class)
@Config(sdk=35,manifest=Config.NONE)
public class TitleDetailsSummaryTest {
 @Test public void editsUseTheSelectedFieldAndKeepStoredValues() throws Exception {
  Context c=context(412,1);JSONObject item=new JSONObject().put("horas",12.5).put("nota","Excelente").put("status","📌 Backlog").put("conquistas",42.5);String before=item.toString();String[] selected={""};
  LinearLayout summary=TitleDetailsSummary.create(c,item,false,key->selected[0]=key);
  for(String field:new String[]{"status","horas","nota"}){assertTrue(summary.findViewWithTag("title-edit-"+field).performClick());assertEquals(field,selected[0]);}
  assertEquals(before,item.toString());
  ProgressBar progress=summary.findViewWithTag("title-achievements");assertEquals(.425,progress.getProgress()/(double)progress.getMax(),.0001);assertTrue(progress.getContentDescription().toString().contains("42,5%"));
 }
 @Test public void readOnlyHasNoEditingAndUnknownProgressIsNotZero() throws Exception {
  LinearLayout summary=TitleDetailsSummary.create(context(412,1),new JSONObject(),false,null);
  for(String field:new String[]{"status","horas","nota"})assertFalse(summary.findViewWithTag("title-edit-"+field).isClickable());
  assertNull(summary.findViewWithTag("title-achievements"));
  assertEquals("Sem tempo registrado",((TextView)summary.findViewWithTag("title-value-horas")).getText().toString());
 }
 @Test public void narrowScreensAndLargeFontsStackMetrics() throws Exception {
  for(Context c:new Context[]{context(320,1),context(412,1.5f)}){
   LinearLayout summary=TitleDetailsSummary.create(c,new JSONObject(),false,null);
   assertEquals(LinearLayout.VERTICAL,((LinearLayout)summary.findViewWithTag("title-progress-metrics")).getOrientation());
  }
 }
 @Test public void mediaNeverShowsGameHoursOrAchievements() throws Exception {
  LinearLayout summary=TitleDetailsSummary.create(context(412,1),new JSONObject().put("horas",20).put("conquistas",50),true,null);
  assertNull(summary.findViewWithTag("title-edit-horas"));assertNull(summary.findViewWithTag("title-achievements"));assertNotNull(summary.findViewWithTag("title-edit-nota"));
 }
 @Test public void detailsAndLibraryBadgeUseTheSameMinutesWithoutChangingHours() throws Exception {
  Context c=context(412,1);
  for(Object[] fixture:new Object[][]{{.9,"54 min"},{"0,9","54 min"},{1.5,"1 h 30 min"},{1.999,"2 h"}}){
   JSONObject item=new JSONObject().put("horas",fixture[0]);String before=item.toString();
   LinearLayout summary=TitleDetailsSummary.create(c,item,false,null);
   assertEquals(fixture[1],((TextView)summary.findViewWithTag("title-value-horas")).getText().toString());
   assertTrue(PlaytimeBadge.create(c,fixture[0]).getContentDescription().toString().endsWith((String)fixture[1]));assertEquals(before,item.toString());
  }
 }
 @Test public void horizontalMetricsHaveEqualHeightAndAlignedActionsWithLongRatings() throws Exception {
  for(int width:new int[]{360,412,720})for(String rating:new String[]{"","⭐⭐⭐⭐½ Excelente","Uma avaliação extensa que precisa continuar legível em várias linhas"}){
   Context c=context(width,1);JSONObject item=new JSONObject().put("horas",.9).put("nota",rating);
   LinearLayout summary=TitleDetailsSummary.create(c,item,false,key->{});
   int available=NativeSheet.dp(c,Math.min(width,720)-56);
   summary.measure(View.MeasureSpec.makeMeasureSpec(available,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(0,View.MeasureSpec.UNSPECIFIED));summary.layout(0,0,available,summary.getMeasuredHeight());
   View hours=summary.findViewWithTag("title-edit-horas"),score=summary.findViewWithTag("title-edit-nota");
   assertEquals("Equal card heights at "+width,hours.getHeight(),score.getHeight());assertTrue(hours.getHeight()>0);assertEquals(hours.getTop(),score.getTop());
   View hourAction=summary.findViewWithTag("title-action-horas"),scoreAction=summary.findViewWithTag("title-action-nota");assertEquals(hourAction.getBottom(),scoreAction.getBottom());
   TextView scoreValue=summary.findViewWithTag("title-value-nota");assertNull(scoreValue.getEllipsize());assertTrue(scoreValue.getBottom()<=scoreAction.getTop());
  }
 }
 private Context context(int width,float scale){Context app=RuntimeEnvironment.getApplication();Configuration config=new Configuration(app.getResources().getConfiguration());config.screenWidthDp=width;config.fontScale=scale;return app.createConfigurationContext(config);}
}

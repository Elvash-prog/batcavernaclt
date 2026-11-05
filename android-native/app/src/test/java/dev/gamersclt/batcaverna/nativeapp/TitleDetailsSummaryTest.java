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
 @Test public void editsUseTheSelectedFieldAndKeepStoredValues() throws Exception {Context c=context(412,1);JSONObject item=new JSONObject().put("horas",12.5).put("nota","Excelente").put("conquistas",42.5);String before=item.toString();String[] selected={""};LinearLayout summary=TitleDetailsSummary.create(c,item,false,key->selected[0]=key);View hours=summary.findViewWithTag("title-edit-horas"),rating=summary.findViewWithTag("title-edit-nota");assertTrue(hours.performClick());assertEquals("horas",selected[0]);assertTrue(rating.performClick());assertEquals("nota",selected[0]);assertEquals(before,item.toString());ProgressBar progress=(ProgressBar)summary.getChildAt(2);assertEquals(425,progress.getProgress());assertTrue(progress.getContentDescription().toString().contains("42,5%"));}
 @Test public void readOnlyHasNoEditingAndUnknownProgressIsNotZero() throws Exception {LinearLayout summary=TitleDetailsSummary.create(context(412,1),new JSONObject(),false,null);assertFalse(summary.findViewWithTag("title-edit-nota").isClickable());assertEquals(1,summary.getChildCount());}
 @Test public void narrowScreensAndLargeFontsStackMetrics() throws Exception {for(Context c:new Context[]{context(320,1),context(412,1.5f)}){LinearLayout summary=TitleDetailsSummary.create(c,new JSONObject(),false,null);assertEquals(LinearLayout.VERTICAL,((LinearLayout)summary.getChildAt(0)).getOrientation());}}
 @Test public void mediaNeverShowsGameHoursOrAchievements() throws Exception {LinearLayout summary=TitleDetailsSummary.create(context(412,1),new JSONObject().put("horas",20).put("conquistas",50),true,null);assertNull(summary.findViewWithTag("title-edit-horas"));assertEquals(1,summary.getChildCount());}
 private Context context(int width,float scale){Context app=RuntimeEnvironment.getApplication();Configuration config=new Configuration(app.getResources().getConfiguration());config.screenWidthDp=width;config.fontScale=scale;return app.createConfigurationContext(config);}
}

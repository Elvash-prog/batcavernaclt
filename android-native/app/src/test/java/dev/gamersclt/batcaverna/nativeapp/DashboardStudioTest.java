package dev.gamersclt.batcaverna.nativeapp;
import android.app.Activity;
import android.content.Context;
import android.content.res.Configuration;
import android.view.*;
import android.widget.*;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class) @Config(sdk=35,manifest=Config.NONE)
public class DashboardStudioTest {
 @Test public void greetingAndExploreRemainAvailableWithLargeFonts()throws Exception{Context c=context(320,1.6f);int[] visits={0};String name="Jogador com nome comprido";DashboardBanner banner=new DashboardBanner(c,new JSONObject().put("nome",name),()->visits[0]++);layout(banner,NativeSheet.dp(c,284));TextView title=banner.findViewWithTag("dashboard-greeting");Button explore=banner.findViewWithTag("dashboard-explore");assertEquals("Olá, "+name,title.getText().toString());assertNull(title.getEllipsize());assertEquals(View.GONE,banner.progress.getVisibility());assertTrue(explore.getBottom()<=((View)explore.getParent()).getHeight());assertTrue(explore.performClick());assertEquals(1,visits[0]);}
 @Test public void totalsNavigateOnlyToTheAssociatedLibraries()throws Exception{int[] visits={0,0};JSONObject data=new JSONObject().put("total",23).put("media",8).put("playing",4).put("finished",12);String before=data.toString();LinearLayout metrics=DashboardMetrics.create(context(412,1),data,()->visits[0]++,()->visits[1]++);assertTrue(metrics.findViewWithTag("dashboard-metric-total").performClick());assertTrue(metrics.findViewWithTag("dashboard-metric-media").performClick());assertFalse(metrics.findViewWithTag("dashboard-metric-finished").isClickable());assertArrayEquals(new int[]{1,1},visits);assertEquals(before,data.toString());}
 @Test public void narrowMetricsStackAndFitTheAvailableWidth()throws Exception{Context c=context(320,1.6f);LinearLayout metrics=DashboardMetrics.create(c,new JSONObject().put("total",1234),()->{},()->{});layout(metrics,NativeSheet.dp(c,284));assertEquals(4,metrics.getChildCount());for(int i=0;i<metrics.getChildCount();i++){LinearLayout row=(LinearLayout)metrics.getChildAt(i);assertEquals(1,row.getChildCount());View card=row.getChildAt(0);assertTrue(card.getWidth()>0);assertTrue(card.getRight()<=metrics.getWidth());}}
 @Test public void changingNativeDestinationKeepsOneSelectedNavigationItem(){Activity a=Robolectric.buildActivity(Activity.class).setup().get();SessionPreferences.get(a).edit().putBoolean("authenticated",false).apply();HomeView home=new HomeView(a);a.setContentView(home);assertNotNull(description(home,"Configurações"));assertTrue(description(home,"Configurações").isClickable());assertEquals(1,selected(home));home.navigate(5);assertEquals(1,selected(home));assertNotNull(description(home,"Filmes, selecionado"));a.finish();}
 private int selected(View v){int n=v.isSelected()&&v.getContentDescription()!=null&&v.getContentDescription().toString().endsWith(", selecionado")?1:0;if(v instanceof ViewGroup)for(int i=0;i<((ViewGroup)v).getChildCount();i++)n+=selected(((ViewGroup)v).getChildAt(i));return n;}
 private View description(View v,String value){if(value.contentEquals(v.getContentDescription()==null?"":v.getContentDescription()))return v;if(v instanceof ViewGroup)for(int i=0;i<((ViewGroup)v).getChildCount();i++){View found=description(((ViewGroup)v).getChildAt(i),value);if(found!=null)return found;}return null;}
 private Context context(int width,float scale){Context app=RuntimeEnvironment.getApplication();Configuration config=new Configuration(app.getResources().getConfiguration());config.screenWidthDp=width;config.fontScale=scale;return app.createConfigurationContext(config);}
 private void layout(View v,int width){v.measure(View.MeasureSpec.makeMeasureSpec(width,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(0,View.MeasureSpec.UNSPECIFIED));v.layout(0,0,width,v.getMeasuredHeight());}
}

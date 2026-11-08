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
public class TitleDetailsHeroTest {
 @Test public void narrowAndLargeFontHeadersStackWithoutTruncatingTheTitle() throws Exception {
  String title="Um título longo que deve continuar visível em telas pequenas";
  for(Context c:new Context[]{context(320,1),context(412,1.6f)}){
   JSONObject item=new JSONObject().put("nome",title).put("plataforma","PC").put("ano",2026);String before=item.toString();
   LinearLayout hero=TitleDetailsHero.create(c,item,false,true);assertEquals(LinearLayout.VERTICAL,hero.getOrientation());
   TextView name=hero.findViewWithTag("title-details-name");assertEquals(title,name.getText().toString());assertNull(name.getEllipsize());
   hero.measure(View.MeasureSpec.makeMeasureSpec(NativeSheet.dp(c,280),View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(0,View.MeasureSpec.UNSPECIFIED));
   assertTrue(name.getMeasuredHeight()>0);assertEquals(before,item.toString());
  }
 }
 @Test public void regularHeaderKeepsCoverBesideHeading() throws Exception {assertEquals(LinearLayout.HORIZONTAL,TitleDetailsHero.create(context(412,1),new JSONObject().put("nome","Control"),false,false).getOrientation());}
 private Context context(int width,float scale){Context app=RuntimeEnvironment.getApplication();Configuration config=new Configuration(app.getResources().getConfiguration());config.screenWidthDp=width;config.fontScale=scale;return app.createConfigurationContext(config);}
}

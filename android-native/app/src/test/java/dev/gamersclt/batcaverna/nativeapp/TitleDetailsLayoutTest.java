package dev.gamersclt.batcaverna.nativeapp;

import android.content.Context;
import android.content.res.Configuration;
import android.widget.LinearLayout;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class)
@Config(sdk=35, manifest=Config.NONE)
public class TitleDetailsLayoutTest {
 @Test public void regularPhonePairsDetails() throws Exception {assertColumns(412,1f,2);}
 @Test public void largeTextHasFullWidthDetails() throws Exception {assertColumns(412,1.5f,1);}
 @Test public void narrowPhoneHasFullWidthDetails() throws Exception {assertColumns(320,1f,1);}
 private void assertColumns(int width,float fontScale,int columns) throws Exception {
  Context app=RuntimeEnvironment.getApplication();
  Configuration config=new Configuration(app.getResources().getConfiguration());
  config.screenWidthDp=width;config.fontScale=fontScale;
  Context context=app.createConfigurationContext(config);
  LinearLayout body=new LinearLayout(context);body.setOrientation(LinearLayout.VERTICAL);
  java.lang.reflect.Method row=TitleDetailsDialog.class.getDeclaredMethod("row",Context.class,LinearLayout.class,String.class,String.class);
  row.setAccessible(true);
  for(int i=0;i<4;i++)row.invoke(null,context,body,"Sua avaliação","Ainda não avaliado");
  assertEquals(4/columns,body.getChildCount());
  for(int i=0;i<body.getChildCount();i++)assertEquals(columns,((LinearLayout)body.getChildAt(i)).getChildCount());
 }
}

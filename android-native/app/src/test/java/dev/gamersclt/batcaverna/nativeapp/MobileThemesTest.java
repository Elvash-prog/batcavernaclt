package dev.gamersclt.batcaverna.nativeapp;
import android.app.Activity;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.widget.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class) @Config(sdk={23,35},manifest=Config.NONE)
public class MobileThemesTest {
 @Test public void lightPalettesKeepControlsReadableAndDarkChoicesRemainAvailable(){
  Activity a=Robolectric.buildActivity(Activity.class).setup().get();assertEquals(NativeTheme.KEYS.length,NativeTheme.LABELS.length);
  for(String key:new String[]{"claro","sakura","lavanda"}){int i=java.util.Arrays.asList(NativeTheme.KEYS).indexOf(key);assertTrue(i>=0);NativeTheme.select(a,i);assertTrue(NativeTheme.light(a));
   TextView title=NativeSheet.text(a,"Título",20,0xfff3effa);assertTrue(NativeTheme.contrast(title.getCurrentTextColor(),NativeTheme.panel(a))>=4.5);
   TextView muted=NativeSheet.text(a,"Legenda",14,0xffbba7df);assertTrue(NativeTheme.contrast(muted.getCurrentTextColor(),NativeTheme.panel(a))>=4.5);
   EditText input=NativeSheet.input(a,"Nome",100);assertTrue(NativeTheme.contrast(input.getCurrentTextColor(),NativeTheme.panelDark(a))>=4.5);assertTrue(NativeTheme.contrast(input.getCurrentHintTextColor(),NativeTheme.panelDark(a))>=4.5);
   Button primary=new Button(a);AppStyle.button(primary,true);assertEquals(Color.WHITE,primary.getCurrentTextColor());assertTrue(NativeTheme.contrast(primary.getCurrentTextColor(),NativeTheme.accent(a))>=4.5);
   Button secondary=new Button(a);AppStyle.button(secondary,false);assertTrue(NativeTheme.contrast(secondary.getCurrentTextColor(),NativeTheme.panelDark(a))>=4.5);assertEquals(NativeTheme.panel(a),NativeTheme.surfaceColor(a,0xff211b2d));
  }
  for(int i=0;i<6;i++){NativeTheme.select(a,i);assertFalse(NativeTheme.light(a));assertEquals(0xfff3effa,NativeTheme.textColor(a,0xfff3effa));assertEquals(0xff211b2d,NativeTheme.surfaceColor(a,0xff211b2d));}
  a.finish();
 }
}

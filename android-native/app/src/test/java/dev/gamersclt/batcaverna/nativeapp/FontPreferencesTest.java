package dev.gamersclt.batcaverna.nativeapp;
import android.content.*;
import android.graphics.Typeface;
import android.widget.*;
import org.junit.*;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class) @Config(sdk={23,35},manifest=Config.NONE)
public class FontPreferencesTest {
 @Before public void reset(){Context c=RuntimeEnvironment.getApplication();c.getSharedPreferences("batcaverna.typography",0).edit().clear().commit();SessionPreferences.get(c).edit().clear().putString("user_id","font-a").commit();}
 @Test public void choiceSurvivesLogoutAndIsIsolatedByAccount(){Context c=RuntimeEnvironment.getApplication();FontPreferences.select(c,2);assertEquals(2,FontPreferences.index(c));SessionPreferences.get(c).edit().clear().commit();assertEquals(0,FontPreferences.index(c));SessionPreferences.get(c).edit().putString("user_id","font-b").commit();assertEquals(0,FontPreferences.index(c));SessionPreferences.get(c).edit().putString("user_id","font-a").commit();assertEquals(2,FontPreferences.index(c));}
 @Test public void familyChangesPreserveBoldAndRestoreTheOriginal(){Context c=RuntimeEnvironment.getApplication();LinearLayout root=new LinearLayout(c);TextView text=new TextView(c);text.setTypeface(Typeface.create("sans-serif",Typeface.BOLD));Typeface original=text.getTypeface();root.addView(text);FontPreferences.install(root);FontPreferences.select(c,2);assertEquals(Typeface.create("serif",Typeface.BOLD),text.getTypeface());assertEquals(Typeface.BOLD,text.getTypeface().getStyle());FontPreferences.select(c,0);assertEquals(original,text.getTypeface());}
 @Test public void newTextUsesTheCurrentChoiceAndInvalidValuesRestoreSystem(){Context c=RuntimeEnvironment.getApplication();FontPreferences.select(c,4);LinearLayout root=new LinearLayout(c);TextView text=new TextView(c);root.addView(text);FontPreferences.install(root);assertEquals(Typeface.MONOSPACE,text.getTypeface());FontPreferences.select(c,900);assertEquals(0,FontPreferences.index(c));}
}

package dev.gamersclt.batcaverna.nativeapp;
import android.app.*;
import android.content.Context;
import android.view.*;
import android.widget.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import org.robolectric.shadows.ShadowDialog;
import java.util.*;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class) @Config(sdk={23,35},manifest=Config.NONE)
public class SettingsMenuTest {
 @Test public void searchMatchesSubjectsWithoutChangingPreferences(){Context c=RuntimeEnvironment.getApplication();Map<String,?> before=new HashMap<>(SessionPreferences.get(c).getAll());int[] selected={-1};SettingsMenu menu=new SettingsMenu(c,tab->selected[0]=tab);EditText search=menu.findViewWithTag("settings-menu-search");search.setText("SENHA");assertEquals(View.VISIBLE,menu.findViewWithTag("settings-category-0").getVisibility());assertEquals(View.GONE,menu.findViewWithTag("settings-category-1").getVisibility());assertTrue(menu.findViewWithTag("settings-category-0").performClick());assertEquals(0,selected[0]);search.setText("INTEGRAÇÕES");assertEquals(View.VISIBLE,menu.findViewWithTag("settings-category-7").getVisibility());assertEquals(before,SessionPreferences.get(c).getAll());}
 @Test public void clearingTheSearchRestoresAllCategories(){Context c=RuntimeEnvironment.getApplication();SettingsMenu menu=new SettingsMenu(c,tab->{});EditText search=menu.findViewWithTag("settings-menu-search");search.setText("nenhum ajuste encontrado");for(int i=0;i<8;i++)assertEquals(View.GONE,menu.findViewWithTag("settings-category-"+i).getVisibility());search.setText("");for(int i=0;i<8;i++)assertEquals(View.VISIBLE,menu.findViewWithTag("settings-category-"+i).getVisibility());}
 @Test public void largeFontThemesKeepTheirLabelsAndCurrentSelection(){Activity a=Robolectric.buildActivity(Activity.class).setup().get();android.content.res.Configuration config=new android.content.res.Configuration(a.getResources().getConfiguration());config.fontScale=1.6f;config.screenWidthDp=320;a.getResources().updateConfiguration(config,a.getResources().getDisplayMetrics());SettingsSheet.show(a);Dialog dialog=ShadowDialog.getLatestDialog();View root=dialog.getWindow().getDecorView();root.findViewWithTag("settings-category-1").performClick();View panel=root.findViewWithTag("settings-panel");panel.measure(View.MeasureSpec.makeMeasureSpec(NativeSheet.dp(a,260),View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(0,View.MeasureSpec.UNSPECIFIED));panel.layout(0,0,panel.getMeasuredWidth(),panel.getMeasuredHeight());Button current=(Button)findDescription(panel,"Tema "+NativeTheme.LABELS[NativeTheme.index(a)]+", selecionado");assertNotNull(current);assertTrue(current.isSelected());assertTrue(current.getWidth()>NativeSheet.dp(a,200));assertTrue(current.getHeight()>=NativeSheet.dp(a,52));dialog.dismiss();a.finish();}
 private View findDescription(View view,String text){if(text.contentEquals(view.getContentDescription()==null?"":view.getContentDescription()))return view;if(view instanceof ViewGroup)for(int i=0;i<((ViewGroup)view).getChildCount();i++){View found=findDescription(((ViewGroup)view).getChildAt(i),text);if(found!=null)return found;}return null;}
 @Test public void returningToTheMenuKeepsTheSearch(){Activity a=Robolectric.buildActivity(Activity.class).setup().get();SettingsSheet.show(a);Dialog dialog=ShadowDialog.getLatestDialog();View root=dialog.getWindow().getDecorView();SettingsMenu menu=root.findViewWithTag("settings-menu");EditText search=menu.findViewWithTag("settings-menu-search");search.setText("bloqueios");menu.findViewWithTag("settings-category-3").performClick();assertEquals(View.GONE,menu.getVisibility());assertEquals(View.VISIBLE,root.findViewWithTag("settings-panel").getVisibility());root.findViewWithTag("settings-back").performClick();assertEquals(View.VISIBLE,menu.getVisibility());assertEquals("bloqueios",search.getText().toString());dialog.dismiss();a.finish();}
}

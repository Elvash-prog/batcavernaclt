package dev.gamersclt.batcaverna.nativeapp;
import android.app.Activity;import android.os.Looper;import android.view.*;import android.widget.*;
import org.json.*;import org.junit.Test;import org.junit.runner.RunWith;import org.robolectric.*;import org.robolectric.annotation.Config;
import java.lang.reflect.*;import java.nio.file.*;import java.util.*;import java.util.concurrent.TimeUnit;
import static org.junit.Assert.*;import static org.robolectric.Shadows.shadowOf;
@RunWith(RobolectricTestRunner.class) @Config(sdk=35,manifest=Config.NONE)
public class LibraryControlsTest {
 @Test public void combiningControlsAndClearingKeepsTheChosenOrder()throws Exception{
  Activity activity=Robolectric.buildActivity(Activity.class).setup().get();AccountDataView library=new AccountDataView(activity,false,0);activity.setContentView(library);layout(library);
  JSONArray rows=new JSONArray(new String(Files.readAllBytes(Paths.get(System.getProperty("library.fixture"))),java.nio.charset.StandardCharsets.UTF_8));Field data=AccountDataView.class.getDeclaredField("all");data.setAccessible(true);data.set(library,rows);invoke(library,"rebuildFilters");invoke(library,"render");layout(library);shadowOf(Looper.getMainLooper()).idle();
  button(library,"Filtrar ▾").performClick();layout(library);shadowOf(Looper.getMainLooper()).idle();
  select((Spinner)findDescription(library,"Gênero"),"RPG");select((Spinner)findDescription(library,"Plataforma"),"PC");EditText search=findSearch(library);search.setText("ecarlate pokemon");shadowOf(Looper.getMainLooper()).idleFor(220,TimeUnit.MILLISECONDS);assertNotNull(library.findViewWithTag("1"));assertNull(library.findViewWithTag("2"));
  select((Spinner)findDescription(library,"Ordenação"),"Maior nota");button(library,"Limpar busca e filtros").performClick();layout(library);shadowOf(Looper.getMainLooper()).idleFor(220,TimeUnit.MILLISECONDS);assertEquals("",search.getText().toString());assertEquals("Maior nota",((Spinner)findDescription(library,"Ordenação")).getSelectedItem());List<String> ids=new ArrayList<>();collectIds(library,ids);assertEquals(Arrays.asList("1","3","2","5"),ids);activity.finish();
 }
 private void invoke(AccountDataView view,String name)throws Exception{Method method=AccountDataView.class.getDeclaredMethod(name);method.setAccessible(true);method.invoke(view);}
 private void select(Spinner spinner,String text){assertNotNull(spinner);for(int i=0;i<spinner.getCount();i++)if(text.equals(String.valueOf(spinner.getItemAtPosition(i)))){spinner.setSelection(i);shadowOf(Looper.getMainLooper()).idle();return;}fail("Choice missing: "+text);}
 private View findDescription(View view,String text){if(text.contentEquals(view.getContentDescription()==null?"":view.getContentDescription()))return view;if(view instanceof ViewGroup)for(int i=0;i<((ViewGroup)view).getChildCount();i++){View found=findDescription(((ViewGroup)view).getChildAt(i),text);if(found!=null)return found;}return null;}
 private Button button(View view,String text){if(view instanceof Button&&text.contentEquals(((Button)view).getText()))return (Button)view;if(view instanceof ViewGroup)for(int i=0;i<((ViewGroup)view).getChildCount();i++){Button found=button(((ViewGroup)view).getChildAt(i),text);if(found!=null)return found;}return null;}
 private EditText findSearch(View view){if(view instanceof EditText)return (EditText)view;if(view instanceof ViewGroup)for(int i=0;i<((ViewGroup)view).getChildCount();i++){EditText found=findSearch(((ViewGroup)view).getChildAt(i));if(found!=null)return found;}return null;}
 private void collectIds(View view,List<String> ids){if(view.getTag() instanceof String&&String.valueOf(view.getTag()).matches("[1-5]")){ids.add(String.valueOf(view.getTag()));return;}if(view instanceof ViewGroup)for(int i=0;i<((ViewGroup)view).getChildCount();i++)collectIds(((ViewGroup)view).getChildAt(i),ids);}
 private void layout(View view){view.measure(View.MeasureSpec.makeMeasureSpec(480,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(900,View.MeasureSpec.EXACTLY));view.layout(0,0,480,900);}
}

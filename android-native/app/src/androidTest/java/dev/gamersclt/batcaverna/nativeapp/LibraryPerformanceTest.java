package dev.gamersclt.batcaverna.nativeapp;
import android.app.Activity;
import android.content.Intent;
import android.os.SystemClock;
import android.view.*;
import android.widget.*;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.*;
import org.junit.Test;
import java.io.*;
import java.lang.reflect.*;
import java.util.*;
import static org.junit.Assert.*;
/** Repeatable synthetic data; no account writes, network or real-user library. */
public class LibraryPerformanceTest {
 @Test public void largeCollectionsKeepMountedCardsBoundedAndRemainSearchable()throws Exception{
  android.app.Instrumentation instrumentation=InstrumentationRegistry.getInstrumentation();Intent intent=new Intent(instrumentation.getTargetContext(),MainActivity.class);intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);Activity activity=instrumentation.startActivitySync(intent);
  JSONObject report=new JSONObject().put("environment","Android API 35 emulator; synthetic private artwork without credentials; repeated UI-thread medians");JSONArray cases=new JSONArray();report.put("cases",cases);
  try{for(int size:new int[]{500,2000}){
   JSONArray rows=new JSONArray();for(int i=0;i<size;i++)rows.put(new JSONObject().put("id","perf-"+i).put("nome",String.format(Locale.ROOT,"Coleção Áurea %04d",size-i)).put("categoria","jogos").put("status",i%3==0?"🎮 Em Progresso":i%3==1?"📌 Backlog":"✅ Zerado").put("generos",i%2==0?"RPG • Estratégia":"Ação • Aventura").put("plataforma",i%3==0?"PlayStation 5":"PC • Switch").put("horas",i/10.0).put("nota",i%2==0?"⭐⭐⭐ Ok":"⭐⭐⭐⭐ Muito bom").put("updated_at",String.format(Locale.ROOT,"2026-11-%02dT10:00:00.123Z",i%28+1)).put("capa",BuildConfig.SUPABASE_URL+"/storage/v1/object/public/avatars/performance-fixture.jpg"));
   final AccountDataView[] screen=new AccountDataView[1];instrumentation.runOnMainSync(()->{screen[0]=new AccountDataView(activity,false,0);activity.setContentView(screen[0]);});instrumentation.waitForIdleSync();SystemClock.sleep(100);instrumentation.waitForIdleSync();
   JSONObject result=new JSONObject().put("size",size);instrumentation.runOnMainSync(()->{try{
    AccountDataView view=screen[0];set(view,"all",rows);set(view,"loaded",true);set(view,"loading",false);set(view,"loadError","");Method draw=AccountDataView.class.getDeclaredMethod("render");draw.setAccessible(true);EditText search=(EditText)get(view,"search");LinearLayout list=(LinearLayout)get(view,"list");
    ArrayList<JSONObject> values=new ArrayList<>();for(int i=0;i<rows.length();i++)values.add(rows.optJSONObject(i));
    search.setText("colecao aurea 0001");long firstSearch=SystemClock.elapsedRealtimeNanos();draw.invoke(view);layout(view);result.put("coldSearchMs",(SystemClock.elapsedRealtimeNanos()-firstSearch)/1e6);assertEquals(1,count(list));search.setText("");draw.invoke(view);layout(view);
    result.put("querySortMs",median(()->{List<JSONObject> filtered=new ArrayList<>();for(JSONObject row:values)if(LibraryQuery.matches(row,"colecao aurea","acao","PC"))filtered.add(row);Collections.sort(filtered,LibraryQuery.comparator("rating"));}));
    result.put("renderMs",median(()->{draw.invoke(view);layout(view);}));int mounted=count(list);assertTrue("Mounted cards must remain bounded",mounted<=42);result.put("cards",mounted);
    search.setText("colecao aurea 0001");result.put("searchMs",median(()->{draw.invoke(view);layout(view);}));assertEquals(1,count(list));result.put("searchFound",count(list));
    search.setText("");set(view,"order","name");result.put("sortMs",median(()->{draw.invoke(view);layout(view);}));
    View first=findCard(list);Button more=findMore(list);assertNotNull(first);assertNotNull(more);String id=String.valueOf(first.getTag());long at=SystemClock.elapsedRealtimeNanos();more.performClick();layout(view);result.put("expandMs",(SystemClock.elapsedRealtimeNanos()-at)/1e6);assertSame("Expanding retains earlier cards",first,list.findViewWithTag(id));result.put("cardsAfterExpand",count(list));
    Runtime runtime=Runtime.getRuntime();result.put("javaHeapMiB",(runtime.totalMemory()-runtime.freeMemory())/1048576.0);
   }catch(Exception e){throw new AssertionError(e);}});cases.put(result);
  }
  File out=new File(instrumentation.getTargetContext().getFilesDir(),"library-performance.json");try(FileOutputStream stream=new FileOutputStream(out)){stream.write(report.toString(2).getBytes(java.nio.charset.StandardCharsets.UTF_8));}
  }finally{instrumentation.runOnMainSync(activity::finish);}
 }
 private interface Work {void run()throws Exception;}
 private double median(Work work)throws Exception{double[] values=new double[6];for(int i=-2;i<values.length;i++){long at=SystemClock.elapsedRealtimeNanos();work.run();if(i>=0)values[i]=(SystemClock.elapsedRealtimeNanos()-at)/1e6;}Arrays.sort(values);return values[3];}
 private Object get(Object object,String name)throws Exception{Field field=object.getClass().getDeclaredField(name);field.setAccessible(true);return field.get(object);}
 private void set(Object object,String name,Object value)throws Exception{Field field=object.getClass().getDeclaredField(name);field.setAccessible(true);field.set(object,value);}
 private void layout(View view){view.measure(View.MeasureSpec.makeMeasureSpec(NativeSheet.dp(view.getContext(),360),View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(NativeSheet.dp(view.getContext(),740),View.MeasureSpec.EXACTLY));view.layout(0,0,view.getMeasuredWidth(),view.getMeasuredHeight());}
 private int count(View view){if(view.getTag() instanceof String&&view.getTag().toString().startsWith("perf-"))return 1;int n=0;if(view instanceof ViewGroup)for(int i=0;i<((ViewGroup)view).getChildCount();i++)n+=count(((ViewGroup)view).getChildAt(i));return n;}
 private View findCard(View view){if(view.getTag() instanceof String&&view.getTag().toString().startsWith("perf-"))return view;if(view instanceof ViewGroup)for(int i=0;i<((ViewGroup)view).getChildCount();i++){View found=findCard(((ViewGroup)view).getChildAt(i));if(found!=null)return found;}return null;}
 private Button findMore(View view){if(view instanceof Button&&((Button)view).getText().toString().startsWith("Ver mais"))return (Button)view;if(view instanceof ViewGroup)for(int i=0;i<((ViewGroup)view).getChildCount();i++){Button found=findMore(((ViewGroup)view).getChildAt(i));if(found!=null)return found;}return null;}
}

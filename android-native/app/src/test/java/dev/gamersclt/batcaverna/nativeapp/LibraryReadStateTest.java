package dev.gamersclt.batcaverna.nativeapp;
import android.app.Activity;
import org.json.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import java.lang.reflect.*;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class) @Config(sdk=35,manifest=Config.NONE)
public class LibraryReadStateTest {
 @Test public void failedOrPendingInitialReadsNeverShowAnEmptyCollection()throws Exception{Activity a=Robolectric.buildActivity(Activity.class).setup().get();AccountDataView view=new AccountDataView(a,false,1);set(view,"loaded",false);set(view,"all",new JSONArray());set(view,"loading",true);draw(view);assertNotNull(view.findViewWithTag("screen-state-loading"));assertNull(view.findViewWithTag("screen-state-empty"));set(view,"loading",false);set(view,"loadError","Falha de conexão");draw(view);assertNull(view.findViewWithTag("screen-state-loading"));assertNull(view.findViewWithTag("screen-state-empty"));a.finish();}
 @Test public void successfulEmptyReadOffersAFirstTitle()throws Exception{Activity a=Robolectric.buildActivity(Activity.class).setup().get();AccountDataView view=new AccountDataView(a,false,1);set(view,"loaded",true);set(view,"loading",false);set(view,"loadError","");set(view,"all",new JSONArray());draw(view);assertNotNull(view.findViewWithTag("screen-state-empty"));a.finish();}
 @Test public void readFailureKeepsPreviouslyLoadedCards()throws Exception{Activity a=Robolectric.buildActivity(Activity.class).setup().get();AccountDataView view=new AccountDataView(a,false,0);set(view,"loaded",true);set(view,"loading",false);set(view,"loadError","Falha de conexão");set(view,"all",new JSONArray().put(new JSONObject().put("id","kept").put("nome","Jogo mantido").put("categoria","jogos").put("status","📌 Backlog")));draw(view);assertNotNull(view.findViewWithTag("kept"));assertNull(view.findViewWithTag("screen-state-empty"));a.finish();}
 private void set(Object o,String name,Object value)throws Exception{Field f=o.getClass().getDeclaredField(name);f.setAccessible(true);f.set(o,value);}
 private void draw(Object o)throws Exception{Method m=o.getClass().getDeclaredMethod("render");m.setAccessible(true);m.invoke(o);}
}

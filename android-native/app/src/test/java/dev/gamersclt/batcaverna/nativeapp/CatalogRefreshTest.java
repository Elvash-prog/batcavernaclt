package dev.gamersclt.batcaverna.nativeapp;
import android.app.*;
import android.view.*;
import android.widget.*;
import org.json.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import org.robolectric.shadows.ShadowDialog;
import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class) @Config(sdk={23,35},manifest=Config.NONE)
public class CatalogRefreshTest {
 static class Catalog implements CatalogRefreshDialog.Source {
  AccountRepository.Callback search,details;int type;boolean media;
  public void search(String term,boolean media,int type,AccountRepository.Callback cb){search=cb;this.type=type;this.media=media;}
  public void details(JSONObject row,boolean media,int type,AccountRepository.Callback cb){details=cb;}
 }
 @Test public void metadataNeverOverwritesProgressOrChosenCoverImplicitly()throws Exception{
  JSONObject current=new JSONObject("{\"nome\":\"Meu título\",\"ano\":\"\",\"generos\":\"RPG\",\"horas\":2.441666666,\"status\":\"✅ Zerado\",\"nota\":\"⭐⭐⭐⭐ Bom\",\"review\":\"Minha nota\",\"inicio\":\"2026-11-01\",\"conquistas\":10.39,\"capa\":\"https://example.com/pinned.png\",\"capa_adulta\":false}");
  JSONObject data=CatalogRefreshInput.normalize(new JSONObject("{\"name\":\"Hades\",\"released\":\"2020-09-17\",\"generos\":[{\"name\":\"Action\"}],\"tempo_est\":22,\"steam_appid\":1145360,\"cover_image\":\"https://images.igdb.com/igdb/image/upload/t_cover_big/co.png\",\"adult\":true,\"horas\":0,\"status\":\"Backlog\"}"),false);
  JSONObject fill=CatalogRefreshInput.merge(current,data,false,false);assertEquals("2020",fill.getString("ano"));assertEquals("Meu título",fill.getString("nome"));assertEquals("RPG",fill.getString("generos"));assertEquals(current.getString("capa"),fill.getString("capa"));assertFalse(fill.getBoolean("capa_adulta"));
  JSONObject replace=CatalogRefreshInput.merge(current,data,true,true);assertEquals("Hades",replace.getString("nome"));assertEquals("Action",replace.getString("generos"));assertEquals(data.getString("capa"),replace.getString("capa"));assertTrue(replace.getBoolean("capa_adulta"));for(String key:new String[]{"horas","status","nota","review","inicio","conquistas"})assertEquals(current.get(key),replace.get(key));
  assertEquals("2.44",CatalogRefreshInput.number("2.441666666"));assertEquals("0",CatalogRefreshInput.number("0.0"));assertEquals("",CatalogRefreshInput.number(""));
  assertFalse(CatalogRefreshInput.normalize(new JSONObject().put("steam_appid",0),false).has("steam_appid"));
 }
 @Test public void searchIgnoresStaleRepliesAndRetriesDetailsBeforeApplying()throws Exception{
  Activity a=Robolectric.buildActivity(Activity.class).setup().get();Catalog catalog=new Catalog();final JSONObject[] applied={null};CatalogRefreshDialog dialog=new CatalogRefreshDialog(a,new JSONObject().put("nome","Hades"),false,(data,replace,cover)->applied[0]=data,()->{},catalog);Shadows.shadowOf(android.os.Looper.getMainLooper()).idle();
  View root=dialog.sheet.dialog.getWindow().getDecorView();root.findViewWithTag("refresh-search").performClick();AccountRepository.Callback old=catalog.search;((EditText)root.findViewWithTag("refresh-query")).setText("Hades 2");root.findViewWithTag("refresh-search").performClick();old.done(new JSONArray().put(new JSONObject().put("name","Old")),null);assertNull(root.findViewWithTag("refresh-result-0"));
  catalog.search.done(new JSONArray().put(new JSONObject().put("id",1).put("name","Hades II")),null);root.findViewWithTag("refresh-result-0").performClick();assertNotNull(catalog.details);catalog.details.done(null,"Sem conexão");assertTrue(((TextView)root.findViewWithTag("refresh-state")).getText().toString().contains("Sem conexão"));assertNull(applied[0]);assertTrue(dialog.sheet.dialog.isShowing());
  root.findViewWithTag("refresh-result-0").performClick();catalog.details.done(new JSONArray().put(new JSONObject().put("name","Hades II").put("ano","2025")),null);Dialog review=ShadowDialog.getLatestDialog();review.getWindow().getDecorView().findViewWithTag("refresh-fill").performClick();assertEquals("Hades II",applied[0].getString("nome"));assertFalse(dialog.sheet.dialog.isShowing());a.finish();
 }
 @Test public void mediaTypeIsRespectedAndRepliesFromAnotherAccountAreIgnored()throws Exception{
  Activity a=Robolectric.buildActivity(Activity.class).setup().get();SessionPreferences.get(a).edit().putString("user_id","owner-a").commit();Catalog catalog=new Catalog();CatalogRefreshDialog dialog=new CatalogRefreshDialog(a,new JSONObject().put("nome","Frieren").put("tipo","Anime"),true,(d,r,c)->fail("Stale response"),()->{},catalog);Shadows.shadowOf(android.os.Looper.getMainLooper()).idle();View root=dialog.sheet.dialog.getWindow().getDecorView();root.findViewWithTag("refresh-search").performClick();assertTrue(catalog.media);assertEquals(2,catalog.type);SessionPreferences.get(a).edit().putString("user_id","owner-b").commit();catalog.search.done(new JSONArray().put(new JSONObject().put("nome","Frieren")),null);assertNull(root.findViewWithTag("refresh-result-0"));dialog.sheet.dialog.dismiss();a.finish();
 }
}

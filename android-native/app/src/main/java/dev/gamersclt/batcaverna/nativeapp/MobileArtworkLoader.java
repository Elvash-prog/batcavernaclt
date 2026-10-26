package dev.gamersclt.batcaverna.nativeapp;
import android.widget.ImageView;
import android.util.LruCache;
import org.json.JSONObject;
import java.lang.ref.WeakReference;
import java.util.*;
/** Public catalogue art is selected locally; never writes the shared library cover. */
final class MobileArtworkLoader {
 private static final class Target {final WeakReference<ImageView> view;final String fallback;final Object ticket;Target(ImageView image,String source){view=new WeakReference<>(image);fallback=source;ticket=image.getTag();}}
 private static final LruCache<String,String> CACHE=new LruCache<>(128);
 private static final Map<String,List<Target>> PENDING=new HashMap<>();
 private static void steamFallback(ImageView image,JSONObject item){
  String key="steam:"+SteamMetadataPolicy.key(item.optString("nome"));String cached=CACHE.get(key);
  if(cached!=null){if(!cached.isEmpty())AccountImageLoader.loadArtwork(image,cached,item.optString("capa"));return;}
  List<Target> waiting=PENDING.get(key);if(waiting!=null){waiting.add(new Target(image,item.optString("capa")));return;}
  waiting=new ArrayList<>();waiting.add(new Target(image,item.optString("capa")));PENDING.put(key,waiting);
  new AccountRepository(image.getContext()).steamMetadata(item,(rows,error)->{List<Target> targets=PENDING.remove(key);if(error!=null||rows==null)return;JSONObject game=rows.optJSONObject(0);String source=game==null?"":game.optString("capa");if(!CoverPolicy.publicUrl(source))source="";CACHE.put(key,source);if(targets!=null&&!source.isEmpty())for(Target target:targets){ImageView view=target.view.get();if(view!=null&&view.isAttachedToWindow()&&view.getTag()==target.ticket)AccountImageLoader.loadArtwork(view,source,target.fallback);}});
 }
 private static String choiceKey(JSONObject item,boolean media,boolean vertical){return new org.json.JSONArray().put(media).put(item.optString("tipo")).put(item.optString("nome")).put(item.optString("ano")).put(item.optString("steam_appid")).put(item.optString("capa")).put(vertical).toString();}
 private static String saved(android.content.SharedPreferences prefs,String owner,String key){try{return new JSONObject(prefs.getString("artwork_choices:"+owner,"{}")).optString(key,null);}catch(Exception error){return null;}}
 private static void remember(android.content.SharedPreferences prefs,String owner,String key,String source){try{JSONObject choices=new JSONObject(prefs.getString("artwork_choices:"+owner,"{}"));choices.put(key,source);while(choices.length()>512)choices.remove(choices.keys().next());prefs.edit().putString("artwork_choices:"+owner,choices.toString()).apply();}catch(Exception ignored){}}
 private static void display(ImageView image,JSONObject item,boolean media,boolean vertical,String source){if(source!=null&&!source.isEmpty())AccountImageLoader.loadArtwork(image,source,item.optString("capa"));else AccountImageLoader.loadMobile(image,item.optString("capa"),media?"":item.optString("steam_appid"),vertical,media?null:()->steamFallback(image,item));}
 static void load(ImageView image,JSONObject item,boolean media,boolean vertical){
  String fallback=item.optString("capa");
  if(fallback.startsWith(BuildConfig.SUPABASE_URL+"/storage/")){AccountImageLoader.load(image,fallback);return;}
  android.content.SharedPreferences prefs=SessionPreferences.get(image.getContext());String owner=prefs.getString("user_id",""),choice=choiceKey(item,media,vertical),key=owner+":"+choice;
  String cached=saved(prefs,owner,choice);if(cached!=null){display(image,item,media,vertical,cached);return;}
  image.setTag(new Object());
  List<Target> waiting=PENDING.get(key);if(waiting!=null){waiting.add(new Target(image,fallback));return;}
  waiting=new ArrayList<>();waiting.add(new Target(image,fallback));PENDING.put(key,waiting);
  AccountRepository.Callback complete=(rows,error)->{
   List<Target> targets=PENDING.remove(key);if(!owner.equals(prefs.getString("user_id","")))return;
   String source="";if(error==null&&rows!=null){source=MobileCoverPolicy.artwork(rows,item.optString("nome"),item.optString("ano"),media,vertical);remember(prefs,owner,choice,source);remember(prefs,owner,choiceKey(item,media,!vertical),MobileCoverPolicy.artwork(rows,item.optString("nome"),item.optString("ano"),media,!vertical));}
   if(targets!=null)for(Target target:targets){ImageView view=target.view.get();if(view!=null&&view.getTag()==target.ticket)display(view,item,media,vertical,source);}
  };
  AccountRepository repo=new AccountRepository(image.getContext());if(media)repo.searchMedia(item.optString("nome"),LibraryCategory.classify(item.optString("tipo")).equals("filme")?0:1,complete);else repo.searchGames(item.optString("nome"),complete);
 }
}

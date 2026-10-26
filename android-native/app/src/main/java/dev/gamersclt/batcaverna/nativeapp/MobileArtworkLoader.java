package dev.gamersclt.batcaverna.nativeapp;
import android.widget.ImageView;
import android.util.LruCache;
import org.json.JSONObject;
import java.lang.ref.WeakReference;
import java.util.*;
/** Public catalogue art is selected locally; never writes the shared library cover. */
final class MobileArtworkLoader {
 private static final class Target {final WeakReference<ImageView> view;final String fallback;Target(ImageView image,String source){view=new WeakReference<>(image);fallback=source;}}
 private static final LruCache<String,String> CACHE=new LruCache<>(128);
 private static final Map<String,List<Target>> PENDING=new HashMap<>();
 private static void steamFallback(ImageView image,JSONObject item){
  String key="steam:"+SteamMetadataPolicy.key(item.optString("nome"));String cached=CACHE.get(key);
  if(cached!=null){if(!cached.isEmpty())AccountImageLoader.loadArtwork(image,cached,item.optString("capa"));return;}
  List<Target> waiting=PENDING.get(key);if(waiting!=null){waiting.add(new Target(image,item.optString("capa")));return;}
  waiting=new ArrayList<>();waiting.add(new Target(image,item.optString("capa")));PENDING.put(key,waiting);
  new AccountRepository(image.getContext()).steamMetadata(item,(rows,error)->{List<Target> targets=PENDING.remove(key);if(error!=null||rows==null)return;JSONObject game=rows.optJSONObject(0);String source=game==null?"":game.optString("capa");if(!CoverPolicy.publicUrl(source))source="";CACHE.put(key,source);if(targets!=null&&!source.isEmpty())for(Target target:targets){ImageView view=target.view.get();if(view!=null&&view.isAttachedToWindow())AccountImageLoader.loadArtwork(view,source,target.fallback);}});
 }
 static void load(ImageView image,JSONObject item,boolean media,boolean vertical){
  String fallback=item.optString("capa"),appid=item.optString("steam_appid");
  if(fallback.startsWith(BuildConfig.SUPABASE_URL+"/storage/")){AccountImageLoader.load(image,fallback);return;}
  AccountImageLoader.loadMobile(image,fallback,media?"":appid,vertical);
  String key=media+":"+item.optString("tipo")+":"+item.optString("nome")+":"+item.optString("ano")+":"+vertical;
  String cached=CACHE.get(key);if(cached!=null){if(!cached.isEmpty())AccountImageLoader.loadArtwork(image,cached,fallback);else if(!media)steamFallback(image,item);return;}
  List<Target> waiting=PENDING.get(key);if(waiting!=null){waiting.add(new Target(image,fallback));return;}
  waiting=new ArrayList<>();waiting.add(new Target(image,fallback));PENDING.put(key,waiting);
  AccountRepository.Callback complete=(rows,error)->{
   List<Target> targets=PENDING.remove(key);if(error!=null||rows==null){if(!media&&targets!=null)for(Target target:targets){ImageView view=target.view.get();if(view!=null&&view.isAttachedToWindow())steamFallback(view,item);}return;}
   String source=MobileCoverPolicy.artwork(rows,item.optString("nome"),item.optString("ano"),media,vertical);CACHE.put(key,source);String otherKey=media+":"+item.optString("tipo")+":"+item.optString("nome")+":"+item.optString("ano")+":"+(!vertical);CACHE.put(otherKey,MobileCoverPolicy.artwork(rows,item.optString("nome"),item.optString("ano"),media,!vertical));
   if(source.isEmpty()&&!media&&targets!=null)for(Target target:targets){ImageView view=target.view.get();if(view!=null&&view.isAttachedToWindow())steamFallback(view,item);}
   if(!source.isEmpty()&&targets!=null)for(Target target:targets){ImageView view=target.view.get();if(view!=null&&view.isAttachedToWindow())AccountImageLoader.loadArtwork(view,source,target.fallback);}
  };
  AccountRepository repo=new AccountRepository(image.getContext());if(media)repo.searchMedia(item.optString("nome"),LibraryCategory.classify(item.optString("tipo")).equals("filme")?0:1,complete);else repo.searchGames(item.optString("nome"),complete);
 }
}

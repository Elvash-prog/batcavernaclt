package dev.gamersclt.batcaverna.nativeapp;
import android.graphics.*;
import android.os.*;
import android.widget.ImageView;
import android.util.LruCache;
import java.net.*;
import java.io.*;
import java.lang.ref.WeakReference;
import java.util.concurrent.*;
/** Bounded memory and public IGDB disk images. Every public redirect is revalidated. */
final class AccountImageLoader {
 private static final ExecutorService IO=Executors.newFixedThreadPool(3);
 private static final Handler MAIN=new Handler(Looper.getMainLooper());
 private static final LruCache<String,Bitmap> CACHE=new LruCache<String,Bitmap>((int)Math.min(16*1024*1024,Runtime.getRuntime().maxMemory()/16)){protected int sizeOf(String k,Bitmap b){return b.getByteCount();}};
 static void clear(){CACHE.evictAll();}
 static void load(ImageView view,String source){load(view,source,"");}
 static void load(ImageView view,String source,String appid){
  Object oldTicket=view.getTag();Object ticket=new Object();view.setTag(ticket);if(oldTicket!=null)view.setImageResource(R.drawable.app_logo);String[] candidates=CoverPolicy.candidates(AccountMediaSource.normalize(source,BuildConfig.SUPABASE_URL),appid);if(candidates.length==0)return;
  android.content.Context context=view.getContext().getApplicationContext();android.content.SharedPreferences prefs=SessionPreferences.get(context);
  String owner=prefs.getString("user_id","");String key=owner+":"+java.util.Arrays.toString(candidates);WeakReference<ImageView> target=new WeakReference<>(view);
  Bitmap hit=CACHE.get(key);if(hit!=null){view.setImageBitmap(hit);return;}
  IO.execute(()->{Bitmap bitmap=null;boolean privateResult=false;String usedToken="";
   for(String candidate:candidates){ImageView live=target.get();if(live==null||live.getTag()!=ticket||!owner.equals(prefs.getString("user_id","")))return;boolean storage=candidate.startsWith(BuildConfig.SUPABASE_URL+"/storage/");String token="";
    try{if(storage)token=AuthSession.token(context);if(!owner.equals(prefs.getString("user_id","")))return;for(int attempt=0;attempt<(storage?1:2);attempt++){try{bitmap=download(candidate,token,prefs.getLong("expires_at",0),context);break;}catch(IOException failure){bitmap=null;}}if(bitmap!=null){privateResult=storage;usedToken=token;break;}}catch(Exception ignored){}

   }
   Bitmap result=bitmap;boolean secure=privateResult;String requestToken=usedToken;if(result!=null)MAIN.post(()->{ImageView image=target.get();if(!ImageSessionPolicy.accepts(owner,prefs.getString("user_id",""),secure,requestToken,prefs.getString("access_token","")))return;CACHE.put(key,result);if(image!=null&&image.getTag()==ticket)image.setImageBitmap(result);});
  });
 }
 private static Bitmap download(String source,String token,long expiry,android.content.Context context)throws Exception{
  String original=source;Bitmap cached=PublicCoverDiskCache.get(context,source);if(cached!=null)return cached;
  URI uri=new URI(source);if(!"https".equals(uri.getScheme())||uri.getUserInfo()!=null||(uri.getPort()!=-1&&uri.getPort()!=443))return null;
  boolean publicBackground=new URI(BuildConfig.SUPABASE_URL).getHost().equals(uri.getHost())&&uri.getRawPath().startsWith("/storage/v1/object/public/login-backgrounds/")&&!uri.getRawPath().contains("..")&&!uri.getRawPath().toLowerCase(java.util.Locale.ROOT).contains("%2e");
  boolean storage=!publicBackground&&new URI(BuildConfig.SUPABASE_URL).getHost().equals(uri.getHost());
  if(storage){if(token.isEmpty()||expiry<=System.currentTimeMillis())return null;String path=uri.getRawPath();if(!path.startsWith("/storage/v1/object/public/avatars/")&&!path.startsWith("/storage/v1/object/authenticated/avatars/")&&!path.startsWith("/storage/v1/object/public/feed-media/")&&!path.startsWith("/storage/v1/object/authenticated/feed-media/")&&!path.startsWith("/storage/v1/object/public/chat-media/")&&!path.startsWith("/storage/v1/object/authenticated/chat-media/")&&!path.startsWith("/storage/v1/object/public/group-avatars/")&&!path.startsWith("/storage/v1/object/authenticated/group-avatars/")&&!path.startsWith("/storage/v1/object/public/group-chat-media/")&&!path.startsWith("/storage/v1/object/authenticated/group-chat-media/"))return null;if(path.contains("..")||path.toLowerCase(java.util.Locale.ROOT).contains("%2e"))return null;source=BuildConfig.SUPABASE_URL+path.replace("/object/public/","/object/authenticated/");}
  for(int hop=0;hop<4;hop++){if(!storage&&!publicBackground&&!CoverPolicy.publicUrl(source))return null;HttpURLConnection conn=(HttpURLConnection)new URL(source).openConnection();
   try{conn.setInstanceFollowRedirects(false);conn.setConnectTimeout(10000);conn.setReadTimeout(12000);conn.setRequestProperty("Accept","image/jpeg,image/png,image/webp,image/*;q=0.8");if(storage)conn.setRequestProperty("Authorization","Bearer "+token);int status=conn.getResponseCode();
    if(status==301||status==302||status==303||status==307||status==308){if(storage||publicBackground)return null;String location=conn.getHeaderField("Location");if(location==null)return null;source=new URI(source).resolve(location).toString();continue;}
    if(status!=200)return null;String mime=conn.getContentType();if(mime==null||!mime.toLowerCase(java.util.Locale.ROOT).startsWith("image/"))return null;
    File file=File.createTempFile("cover-",".tmp",context.getCacheDir());
    try{long size=0;try(InputStream in=conn.getInputStream();OutputStream out=new FileOutputStream(file)){byte[] chunk=new byte[8192];int n;while((n=in.read(chunk))!=-1){size+=n;if(size>12*1024*1024)return null;out.write(chunk,0,n);}}
     BitmapFactory.Options options=new BitmapFactory.Options();options.inJustDecodeBounds=true;BitmapFactory.decodeFile(file.getAbsolutePath(),options);if(options.outWidth<=0||options.outHeight<=0)return null;options.inJustDecodeBounds=false;options.inSampleSize=1;while(options.outWidth/options.inSampleSize>1024||options.outHeight/options.inSampleSize>1024)options.inSampleSize*=2;Bitmap result=BitmapFactory.decodeFile(file.getAbsolutePath(),options);if(result!=null&&original.equals(source))PublicCoverDiskCache.put(context,original,file);return result;
    }finally{file.delete();}

   }finally{conn.disconnect();}
  }return null;
 }
}

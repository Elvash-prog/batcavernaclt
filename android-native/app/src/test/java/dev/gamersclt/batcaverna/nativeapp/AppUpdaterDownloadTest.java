package dev.gamersclt.batcaverna.nativeapp;

import android.app.*;
import android.os.Looper;
import android.view.*;
import android.widget.*;
import java.io.File;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import okhttp3.*;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import org.robolectric.shadows.ShadowDialog;
import static org.junit.Assert.*;

@RunWith(RobolectricTestRunner.class) @Config(sdk={23,35},manifest=Config.NONE)
public class AppUpdaterDownloadTest {
 private TextView find(View v,String text) {
  if(v instanceof TextView&&((TextView)v).getText().toString().contains(text))return (TextView)v;
  if(v instanceof ViewGroup)for(int i=0;i<((ViewGroup)v).getChildCount();i++){
   TextView found=find(((ViewGroup)v).getChildAt(i),text);if(found!=null)return found;
  }
  return null;
 }
 private void waitFor(View v,String text)throws Exception {
  long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(8);
  while(System.nanoTime()<deadline){Shadows.shadowOf(Looper.getMainLooper()).idle();if(find(v,text)!=null)return;Thread.sleep(10);}
  fail("Missing updater state: "+text);
 }
 @Test public void failedChecksumCleansFilesOffersRetryAndSerializesDownloads()throws Exception {
  Activity a=Robolectric.buildActivity(Activity.class).setup().get();
  AtomicInteger calls=new AtomicInteger();CountDownLatch started=new CountDownLatch(1),release=new CountDownLatch(1);
  OkHttpClient http=new OkHttpClient.Builder().addInterceptor(chain->{
   calls.incrementAndGet();started.countDown();
   try{if(!release.await(5,TimeUnit.SECONDS))throw new java.io.IOException("test timeout");}
   catch(InterruptedException e){throw new java.io.IOException(e);}
   return new Response.Builder().request(chain.request()).protocol(Protocol.HTTP_1_1).code(200).message("OK")
    .body(ResponseBody.create("incomplete APK",MediaType.get("application/octet-stream"))).build();
  }).build();
  JSONObject m=new JSONObject().put("versionName","99.0.0").put("versionCode",99999)
   .put("url","https://github.com/Elvash-prog/batcavernaclt/releases/download/android-v99.0.0/BatCaverna-99.0.0.apk")
   .put("sha256",new String(new char[64]).replace('\0','0'));
  try{
   AppUpdater.download(a,m,http);assertTrue(started.await(5,TimeUnit.SECONDS));
   Dialog first=ShadowDialog.getLatestDialog();
   AppUpdater.download(a,m,http);assertSame(first,ShadowDialog.getLatestDialog());assertEquals(1,calls.get());
   release.countDown();View root=first.getWindow().getDecorView();waitFor(root,"Tentar novamente");
   assertNotNull(find(root,"Arquivo incompleto ou inválido"));
   assertFalse(new File(a.getCacheDir(),"updates/update.part").exists());
   assertFalse(new File(a.getCacheDir(),"updates/update.apk").exists());
   find(root,"Tentar novamente").performClick();
   Dialog retry=ShadowDialog.getLatestDialog();assertNotSame(first,retry);
   waitFor(retry.getWindow().getDecorView(),"Tentar novamente");assertEquals(2,calls.get());retry.dismiss();
  }finally{release.countDown();a.finish();}
 }
}

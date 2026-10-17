package dev.gamersclt.batcaverna.nativeapp;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.widget.*;
import androidx.core.content.FileProvider;
import org.json.*;
import okhttp3.*;
import java.io.*;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.concurrent.TimeUnit;

/** Public Android releases use android-v* tags and a SHA-256 protected manifest. */
final class AppUpdater {
 private static final String API="https://api.github.com/repos/Elvash-prog/batcavernaclt/releases?per_page=100";
 private static final OkHttpClient HTTP=new OkHttpClient.Builder().connectTimeout(20,TimeUnit.SECONDS).readTimeout(60,TimeUnit.SECONDS).build();
 private static final Handler UI=new Handler(Looper.getMainLooper());
 private static volatile boolean checking;
 static void automatic(Activity a){
  android.content.SharedPreferences p=SessionPreferences.get(a);
  if(!p.getBoolean("check_app_updates",true)||System.currentTimeMillis()-p.getLong("update_checked",0)<1800000L)return;
  check(a,true);
 }
 static void show(Activity a){
  NativeSheet s=new NativeSheet(a,"Atualizações");
  s.body.addView(NativeSheet.text(a,"Versão instalada • "+BuildConfig.VERSION_NAME,16,0xfff3eafa));
  Switch automatic=new Switch(a);automatic.setText("Verificar ao abrir o aplicativo");automatic.setTextColor(0xffdcd1e8);
  android.content.SharedPreferences p=SessionPreferences.get(a);automatic.setChecked(p.getBoolean("check_app_updates",true));
  automatic.setOnCheckedChangeListener((b,on)->p.edit().putBoolean("check_app_updates",on).apply());s.body.addView(automatic);
  Button b=button(a,"Verificar atualização");s.body.addView(b);b.setOnClickListener(v->{s.dialog.dismiss();check(a,false);});s.show();
 }
 private static Button button(Activity a,String text){Button b=new Button(a);b.setText(text);AppStyle.button(b,true);return b;}
 private static void post(Activity a,Runnable r){UI.post(()->{if(!a.isFinishing()&&!a.isDestroyed())r.run();});}
 private static JSONObject json(String url)throws Exception{try(Response r=HTTP.newCall(new Request.Builder().url(url).header("Accept","application/vnd.github+json").build()).execute()){if(!r.isSuccessful()||r.body()==null)throw new IOException("Não foi possível consultar as versões (HTTP "+r.code()+").");return new JSONObject(r.body().string());}}
 static void check(Activity a,boolean quiet){
  if(checking)return;checking=true;
  if(!quiet)Toast.makeText(a,"Verificando atualizações…",Toast.LENGTH_SHORT).show();
  new Thread(()->{try{
   JSONObject best=null;
   try(Response r=HTTP.newCall(new Request.Builder().url(API).build()).execute()){
    if(!r.isSuccessful()||r.body()==null)throw new IOException("Não foi possível consultar as atualizações. Tente novamente.");
    JSONArray releases=new JSONArray(r.body().string());
    for(int i=0;i<releases.length();i++){JSONObject release=releases.getJSONObject(i);if(release.optBoolean("draft")||release.optBoolean("prerelease")||!release.optString("tag_name").startsWith("android-v"))continue;
     JSONArray assets=release.optJSONArray("assets");if(assets==null)continue;
     for(int j=0;j<assets.length();j++){JSONObject asset=assets.getJSONObject(j);if(!asset.optString("name").equals("android-update.json"))continue;
      String manifestUrl=asset.getString("browser_download_url");UpdatePolicy.validateUrl(manifestUrl);JSONObject manifest=json(manifestUrl);
      if(manifest.getInt("versionCode")>BuildConfig.VERSION_CODE&&(best==null||manifest.getInt("versionCode")>best.getInt("versionCode"))){UpdatePolicy.validateUrl(manifest.getString("url"));if(!manifest.getString("sha256").matches("[a-fA-F0-9]{64}"))throw new IOException("Verificação da atualização ausente.");best=manifest;}
     }
    }
   }
   SessionPreferences.get(a).edit().putLong("update_checked",System.currentTimeMillis()).apply();JSONObject available=best;checking=false;post(a,()->{if(available!=null)offer(a,available);else if(!quiet)Toast.makeText(a,"Seu aplicativo está atualizado.",Toast.LENGTH_LONG).show();});
  }catch(Exception e){checking=false;post(a,()->{if(!quiet)Toast.makeText(a,"Não foi possível verificar atualizações. Confira a conexão e tente novamente.",Toast.LENGTH_LONG).show();});}},"app-update-check").start();
 }
 private static void offer(Activity a,JSONObject m){NativeSheet s=new NativeSheet(a,"Nova versão disponível");s.body.addView(NativeSheet.text(a,"BatCaverna "+m.optString("versionName"),22,0xfff3eafa));s.body.addView(NativeSheet.text(a,m.optString("notes","Melhorias e correções do aplicativo."),14,0xffb4a7c4));Button b=button(a,"Baixar e atualizar");s.body.addView(b);b.setOnClickListener(v->{s.dialog.dismiss();download(a,m);});s.show();}
 private static void download(Activity a,JSONObject m){
  NativeSheet s=new NativeSheet(a,"Baixando atualização");TextView status=NativeSheet.text(a,"Iniciando download…",14,0xfff3eafa);s.body.addView(status);ProgressBar progress=new ProgressBar(a,null,android.R.attr.progressBarStyleHorizontal);progress.setMax(100);s.body.addView(progress);s.show();s.busy(true);
  new Thread(()->{File target=new File(a.getCacheDir(),"updates/update.apk"),part=new File(a.getCacheDir(),"updates/update.part");try{
   target.getParentFile().mkdirs();target.delete();String url=m.getString("url");UpdatePolicy.validateUrl(url);
   try(Response r=HTTP.newCall(new Request.Builder().url(url).build()).execute()){
    if(!r.isSuccessful()||r.body()==null)throw new IOException("Falha no download. Tente novamente.");long total=r.body().contentLength(),count=0;int last=-1;MessageDigest digest=MessageDigest.getInstance("SHA-256");
    try(InputStream in=r.body().byteStream();OutputStream out=new FileOutputStream(part)){byte[] bytes=new byte[65536];int n;while((n=in.read(bytes))!=-1){count+=n;if(count>300L*1024*1024)throw new IOException("Arquivo de atualização muito grande.");out.write(bytes,0,n);digest.update(bytes,0,n);int percent=total>0?(int)(count*100/total):0;if(percent!=last){last=percent;int value=percent;post(a,()->{progress.setIndeterminate(total<=0);progress.setProgress(value);status.setText("Baixando atualização… "+value+"%");});}}}
    StringBuilder hash=new StringBuilder();for(byte value:digest.digest())hash.append(String.format(java.util.Locale.ROOT,"%02x",value&255));if(!hash.toString().equalsIgnoreCase(m.getString("sha256")))throw new IOException("Arquivo incompleto ou inválido. Baixe novamente.");
   }
   validatePackage(a,part,m.getInt("versionCode"));if(!part.renameTo(target))throw new IOException("Não foi possível preparar o arquivo.");
   post(a,()->{s.busy(false);status.setText("Download verificado. Confirme a instalação no Android.");Button install=button(a,"Instalar atualização");s.body.addView(install);install.setOnClickListener(v->install(a,target,status));install(a,target,status);});
  }catch(Exception e){part.delete();target.delete();post(a,()->{s.busy(false);status.setText(e.getMessage()==null?"Não foi possível baixar a atualização. Tente novamente.":e.getMessage());});}},"app-update-download").start();
 }
 @SuppressWarnings("deprecation") private static void validatePackage(Activity a,File file,int version)throws Exception{
  PackageManager pm=a.getPackageManager();int flags=Build.VERSION.SDK_INT>=28?PackageManager.GET_SIGNING_CERTIFICATES:PackageManager.GET_SIGNATURES;
  PackageInfo next=pm.getPackageArchiveInfo(file.getAbsolutePath(),flags),current=pm.getPackageInfo(a.getPackageName(),flags);
  if(next==null||!a.getPackageName().equals(next.packageName)||(Build.VERSION.SDK_INT>=28?next.getLongVersionCode():next.versionCode)!=version||version<=BuildConfig.VERSION_CODE)throw new IOException("Esta atualização não é compatível com o aplicativo instalado.");
  Signature[] oldKeys=Build.VERSION.SDK_INT>=28?current.signingInfo.getApkContentsSigners():current.signatures,newKeys=Build.VERSION.SDK_INT>=28?next.signingInfo.getApkContentsSigners():next.signatures;
  if(oldKeys==null||newKeys==null||oldKeys.length!=newKeys.length)throw new IOException("Assinatura incompatível. A instalação foi bloqueada.");
  for(Signature key:oldKeys)if(!Arrays.asList(newKeys).contains(key))throw new IOException("Assinatura incompatível. A instalação foi bloqueada.");
 }
 private static void install(Activity a,File file,TextView status){try{
  if(Build.VERSION.SDK_INT>=26&&!a.getPackageManager().canRequestPackageInstalls()){status.setText("Autorize a instalação nesta tela do Android e, ao voltar, toque em Instalar atualização.");a.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+a.getPackageName())));return;}
  Uri uri=FileProvider.getUriForFile(a,a.getPackageName()+".diagnostics",file);Intent intent=new Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);a.startActivity(intent);
 }catch(Exception e){status.setText("Não foi possível abrir o instalador do Android. Tente novamente.");}}
}

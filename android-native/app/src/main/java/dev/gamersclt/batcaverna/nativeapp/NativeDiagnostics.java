package dev.gamersclt.batcaverna.nativeapp;

import android.app.Activity;
import android.content.*;
import androidx.core.content.FileProvider;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;

final class NativeDiagnostics {
 private static final long LIMIT=512*1024;private static boolean installed;
 private static File file(Context c){File dir=new File(c.getFilesDir(),"diagnostics");dir.mkdirs();return new File(dir,"batcaverna.log");}
 static String clean(String value,int limit){if(value==null)return "";StringBuilder out=new StringBuilder();for(int i=0;i<value.length()&&out.length()<limit;i++){char ch=value.charAt(i);if(!Character.isISOControl(ch)||ch==' ')out.append(ch);}String[] words=out.toString().trim().split("\\s+");StringBuilder safe=new StringBuilder();for(int i=0;i<words.length;i++){if((words[i].contains("@")&&words[i].contains("."))||words[i].startsWith("eyJ")||words[i].length()>180)words[i]="[dado-protegido]";if(safe.length()>0)safe.append(' ');safe.append(words[i]);}return safe.toString();}
 static synchronized void log(Context c,String level,String stage,String message){try{File target=file(c);if(target.length()>=LIMIT){File old=new File(target.getParentFile(),"batcaverna.previous.log");old.delete();target.renameTo(old);}String time=new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX",Locale.ROOT).format(new Date());try(FileOutputStream out=new FileOutputStream(target,true)){String row=time+" ["+clean(level,16).toUpperCase(Locale.ROOT)+"] "+clean(stage,80)+" — "+clean(message,900)+"\n";out.write(row.getBytes(StandardCharsets.UTF_8));}}catch(Exception ignored){}}
 static synchronized void install(Context c){if(installed)return;installed=true;Thread.UncaughtExceptionHandler previous=Thread.getDefaultUncaughtExceptionHandler();Thread.setDefaultUncaughtExceptionHandler((thread,error)->{StringBuilder detail=new StringBuilder(error.getClass().getSimpleName());int count=0;for(StackTraceElement frame:error.getStackTrace())if(frame.getClassName().startsWith("dev.gamersclt")&&count++<12)detail.append(" | ").append(frame.getClassName()).append(':').append(frame.getLineNumber());log(c,"FATAL","UNCAUGHT",detail.toString());if(previous!=null)previous.uncaughtException(thread,error);});}
 static long size(Context c){return file(c).length();}
 static synchronized void clear(Context c){File target=file(c);new File(target.getParentFile(),"batcaverna.previous.log").delete();try{new FileOutputStream(target,false).close();}catch(IOException ignored){}log(c,"INFO","DIAGNOSTIC_CLEAR","Histórico limpo pelo usuário");}
 static void share(Activity activity){try{log(activity,"INFO","DIAGNOSTIC_EXPORT","Diagnóstico compartilhado pelo usuário");File dir=new File(activity.getCacheDir(),"diagnostics");dir.mkdirs();File report=new File(dir,"BatCaverna-Diagnostico.txt");String logs=read(file(activity));String header="BatCaverna Native "+BuildConfig.VERSION_NAME+"\nAndroid "+android.os.Build.VERSION.RELEASE+" • API "+android.os.Build.VERSION.SDK_INT+"\nGerado: "+new SimpleDateFormat("yyyy-MM-dd HH:mm:ss XXX",Locale.ROOT).format(new Date())+"\n\n";try(FileOutputStream out=new FileOutputStream(report,false)){out.write((header+logs).getBytes(StandardCharsets.UTF_8));}android.net.Uri uri=FileProvider.getUriForFile(activity,activity.getPackageName()+".diagnostics",report);Intent send=new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_STREAM,uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);activity.startActivity(Intent.createChooser(send,"Enviar diagnóstico da BatCaverna"));}catch(Exception e){android.widget.Toast.makeText(activity,"Não foi possível exportar o diagnóstico.",android.widget.Toast.LENGTH_LONG).show();}}
 private static String read(File source)throws IOException{if(!source.exists())return "Nenhum evento registrado.\n";try(FileInputStream in=new FileInputStream(source);ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buffer=new byte[4096];int n;while((n=in.read(buffer))!=-1&&out.size()<LIMIT)out.write(buffer,0,Math.min(n,(int)(LIMIT-out.size())));return new String(out.toByteArray(),StandardCharsets.UTF_8);}}
}

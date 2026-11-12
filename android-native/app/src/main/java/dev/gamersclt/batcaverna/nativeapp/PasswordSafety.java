package dev.gamersclt.batcaverna.nativeapp;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;

/** SHA-1 is only a range lookup fingerprint; Supabase retains password storage. */
final class PasswordSafety {
 static final String ENDPOINT="https://api.pwnedpasswords.com/range/";
 static final int MAX_BYTES=524288;
 static final String BLOCKED="Essa senha apareceu em vazamentos. Escolha outra senha.";
 static final String UNAVAILABLE="Não foi possível verificar a segurança da senha. Tente novamente em instantes.";
 static final class Failure extends IOException {Failure(String message){super(message);}}
 static String digest(String password)throws Exception{
  byte[] bytes=MessageDigest.getInstance("SHA-1").digest(password.getBytes(StandardCharsets.UTF_8));
  StringBuilder hex=new StringBuilder(40);for(byte b:bytes)hex.append(String.format(Locale.ROOT,"%02X",b&255));return hex.toString();
 }
 static boolean compromised(String body,String suffix)throws Failure{
  if(body.isEmpty()||body.length()>MAX_BYTES)throw new Failure(UNAVAILABLE);
  boolean found=false,real=false;
  String[] lines=body.split("\\n",-1);
  for(int i=0;i<lines.length;i++){
   String line=lines[i];if(i==lines.length-1&&i>0&&line.isEmpty())continue;
   if(line.endsWith("\r"))line=line.substring(0,line.length()-1);
   int colon=line.indexOf(':');if(colon!=35)throw new Failure(UNAVAILABLE);
   String hash=line.substring(0,colon),count=line.substring(colon+1);
   if(!hash.matches("[0-9a-fA-F]{35}")||!count.matches("[0-9]{1,20}"))throw new Failure(UNAVAILABLE);
   boolean positive=!count.matches("0+");real|=positive;found|=positive&&hash.equalsIgnoreCase(suffix);
  }
  if(!real)throw new Failure(UNAVAILABLE);return found;
 }
 static void check(String password)throws Failure {checkAt(password,ENDPOINT);}
 static void checkAt(String password,String endpoint)throws Failure {
  HttpURLConnection c=null;String hash;
  try{
   hash=digest(password);c=(HttpURLConnection)new URL(endpoint+hash.substring(0,5)).openConnection();
   c.setInstanceFollowRedirects(false);c.setUseCaches(false);c.setConnectTimeout(5000);c.setReadTimeout(5000);
   c.setRequestMethod("GET");c.setRequestProperty("User-Agent","BatCaverna-Security/1.0");c.setRequestProperty("Add-Padding","true");c.setRequestProperty("Accept","text/plain");
   if(c.getResponseCode()!=200||c.getContentLength()>MAX_BYTES)throw new Failure(UNAVAILABLE);
   long deadline=System.nanoTime()+10000000000L;
   try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){
    byte[] chunk=new byte[4096];int n;
    while((n=in.read(chunk))!=-1){if(out.size()+n>MAX_BYTES||System.nanoTime()>deadline)throw new Failure(UNAVAILABLE);out.write(chunk,0,n);}
    if(compromised(new String(out.toByteArray(),StandardCharsets.UTF_8),hash.substring(5)))throw new Failure(BLOCKED);
   }
  }catch(Failure e){throw e;}catch(Exception ignored){throw new Failure(UNAVAILABLE);}finally{if(c!=null)c.disconnect();}
 }
}

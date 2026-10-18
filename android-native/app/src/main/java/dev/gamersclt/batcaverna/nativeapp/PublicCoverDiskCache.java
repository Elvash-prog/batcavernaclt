package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.graphics.*;
import java.io.*;
import java.net.URI;
import java.security.MessageDigest;
import java.util.*;
/** Public IGDB covers only. Seven days, 32 MiB; no account media or credentials. */
final class PublicCoverDiskCache {
 private static final long TTL=7L*24*60*60*1000,LIMIT=32L*1024*1024;
 static boolean accepts(String source){try{URI u=new URI(source);return "https".equals(u.getScheme())&&"images.igdb.com".equals(u.getHost())&&u.getPort()==-1&&u.getUserInfo()==null&&u.getQuery()==null&&u.getFragment()==null&&u.getRawPath().matches("/igdb/image/upload/t_[A-Za-z0-9_]+/[A-Za-z0-9_-]+\\.(jpg|png|webp)");}catch(Exception e){return false;}}
 private static File file(Context context,String url)throws Exception{byte[] bytes=MessageDigest.getInstance("SHA-256").digest(url.getBytes("UTF-8"));StringBuilder name=new StringBuilder();for(byte b:bytes)name.append(String.format(Locale.ROOT,"%02x",b&255));return new File(new File(context.getCacheDir(),"igdb-covers-v1"),name+".img");}
 static synchronized Bitmap get(Context context,String url){if(!accepts(url))return null;try{File f=file(context,url);if(!f.exists())return null;if(System.currentTimeMillis()-f.lastModified()>=TTL||f.length()>12*1024*1024){f.delete();return null;}BitmapFactory.Options o=new BitmapFactory.Options();o.inJustDecodeBounds=true;BitmapFactory.decodeFile(f.getPath(),o);if(o.outWidth<=0||o.outHeight<=0){f.delete();return null;}o.inJustDecodeBounds=false;o.inSampleSize=1;while(o.outWidth/o.inSampleSize>1024||o.outHeight/o.inSampleSize>1024)o.inSampleSize*=2;Bitmap image=BitmapFactory.decodeFile(f.getPath(),o);if(image==null)f.delete();return image;}catch(Exception e){return null;}}
 static synchronized void put(Context context,String url,File input){if(!accepts(url)||input.length()>12*1024*1024)return;File temp=null;try{File target=file(context,url),dir=target.getParentFile();dir.mkdirs();temp=File.createTempFile("write-",".tmp",dir);try(InputStream in=new FileInputStream(input);OutputStream out=new FileOutputStream(temp)){byte[] bytes=new byte[8192];int n;while((n=in.read(bytes))!=-1)out.write(bytes,0,n);}if(target.exists())target.delete();if(!temp.renameTo(target))return;File[] files=dir.listFiles();if(files==null)return;Arrays.sort(files,Comparator.comparingLong(File::lastModified));long size=0;for(File f:files)size+=f.length();long now=System.currentTimeMillis();for(File f:files)if(size>LIMIT||now-f.lastModified()>=TTL){long length=f.length();if(f.delete())size-=length;}}catch(Exception ignored){}finally{if(temp!=null)temp.delete();}}
}

package dev.gamersclt.batcaverna.nativeapp;
import java.net.URI;
import java.util.*;
public final class CoverPolicy {
 /** Higher resolution of the same asset, followed by the saved URL. Never searches another artwork. */
 public static String[] qualityCandidates(String source){
  String original=source==null?"":source;LinkedHashSet<String> out=new LinkedHashSet<>();
  try{URI u=new URI(original);if(!"https".equals(u.getScheme())||u.getUserInfo()!=null||u.getPort()!=-1||u.getQuery()!=null||u.getFragment()!=null)return new String[]{original};String host=u.getHost(),path=u.getPath();
   if("s4.anilist.co".equals(host)&&path.matches("/file/anilistcdn/media/anime/cover/(small|medium)/[A-Za-z0-9_.-]+"))out.add(original.replaceFirst("/cover/(small|medium)/","/cover/large/"));
   if("images.igdb.com".equals(host)&&path.matches("/igdb/image/upload/t_(thumb|cover_small|cover_big|screenshot_med|screenshot_big|screenshot_huge)/[A-Za-z0-9_-]+\\.(jpg|png|webp)"))out.add(original.replaceFirst("/t_[^/]+/","/t_1080p/"));
   if("image.tmdb.org".equals(host)&&path.matches("/t/p/w(92|154|185|342|500|780)/[A-Za-z0-9_.-]+"))out.add(original.replaceFirst("/w[0-9]+/","/original/"));
   if(host!=null&&host.matches("(shared|cdn)\\.(akamai|cloudflare|fastly)\\.steamstatic\\.com")&&path.matches("/(store_item_assets/steam/apps|steam/apps)/[1-9][0-9]*(/[A-Za-z0-9_-]+)?/header\\.jpg"))out.add(original.replaceFirst("/header\\.jpg$","/header_2x.jpg"));
  }catch(Exception ignored){}out.add(original);return out.toArray(new String[0]);
 }
 public static int sampleSize(int width,int height){return sampleSize(width,height,2048);}
 public static int sampleSize(int width,int height,int edge){int sample=1;edge=Math.max(256,Math.min(2048,edge));while(width/sample>2048||height/sample>2048)sample*=2;while(width/(sample*2)>=edge||height/(sample*2)>=edge)sample*=2;return sample;}
 public static int decodeEdge(int width,int height){int wanted=Math.max(width,height);return wanted<=512?512:wanted<=1024?1024:2048;}
 public static boolean publicUrl(String source){try{URI u=new URI(source);return "https".equals(u.getScheme())&&u.getUserInfo()==null&&(u.getPort()==-1||u.getPort()==443)&&Arrays.asList("cdn2.steamgriddb.com","cdn.steamgriddb.com","cdn2.unrealengine.com","cdn1.epicgames.com","cdn2.epicgames.com","shared.akamai.steamstatic.com","shared.cloudflare.steamstatic.com","shared.fastly.steamstatic.com","cdn.cloudflare.steamstatic.com","cdn.akamai.steamstatic.com","cdn.fastly.steamstatic.com","steamcdn-a.akamaihd.net","avatars.steamstatic.com","avatars.akamai.steamstatic.com","image.tmdb.org","images.igdb.com","s4.anilist.co","media.retroachievements.org","retroachievements.org").contains(u.getHost().toLowerCase(Locale.ROOT));}catch(Exception e){return false;}}
 public static String[] candidates(String source,String appid){LinkedHashSet<String> out=new LinkedHashSet<>();if(source!=null&&!source.trim().isEmpty()&&!source.equals("null")){String clean=source.trim().replace(" ","%20");if(clean.startsWith("http://")&&publicUrl("https://"+clean.substring(7)))clean="https://"+clean.substring(7);out.add(clean);return out.toArray(new String[0]);}if(appid!=null&&appid.matches("[1-9][0-9]{0,9}")){out.add("https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/"+appid+"/library_600x900.jpg");out.add("https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/"+appid+"/library_600x900.jpg");out.add("https://cdn.cloudflare.steamstatic.com/steam/apps/"+appid+"/library_600x900.jpg");out.add("https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/"+appid+"/header.jpg");out.add("https://cdn.fastly.steamstatic.com/steam/apps/"+appid+"/header.jpg");out.add("https://cdn.akamai.steamstatic.com/steam/apps/"+appid+"/header.jpg");}return out.toArray(new String[0]);}
}

package dev.gamersclt.batcaverna.nativeapp;
import java.net.URI;
import java.util.LinkedHashSet;
final class SteamAchievementIcons {
 static String[] candidates(String preferred,String fallback){
  LinkedHashSet<String> result=new LinkedHashSet<>();
  for(String value:new String[]{preferred,fallback})for(String url:CoverPolicy.candidates(value,"")){
   if(!CoverPolicy.publicUrl(url))continue;
   result.add(url);
   try{URI uri=new URI(url);String path=uri.getRawPath();
    if(!uri.getHost().endsWith(".steamstatic.com")&&!uri.getHost().equals("steamcdn-a.akamaihd.net"))continue;
    if(!path.matches("/(steamcommunity/public|community_assets)/images/apps/[0-9]+/[a-fA-F0-9]+\\.(jpg|png)"))continue;
    for(String prefix:new String[]{"/community_assets/images/apps/","/steamcommunity/public/images/apps/"})for(String host:new String[]{"shared.akamai.steamstatic.com","cdn.akamai.steamstatic.com","shared.fastly.steamstatic.com"})result.add("https://"+host+path.replaceFirst("^/(steamcommunity/public|community_assets)/images/apps/",prefix));
   }catch(Exception ignored){}
  }
  return result.toArray(new String[0]);
 }
}

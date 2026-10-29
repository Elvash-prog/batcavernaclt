package dev.gamersclt.batcaverna.nativeapp;
import org.junit.Test;
import static org.junit.Assert.*;
import java.util.Arrays;
public class SteamAchievementIconsTest {
 @Test public void retriesSameIconOnOfficialPaths(){
  String source="https://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/4231820/abc123.jpg";
  String[] urls=SteamAchievementIcons.candidates(source,"");
  assertEquals(source,urls[0]);
  assertTrue(Arrays.asList(urls).contains("https://shared.akamai.steamstatic.com/community_assets/images/apps/4231820/abc123.jpg"));
 }
 @Test public void excludesUntrustedHosts(){assertEquals(0,SteamAchievementIcons.candidates("https://evil.test/a.jpg","").length);}
 @Test public void keepsFallback(){assertTrue(Arrays.asList(SteamAchievementIcons.candidates("","https://cdn.akamai.steamstatic.com/community_assets/images/apps/1/abc.jpg")).size()>1);}
}

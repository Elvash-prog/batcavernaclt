package dev.gamersclt.batcaverna.nativeapp;
public class UpdatePolicyTest {
 public static void main(String[] args){
  UpdatePolicy.validateUrl("https://github.com/Elvash-prog/batcavernaclt/releases/download/android-v1.7.5/BatCaverna-1.7.5.apk");
  String[] bad={"http://github.com/Elvash-prog/batcavernaclt/releases/download/android-v1/a.apk","https://github.com.evil.test/Elvash-prog/batcavernaclt/releases/download/android-v1/a.apk","https://github.com/other/repo/releases/download/android-v1/a.apk","https://github.com/Elvash-prog/batcavernaclt/releases/download/desktop-v1/a.apk","https://github.com/Elvash-prog/batcavernaclt/releases/download/android-v1/../a.apk","https://github.com/Elvash-prog/batcavernaclt/releases/download/android-v1/%2e%2e/a.apk","https://github.com:444/Elvash-prog/batcavernaclt/releases/download/android-v1/a.apk"};
  for(String url:bad){boolean rejected=false;try{UpdatePolicy.validateUrl(url);}catch(IllegalArgumentException e){rejected=true;}if(!rejected)throw new AssertionError(url);}
  System.out.println("UpdatePolicy: trusted release URL and 7 invalid sources checked");
 }
}

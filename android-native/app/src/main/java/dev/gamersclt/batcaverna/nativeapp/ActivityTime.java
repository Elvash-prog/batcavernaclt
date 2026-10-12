package dev.gamersclt.batcaverna.nativeapp;
final class ActivityTime {
 static String relative(long stamp,long now){long minutes=Math.max(0,now-stamp)/60000;if(stamp<=0)return "";if(minutes==0)return "agora";if(minutes<60)return minutes+" min";if(minutes<1440)return minutes/60+" h";return minutes/1440+" d";}
}

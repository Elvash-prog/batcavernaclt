package dev.gamersclt.batcaverna.nativeapp;
import java.util.*;
/** Weekly identifiers match the website catalog and retain existing rewards. */
public final class MissionPolicy {
 public static List<String> weekly(boolean v2){return Arrays.asList("add_game_3","media_3",v2?"add_game_2":"add_game_1");}
 public static String period(boolean week,Calendar source){Calendar c=(Calendar)source.clone();if(week)c.add(Calendar.DAY_OF_MONTH,-(c.get(Calendar.DAY_OF_WEEK)+5)%7);return (week?"semana:":"")+String.format(Locale.ROOT,"%04d-%02d-%02d",c.get(Calendar.YEAR),c.get(Calendar.MONTH)+1,c.get(Calendar.DAY_OF_MONTH));}
 public static int goal(String key){return key.endsWith("_3")?3:key.endsWith("_2")?2:1;}
 public static int xp(String key){int n=goal(key);return key.startsWith("add_game_")?(n==3?80:n==2?50:25):(n==3?70:n==2?50:25);}
}

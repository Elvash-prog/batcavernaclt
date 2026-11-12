package dev.gamersclt.batcaverna.nativeapp;
import java.util.ArrayDeque;
/** Keep below five presence calls in 30 seconds, with a slot reserved for hiding. */
final class PresenceSendPolicy {
 static final long WINDOW=30000,MIN_TRACK=10000,REFRESH=60000,RATE_COOLDOWN=60000;
 private final ArrayDeque<Long> sent=new ArrayDeque<>();
 private boolean tracked;private String key="";private long lastTrack=-1,lastSend=-1;
 String next(String semantic,boolean visible,long now){
  while(!sent.isEmpty()&&now-sent.peekFirst()>WINDOW)sent.removeFirst();
  if(!visible){if(!tracked)return "";tracked=false;sent.addLast(now);lastSend=now;return "untrack";}
  if(tracked&&key.equals(semantic)&&lastSend>=0&&now-lastSend<REFRESH)return "";
  if(sent.size()>=3||(lastTrack>=0&&now-lastTrack<MIN_TRACK))return "";
  tracked=true;key=semantic;lastTrack=lastSend=now;sent.addLast(now);return "track";
 }
 static boolean rateLimited(String message){String s=message.toLowerCase(java.util.Locale.ROOT);return s.contains("clientpresenceratelimitreached")||s.contains("client presence rate limit")||s.contains("too many presence messages");}
 static long retry(long previous,boolean limited){return limited?Math.max(previous,RATE_COOLDOWN):previous;}
}

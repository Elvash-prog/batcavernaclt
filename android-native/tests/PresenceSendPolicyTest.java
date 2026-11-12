package dev.gamersclt.batcaverna.nativeapp;
import java.util.*;
public final class PresenceSendPolicyTest {
 public static void main(String[] args){
  PresenceSendPolicy p=new PresenceSendPolicy();List<Long> idle=new ArrayList<>();
  for(long now=0;now<=180000;now+=5000)if(!p.next("online",true,now).isEmpty())idle.add(now);
  if(!idle.equals(Arrays.asList(0L,60000L,120000L,180000L)))throw new AssertionError(idle.toString());
  p=new PresenceSendPolicy();List<Long> events=new ArrayList<>();
  for(long now=0;now<=120000;now++)if(!p.next(Long.toString(now),now%2==0,now).isEmpty())events.add(now);
  for(long now:events){int count=0;for(long t:events)if(t>=now-PresenceSendPolicy.WINDOW&&t<=now)count++;if(count>4)throw new AssertionError("Presence quota exceeded");}
  p=new PresenceSendPolicy();if(!p.next("hidden",false,0).isEmpty())throw new AssertionError("Hidden startup must not publish");
  if(!"track".equals(p.next("old",true,0))||!p.next("new",true,1).isEmpty()||!"track".equals(p.next("latest",true,10000)))throw new AssertionError("Latest pending state lost");
  if(!"untrack".equals(p.next("hidden",false,10001))||!p.next("hidden",false,20000).isEmpty())throw new AssertionError("Repeated untrack");
  if(!p.next("latest",true,20001).isEmpty()||!"track".equals(p.next("latest",true,30001)))throw new AssertionError("Reserved hide slot lost");
  if(!PresenceSendPolicy.rateLimited("ClientPresenceRateLimitReached")||!PresenceSendPolicy.rateLimited("Client presence rate limit exceeded")||PresenceSendPolicy.rateLimited("Subscribed to PostgreSQL"))throw new AssertionError("Rate error classification");
  if(PresenceSendPolicy.retry(2000,true)!=60000)throw new AssertionError("Rate cooldown missing");
  System.out.println("Presence publisher: idle refresh, rolling quota, latest state, invisibility and rate cooldown passed");
 }
}

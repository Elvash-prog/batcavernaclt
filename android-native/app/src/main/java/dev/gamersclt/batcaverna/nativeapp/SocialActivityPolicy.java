package dev.gamersclt.batcaverna.nativeapp;
public final class SocialActivityPolicy {
 public static boolean recent(long event,long friendship,long now){return event>0&&friendship>0&&event>friendship&&event>=now-7*86400000L&&event<=now+60000;}
}

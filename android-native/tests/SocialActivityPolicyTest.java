package dev.gamersclt.batcaverna.nativeapp;
public final class SocialActivityPolicyTest {
 public static void main(String[] args){long now=2000000000000L,start=now-100000;long[][] cases={{start-1,start,0},{start,start,0},{start+1,start,1},{0,start,0},{now,0,0},{now+60001,start,0},{now+60000,start,1},{now-7*86400000L,now-8*86400000L,1},{now-7*86400000L-1,now-8*86400000L,0}};for(long[] c:cases)if(SocialActivityPolicy.recent(c[0],c[1],now)!=(c[2]==1))throw new AssertionError("Atividade fora do período");System.out.println("SocialActivityPolicy: "+cases.length+" checks");}
}

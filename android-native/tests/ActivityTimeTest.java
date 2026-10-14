package dev.gamersclt.batcaverna.nativeapp;
public final class ActivityTimeTest {
 public static void main(String[] args){long now=2000000000000L;long[] deltas={0,59999,60000,3599999,3600000,86399999,86400000,-1000};String[] labels={"agora","agora","1 min","59 min","1 h","23 h","1 d","agora"};for(int i=0;i<deltas.length;i++)if(!labels[i].equals(ActivityTime.relative(now-deltas[i],now)))throw new AssertionError("Boundary "+i);if(!"".equals(ActivityTime.relative(0,now)))throw new AssertionError("Missing stamp");System.out.println("ActivityTime: 9 checks");}
}

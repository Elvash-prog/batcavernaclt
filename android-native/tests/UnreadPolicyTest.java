package dev.gamersclt.batcaverna.nativeapp;
public final class UnreadPolicyTest {
 public static void main(String[] args){long[][] cases={{0,0,1,0},{10,10,1,0},{9,10,1,0},{11,10,1,1},{11,10,0,0},{1,0,1,1}};for(long[] x:cases)if(UnreadPolicy.advance(x[0],x[1],x[2]==1)!=(x[3]==1))throw new AssertionError("Read boundary");int[] counts={-1,0,1,99,100};String[] values={"","","1","99","99+"};for(int i=0;i<counts.length;i++)if(!values[i].equals(UnreadPolicy.badge(counts[i])))throw new AssertionError("Badge boundary");System.out.println("UnreadPolicy: 11 checks");}
}

package dev.gamersclt.batcaverna.nativeapp;
final class UnreadPolicy {
 static boolean advance(long shown,long marked,boolean visible){return visible&&shown>0&&shown>marked;}
 static String badge(int count){return count<=0?"":count>99?"99+":String.valueOf(count);}
}

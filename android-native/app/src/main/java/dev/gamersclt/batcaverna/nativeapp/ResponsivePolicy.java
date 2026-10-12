package dev.gamersclt.batcaverna.nativeapp;
public final class ResponsivePolicy {
 public static int columns(float availableDp,float fontScale){float scale=Math.max(1,Math.min(3,fontScale));return Math.max(1,Math.min(4,(int)((availableDp+10)/(146*scale+10))));}
 public static int controlHeight(float fontScale){return Math.max(50,Math.round(28+22*Math.max(1,fontScale)));}
 public static int navHeight(float fontScale){return Math.max(52,Math.round(36+16*Math.max(1,fontScale)));}
}

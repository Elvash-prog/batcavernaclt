package dev.gamersclt.batcaverna.nativeapp;

import android.content.Context;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;

final class NativeTheme {
 static final String[] KEYS={"caverna","oceano","esmeralda","rubi","ambar","aurora"};
 static final String[] LABELS={"Caverna","Oceano","Esmeralda","Rubi","Âmbar","Aurora"};
 private static final int[][] COLORS={
  {0xff9869f4,0xff6e44c8,0xff181225,0xff0d1019,0xff2c263c},
  {0xff39bff5,0xff2379c9,0xff071923,0xff09111b,0xff17313e},
  {0xff39d39a,0xff238b68,0xff071912,0xff0b1411,0xff193228},
  {0xfff06488,0xffa93b5d,0xff1c0b13,0xff110b10,0xff361d27},
  {0xfff2b84b,0xffb07825,0xff1b1408,0xff100e0a,0xff382c19},
  {0xffd66cf1,0xff715de5,0xff170d20,0xff0d0c18,0xff30203d}
 };
 private NativeTheme(){}
 static int index(Context c){String key=SessionPreferences.get(c).getString("native_theme","caverna");for(int i=0;i<KEYS.length;i++)if(KEYS[i].equals(key))return i;return 0;}
 static void select(Context c,int index){int safe=Math.max(0,Math.min(KEYS.length-1,index));SessionPreferences.get(c).edit().putString("native_theme",KEYS[safe]).apply();}
 static int accent(Context c){return COLORS[index(c)][0];}
 static int accentDark(Context c){return COLORS[index(c)][1];}
 static int backgroundStart(Context c){return COLORS[index(c)][2];}
 static int backgroundEnd(Context c){return COLORS[index(c)][3];}
 static int panel(Context c){return COLORS[index(c)][4];}
 static int panelDark(Context c){return blend(panel(c),Color.BLACK,.24f);}
 static int soft(Context c){return blend(panel(c),accent(c),.18f);}
 static GradientDrawable background(Context c){return new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{backgroundStart(c),backgroundEnd(c)});}
 static int blend(int from,int to,float amount){float a=Math.max(0,Math.min(1,amount));return Color.rgb(Math.round(Color.red(from)*(1-a)+Color.red(to)*a),Math.round(Color.green(from)*(1-a)+Color.green(to)*a),Math.round(Color.blue(from)*(1-a)+Color.blue(to)*a));}
}

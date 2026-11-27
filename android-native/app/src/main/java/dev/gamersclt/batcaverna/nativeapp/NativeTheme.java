package dev.gamersclt.batcaverna.nativeapp;

import android.content.Context;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;

final class NativeTheme {
 static final String[] KEYS={"caverna","oceano","esmeralda","rubi","ambar","aurora","claro","meia-noite","grafite","sakura","lavanda","neon","floresta","vulcao","gelo","cafe","vinho","oliva","cobalto","perola","menta"};
 static final String[] LABELS={"Caverna","Oceano","Esmeralda","Rubi","Âmbar","Aurora","Claro","Meia-noite","Grafite","Sakura","Lavanda","Neon","Floresta","Vulcão","Gelo","Café","Vinho","Oliva","Cobalto","Pérola","Menta"};
 private static final int[][] COLORS={
  {0xff9869f4,0xff6e44c8,0xff181225,0xff0d1019,0xff2c263c},
  {0xff39bff5,0xff2379c9,0xff071923,0xff09111b,0xff17313e},
  {0xff39d39a,0xff238b68,0xff071912,0xff0b1411,0xff193228},
  {0xfff06488,0xffa93b5d,0xff1c0b13,0xff110b10,0xff361d27},
  {0xfff2b84b,0xffb07825,0xff1b1408,0xff100e0a,0xff382c19},
  {0xffd66cf1,0xff715de5,0xff170d20,0xff0d0c18,0xff30203d},
  {0xff7142c6,0xff59309e,0xfffaf9ff,0xfff6f5fc,0xffffffff},
  {0xffa98cff,0xff7560d4,0xff08090f,0xff030408,0xff171821},
  {0xffa8c6e8,0xff647c9e,0xff1c2026,0xff12161b,0xff2b313a},
  {0xffa92f65,0xff84244f,0xfffff8fb,0xfffff2f7,0xffffffff},
  {0xff6444b5,0xff4d3193,0xfffaf8ff,0xfff2edff,0xffffffff},
  {0xff22d3ee,0xff0e8fa6,0xff07070f,0xff050510,0xff141428},
  {0xff84cc16,0xff4d7c0f,0xff0b130b,0xff070d07,0xff172417},
  {0xfff97316,0xffc2410c,0xff160a07,0xff0d0605,0xff2a1510},
  {0xff93c5fd,0xff4f86c6,0xff0a1320,0xff060c15,0xff142335},
  {0xffd4a373,0xff9c6b3f,0xff15100c,0xff0c0907,0xff261d17},
  {0xffe0607e,0xff9f2f4c,0xff1a0a10,0xff0f0609,0xff2d1520},
  {0xffb5c46a,0xff7c8a38,0xff12140b,0xff0b0c07,0xff22261a},
  {0xff6c8cff,0xff3f5fd6,0xff080c1c,0xff050713,0xff141b33},
  {0xff7a4a1c,0xff5e3815,0xfffbf8f3,0xfff4efe6,0xffffffff},
  {0xff0f766e,0xff0b5a54,0xfff4fbf9,0xffe9f6f2,0xffffffff}
 };
 private static final java.util.Set<String> LIGHT=new java.util.HashSet<>(java.util.Arrays.asList("claro","sakura","lavanda","perola","menta"));
 private NativeTheme(){}
 static int index(Context c){String key=SessionPreferences.get(c).getString("native_theme","caverna");for(int i=0;i<KEYS.length;i++)if(KEYS[i].equals(key))return i;return 0;}
 static void select(Context c,int index){int safe=Math.max(0,Math.min(KEYS.length-1,index));SessionPreferences.get(c).edit().putString("native_theme",KEYS[safe]).apply();}
 static int accent(Context c){return COLORS[index(c)][0];}
 static int accentDark(Context c){return COLORS[index(c)][1];}
 static int backgroundStart(Context c){return COLORS[index(c)][2];}
 static int backgroundEnd(Context c){return COLORS[index(c)][3];}
 static int panel(Context c){return COLORS[index(c)][4];}
 static boolean light(Context c){return light(index(c));}
 static boolean light(int i){return LIGHT.contains(KEYS[Math.max(0,Math.min(KEYS.length-1,i))]);}
 static int[] colors(int i){return COLORS[Math.max(0,Math.min(COLORS.length-1,i))].clone();}
 static int panelDark(Context c){return light(c)?blend(panel(c),backgroundEnd(c),.55f):blend(panel(c),Color.BLACK,.24f);}
 static int soft(Context c){return blend(panel(c),accent(c),light(c)?.09f:.18f);}
 static int text(Context c){return light(c)?0xff242033:0xfff3effa;}
 static int muted(Context c){return light(c)?0xff62596f:0xffb2a9c1;}
 static int border(Context c){return light(c)?0xffded9e8:blend(panel(c),0xffd9d2eb,.16f);}
 static int onAccent(Context c){return light(c)?Color.WHITE:0xff10121c;}
 /** Adapt legacy surface/text tokens while the dark palettes keep their original colors. */
 static int surfaceColor(Context c,int color){float[] hsv=new float[3];Color.colorToHSV(color,hsv);if(!light(c)||Color.alpha(color)<128||hsv[2]>.42f)return color;return (color&0xff000000)|(panel(c)&0xffffff);}
 static int textColor(Context c,int color){
  if(!light(c)||Color.alpha(color)==0)return color;
  float[] hsv=new float[3];Color.colorToHSV(color,hsv);
  if(hsv[1]<.22f)return luminance(color)>.7?text(c):muted(c);
  int alpha=Color.alpha(color),result=color;for(int i=0;i<12&&contrast(result,panel(c))<4.5;i++)result=blend(result,Color.BLACK,.12f);
  return (alpha<<24)|(result&0xffffff);
 }
 static double contrast(int a,int b){double x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
 private static double luminance(int color){return .2126*channel(Color.red(color))+.7152*channel(Color.green(color))+.0722*channel(Color.blue(color));}
 private static double channel(int value){double v=value/255.;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);}
 static GradientDrawable imageShade(Context c){int base=light(c)?panel(c):0xff10141c;return new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,new int[]{base&0xffffff,(base&0xffffff)|0xee000000});}
 static GradientDrawable background(Context c){return new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{backgroundStart(c),backgroundEnd(c)});}
 static int blend(int from,int to,float amount){float a=Math.max(0,Math.min(1,amount));return Color.rgb(Math.round(Color.red(from)*(1-a)+Color.red(to)*a),Math.round(Color.green(from)*(1-a)+Color.green(to)*a),Math.round(Color.blue(from)*(1-a)+Color.blue(to)*a));}
}

package dev.gamersclt.batcaverna.nativeapp;
import android.graphics.drawable.*;
import android.content.res.ColorStateList;
import android.view.View;
import android.widget.*;
/** Shared Caverna surfaces, spacing and controls for the mobile applications. */
final class AppStyle {
 static int dp(View v,int n){return Math.round(n*v.getResources().getDisplayMetrics().density);}
 static GradientDrawable shape(View v,int color,int radius){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(v,radius));return d;}
 static GradientDrawable surface(View v,int color,int radius){
  GradientDrawable d=shape(v,color,radius);
  d.setStroke(dp(v,1),NativeTheme.blend(color,0xffd9d2eb,.10f));return d;
 }
 static RippleDrawable interactive(View v,int color,int radius){
  return new RippleDrawable(ColorStateList.valueOf(0x26ffffff),surface(v,color,radius),shape(v,0xffffffff,radius));
 }
 static void button(Button b,boolean primary){
  b.setAllCaps(false);b.setTextSize(15);b.setBackgroundTintList(null);b.setMinWidth(0);b.setMinimumWidth(0);
  b.setMinHeight(dp(b,Math.max(48,ResponsivePolicy.controlHeight(b.getResources().getConfiguration().fontScale))));
  b.setPadding(dp(b,16),dp(b,12),dp(b,16),dp(b,12));b.setTypeface(android.graphics.Typeface.create("sans-serif-medium",android.graphics.Typeface.NORMAL));b.setElevation(0);
  int accent=NativeTheme.accent(b.getContext()),panel=NativeTheme.panel(b.getContext());
  StateListDrawable surfaces=new StateListDrawable();surfaces.addState(new int[]{-android.R.attr.state_enabled},shape(b,NativeTheme.blend(panel,accent,primary?.22f:0f),16));surfaces.addState(new int[]{},surface(b,primary?accent:NativeTheme.panelDark(b.getContext()),16));
  b.setTextColor(new ColorStateList(new int[][]{new int[]{-android.R.attr.state_enabled},new int[]{}},new int[]{0xffa49cae,primary?0xff10121c:0xfff4f2ff}));
  b.setBackground(new RippleDrawable(ColorStateList.valueOf(0x33000000|(accent&0x00ffffff)),surfaces,null));
  LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.setMargins(0,dp(b,8),0,dp(b,4));if(b.getLayoutParams()==null)b.setLayoutParams(p);
 }
 static void icon(Button button,int kind,int color){ActionIcon icon=new ActionIcon(kind,color);icon.setBounds(0,0,dp(button,20),dp(button,20));button.setCompoundDrawablePadding(dp(button,8));button.setCompoundDrawables(icon,null,null,null);}
 static void input(EditText e){
  e.setTextSize(16);e.setTextColor(0xfff3effa);e.setHintTextColor(0xffb2a9c1);
  e.setBackgroundTintList(null);e.setPadding(dp(e,16),dp(e,14),dp(e,16),dp(e,14));e.setMinHeight(dp(e,52));
  int panel=NativeTheme.panelDark(e.getContext());
  GradientDrawable focused=surface(e,panel,16);focused.setStroke(dp(e,2),NativeTheme.accent(e.getContext()));
  StateListDrawable states=new StateListDrawable();states.addState(new int[]{android.R.attr.state_focused},focused);states.addState(new int[]{},surface(e,panel,16));e.setBackground(states);
 }
}

package dev.gamersclt.batcaverna.nativeapp;
import android.graphics.drawable.*;
import android.content.res.ColorStateList;
import android.view.View;
import android.widget.*;
final class AppStyle {
 static int dp(View v,int n){return Math.round(n*v.getResources().getDisplayMetrics().density);}
 static GradientDrawable shape(View v,int color,int radius){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(v,radius));if((color>>>24)==255)d.setStroke(dp(v,1),0xff383047);return d;}
 static void button(Button b,boolean primary){b.setAllCaps(false);b.setTextSize(14);b.setTextColor(0xfff4f2ff);b.setMinWidth(0);b.setMinimumWidth(0);b.setMinHeight(dp(b,ResponsivePolicy.controlHeight(b.getResources().getConfiguration().fontScale)));b.setPadding(dp(b,16),dp(b,10),dp(b,16),dp(b,10));int accent=NativeTheme.accent(b.getContext()),accentDark=NativeTheme.accentDark(b.getContext()),panel=NativeTheme.panel(b.getContext()),panelDark=NativeTheme.panelDark(b.getContext());GradientDrawable gradient=new GradientDrawable(GradientDrawable.Orientation.TL_BR,primary?new int[]{accent,accentDark}:new int[]{panel,panelDark});gradient.setCornerRadius(dp(b,14));gradient.setStroke(dp(b,1),primary?NativeTheme.blend(accent,0xffffffff,.22f):NativeTheme.blend(panel,0xffffffff,.12f));b.setTypeface(null,android.graphics.Typeface.BOLD);b.setBackground(new RippleDrawable(ColorStateList.valueOf(0x33000000|(accent&0x00ffffff)),gradient,null));LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.setMargins(0,dp(b,8),0,dp(b,4));if(b.getLayoutParams()==null)b.setLayoutParams(p);}
 static void icon(Button button,int kind,int color){ActionIcon icon=new ActionIcon(kind,color);icon.setBounds(0,0,dp(button,20),dp(button,20));button.setCompoundDrawablePadding(dp(button,8));button.setCompoundDrawables(icon,null,null,null);}
 static void input(EditText e){e.setTextColor(0xfff3f4f8);e.setHintTextColor(0xff929caf);e.setPadding(dp(e,16),dp(e,12),dp(e,16),dp(e,12));e.setBackground(shape(e,NativeTheme.panelDark(e.getContext()),14));}
}

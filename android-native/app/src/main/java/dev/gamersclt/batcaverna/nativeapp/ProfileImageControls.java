package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.view.Gravity;
import android.widget.*;
/** Compact, accessible alternatives to drag and pinch; no sliders. */
final class ProfileImageControls {
 static LinearLayout add(Context c,LinearLayout body,ProfileCoverView preview){
  TextView hint=NativeSheet.text(c,"Arraste para enquadrar • use dois dedos para ampliar",12,0xffaaa3b8);body.addView(hint);
  LinearLayout controls=new LinearLayout(c);controls.setGravity(Gravity.CENTER_VERTICAL);body.addView(controls);Button minus=new Button(c),plus=new Button(c),reset=new Button(c);TextView value=NativeSheet.text(c,"100%",12,0xffc5bdd3);value.setGravity(Gravity.CENTER);minus.setText("−");plus.setText("+");reset.setText("Centralizar");minus.setContentDescription("Diminuir zoom");plus.setContentDescription("Aumentar zoom");for(Button button:new Button[]{minus,plus,reset}){AppStyle.button(button,false);button.setMinWidth(0);button.setTextSize(button==reset?12:20);button.setPadding(NativeSheet.dp(c,10),0,NativeSheet.dp(c,10),0);}
  controls.addView(minus,new LinearLayout.LayoutParams(NativeSheet.dp(c,48),NativeSheet.dp(c,48)));controls.addView(value,new LinearLayout.LayoutParams(NativeSheet.dp(c,56),-2));controls.addView(plus,new LinearLayout.LayoutParams(NativeSheet.dp(c,48),NativeSheet.dp(c,48)));LinearLayout.LayoutParams rp=new LinearLayout.LayoutParams(-2,NativeSheet.dp(c,48));rp.setMargins(NativeSheet.dp(c,14),0,0,0);controls.addView(reset,rp);
  Runnable paint=()->{value.setText(Math.round(preview.crop.zoom)+"%");minus.setEnabled(preview.ready()&&preview.isEnabled()&&preview.crop.zoom>100);plus.setEnabled(preview.ready()&&preview.isEnabled()&&preview.crop.zoom<250);reset.setEnabled(preview.ready()&&preview.isEnabled());};preview.interactive(paint);preview.addOnLayoutChangeListener((v,l,t,r,b,ol,ot,or,ob)->paint.run());minus.setOnClickListener(v->preview.zoomBy(-10));plus.setOnClickListener(v->preview.zoomBy(10));reset.setOnClickListener(v->preview.position(50,50,100));paint.run();return controls;
 }
 static void enabled(android.view.View view,boolean active){view.setEnabled(active);if(view instanceof android.view.ViewGroup){android.view.ViewGroup group=(android.view.ViewGroup)view;for(int i=0;i<group.getChildCount();i++)enabled(group.getChildAt(i),active);}}
}

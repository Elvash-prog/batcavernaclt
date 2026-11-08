package dev.gamersclt.batcaverna.nativeapp;
import android.view.View;
/** Original short feedback; follows the device's animation preference. */
final class NativeMotion {
 private NativeMotion(){}
 static boolean enabled(View view){
  if(android.os.Build.VERSION.SDK_INT>=26)return android.animation.ValueAnimator.areAnimatorsEnabled();
  try{return android.provider.Settings.Global.getFloat(view.getContext().getContentResolver(),android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,1f)>0;}catch(SecurityException ignored){return false;}
 }
 static void select(View view){
  view.animate().cancel();view.setScaleX(1);view.setScaleY(1);
  if(!enabled(view))return;
  view.setScaleX(.9f);view.setScaleY(.9f);
  view.animate().scaleX(1).scaleY(1).setDuration(180).setInterpolator(new android.view.animation.DecelerateInterpolator()).start();
 }
 static void favorite(View root,String id){if(id.isEmpty())return;root.post(()->{View card=root.findViewWithTag(id);if(card!=null)select(card);});}
}

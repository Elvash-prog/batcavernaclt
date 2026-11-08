package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.content.res.ColorStateList;
import android.graphics.drawable.*;
import android.widget.LinearLayout;
/** Press feedback uses the normal View gesture handling, including scroll cancellation. */
final class LibraryCard extends LinearLayout {
 LibraryCard(Context c){super(c);setOrientation(VERTICAL);setFocusable(true);
  int panel=NativeTheme.panelDark(c),accent=NativeTheme.accent(c);
  GradientDrawable focus=AppStyle.surface(this,panel,18);focus.setStroke(AppStyle.dp(this,2),accent);
  StateListDrawable states=new StateListDrawable();states.addState(new int[]{android.R.attr.state_focused},focus);states.addState(new int[]{},AppStyle.surface(this,panel,18));
  setBackground(new RippleDrawable(ColorStateList.valueOf((accent&0xffffff)|0x28000000),states,null));setClipToOutline(true);
 }
 @Override public void setPressed(boolean pressed){super.setPressed(pressed);animate().cancel();
  if(!isAttachedToWindow()||!isEnabled()||!NativeMotion.enabled(this)){setScaleX(1);setScaleY(1);return;}
  float scale=pressed?.985f:1f;animate().scaleX(scale).scaleY(scale).setDuration(pressed?80:120).setInterpolator(new android.view.animation.DecelerateInterpolator()).start();
 }
 @Override protected void onDetachedFromWindow(){animate().cancel();setScaleX(1);setScaleY(1);super.onDetachedFromWindow();}
}

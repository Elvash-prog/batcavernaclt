package dev.gamersclt.batcaverna.nativeapp;

import android.animation.ValueAnimator;
import android.content.Context;
import android.content.res.ColorStateList;
import android.graphics.*;
import android.graphics.drawable.RippleDrawable;
import android.view.View;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.*;
import java.util.*;

/** Scrollable native choices; selection moves without changing button geometry. */
final class LibraryTabs extends HorizontalScrollView {
 interface Selection { void choose(String key); }
 private final Strip strip;
 private final String[] keys,labels;
 private final List<Button> buttons=new ArrayList<>();
 private String selected;
 private Map<String,Integer> counts=Collections.emptyMap();
 LibraryTabs(Context c,String tag,String[] keys,String[] labels,String initial,Selection callback){
  super(c);this.keys=keys.clone();this.labels=labels.clone();selected=initial;setTag(tag);
  setHorizontalScrollBarEnabled(false);setFillViewport(true);setOverScrollMode(OVER_SCROLL_NEVER);setFadingEdgeLength(0);
  strip=new Strip(c);addView(strip,new HorizontalScrollView.LayoutParams(-2,-2));
  LinearLayout.LayoutParams outer=new LinearLayout.LayoutParams(-1,-2);outer.setMargins(0,NativeSheet.dp(c,8),0,NativeSheet.dp(c,8));setLayoutParams(outer);
  for(int i=0;i<keys.length;i++){
   final int index=i;Button button=new Button(c);button.setTag(tag+":"+keys[i]);button.setAllCaps(false);button.setTextSize(13);button.setTypeface(Typeface.create("sans-serif-medium",Typeface.NORMAL));
   button.setMinWidth(0);button.setMinimumWidth(0);button.setMinHeight(NativeSheet.dp(c,ResponsivePolicy.controlHeight(getResources().getConfiguration().fontScale)));button.setSingleLine(true);button.setBackgroundTintList(null);button.setElevation(0);button.setStateListAnimator(null);
   button.setPadding(NativeSheet.dp(c,14),NativeSheet.dp(c,10),NativeSheet.dp(c,14),NativeSheet.dp(c,10));
   button.setBackground(new RippleDrawable(ColorStateList.valueOf((NativeTheme.accent(c)&0xffffff)|0x22000000),null,AppStyle.shape(button,0xffffffff,12)));
   button.setAccessibilityDelegate(new View.AccessibilityDelegate(){@Override public void onInitializeAccessibilityNodeInfo(View view,AccessibilityNodeInfo info){super.onInitializeAccessibilityNodeInfo(view,info);info.setClassName("android.widget.RadioButton");info.setCheckable(true);info.setChecked(view.isSelected());}});
   strip.addView(button,new LinearLayout.LayoutParams(-2,-2));buttons.add(button);
   button.setOnClickListener(v->{if(selected.equals(keys[index]))return;select(keys[index]);callback.choose(keys[index]);});
  }
  refreshLabels();strip.move(Arrays.asList(keys).indexOf(selected),false);
 }
 String selected(){return selected;}
 void select(String key){
  int index=Arrays.asList(keys).indexOf(key);if(index<0||selected.equals(key))return;
  boolean changed=!selected.equals(key);selected=key;refreshLabels();strip.move(index,changed&&NativeMotion.enabled(this)&&isAttachedToWindow());
  if(changed)post(()->center(index));
 }
 void counts(Map<String,Integer> values){counts=new LinkedHashMap<>(values);refreshLabels();}
 private void refreshLabels(){
  for(int i=0;i<buttons.size();i++){
   Button button=buttons.get(i);boolean active=selected.equals(keys[i]);String text=labels[i]+(counts.containsKey(keys[i])?" ("+counts.get(keys[i])+")":"");
   if(!text.contentEquals(button.getText()))button.setText(text);
   button.setSelected(active);button.setTextColor(active?NativeTheme.accent(getContext()):0xffbfc8d5);
   button.setContentDescription(labels[i]+(counts.containsKey(keys[i])?", "+counts.get(keys[i])+" títulos":"")+(active?", selecionado":""));
  }
 }
 private void center(int index){if(!isAttachedToWindow())return;View button=buttons.get(index);int x=Math.max(0,button.getLeft()-(getWidth()-button.getWidth())/2);if(NativeMotion.enabled(this))smoothScrollTo(x,0);else scrollTo(x,0);}
 @Override protected void onSizeChanged(int w,int h,int oldw,int oldh){super.onSizeChanged(w,h,oldw,oldh);if(w!=oldw)post(()->{int index=Arrays.asList(keys).indexOf(selected);if(index>=0)center(index);});}
 @Override protected void onDetachedFromWindow(){strip.cancel();super.onDetachedFromWindow();}
 private static final class Strip extends LinearLayout {
  private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);private final RectF indicator=new RectF(),destination=new RectF();private ValueAnimator animation;private int selected;
  Strip(Context c){super(c);setOrientation(HORIZONTAL);setWillNotDraw(false);int p=NativeSheet.dp(c,4);setPadding(p,p,p,p);setBackground(AppStyle.surface(this,NativeTheme.panelDark(c),16));paint.setColor(NativeTheme.blend(NativeTheme.panelDark(c),NativeTheme.accent(c),.24f));}
  void cancel(){if(animation!=null)animation.cancel();}
  private RectF bounds(){View button=getChildAt(selected);return button==null?new RectF():new RectF(button.getLeft(),button.getTop(),button.getRight(),button.getBottom());}
  void move(int index,boolean animate){
   if(index<0||index>=getChildCount())return;selected=index;cancel();RectF end=bounds();destination.set(end);
   if(!animate||indicator.isEmpty()||end.isEmpty()){indicator.set(end);invalidate();return;}
   RectF start=new RectF(indicator);animation=ValueAnimator.ofFloat(0,1);animation.setDuration(180);animation.setInterpolator(new android.view.animation.DecelerateInterpolator());
   animation.addUpdateListener(a->{float f=(float)a.getAnimatedValue();indicator.set(start.left+(end.left-start.left)*f,start.top+(end.top-start.top)*f,start.right+(end.right-start.right)*f,start.bottom+(end.bottom-start.bottom)*f);invalidate();});animation.start();
  }
  @Override protected void onLayout(boolean changed,int l,int t,int r,int b){super.onLayout(changed,l,t,r,b);RectF end=bounds();if(!destination.equals(end)||animation==null||!animation.isRunning()){cancel();destination.set(end);indicator.set(end);invalidate();}}
  @Override protected void onDraw(Canvas canvas){super.onDraw(canvas);float radius=NativeSheet.dp(getContext(),12);canvas.drawRoundRect(indicator,radius,radius,paint);}
 }
}

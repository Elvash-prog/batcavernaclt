package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Matrix;
import android.view.MotionEvent;
import android.widget.ImageView;
/** Cover rendering and opt-in direct crop editing share exactly the same geometry. */
final class ProfileCoverView extends ImageView {
 private Bitmap bitmap;final CropGeometry crop=new CropGeometry();private boolean interactive;private Runnable changed;private float lastX,lastY,lastSpan,lastFocusX,lastFocusY;
 ProfileCoverView(Context c,String source){super(c);setScaleType(ScaleType.MATRIX);try{String fragment=android.net.Uri.parse(source).getFragment();String position=android.net.Uri.parse("https://cover.invalid/?"+fragment).getQueryParameter("bc-cover");if(position!=null){String[] values=position.split(",");if(values.length>=2)crop.position(Float.parseFloat(values[0]),Float.parseFloat(values[1]),values.length>=3?Float.parseFloat(values[2]):100);}}catch(Exception ignored){}

 }
 @Override public void setImageBitmap(Bitmap image){bitmap=image;super.setImageBitmap(image);update();notifyChanged();}
 @Override protected void onSizeChanged(int w,int h,int oldW,int oldH){super.onSizeChanged(w,h,oldW,oldH);update();}
 void position(int horizontal,int vertical,int percent){crop.position(horizontal,vertical,percent);update();notifyChanged();}
 void interactive(Runnable listener){interactive=true;changed=listener;setFocusable(true);setContentDescription("Arraste para enquadrar a imagem. Use dois dedos para ampliar.");}
 boolean ready(){return bitmap!=null&&getWidth()>0&&getHeight()>0;}
 void zoomBy(float amount){zoomAt(crop.zoom+amount,getWidth()/2f,getHeight()/2f);}
 private void zoomAt(float percent,float px,float py){if(!ready()||!isEnabled())return;crop.zoomAt(getWidth(),getHeight(),bitmap.getWidth(),bitmap.getHeight(),percent,px,py);update();notifyChanged();}
 private void notifyChanged(){if(changed!=null)changed.run();}
 private void update(){if(!ready())return;float scale=crop.scale(getWidth(),getHeight(),bitmap.getWidth(),bitmap.getHeight());Matrix matrix=new Matrix();matrix.setScale(scale,scale);matrix.postTranslate(crop.left(getWidth(),bitmap.getWidth(),scale),crop.top(getHeight(),bitmap.getHeight(),scale));setImageMatrix(matrix);}
 @Override public boolean onTouchEvent(MotionEvent e){if(!interactive||!isEnabled()||!ready())return super.onTouchEvent(e);switch(e.getActionMasked()){
  case MotionEvent.ACTION_DOWN:lastSpan=0;lastX=e.getX();lastY=e.getY();if(getParent()!=null)getParent().requestDisallowInterceptTouchEvent(true);return true;
  case MotionEvent.ACTION_POINTER_DOWN:if(e.getPointerCount()>=2){lastSpan=span(e);lastFocusX=(e.getX(0)+e.getX(1))/2;lastFocusY=(e.getY(0)+e.getY(1))/2;}return true;
  case MotionEvent.ACTION_MOVE:if(e.getPointerCount()>=2){float span=span(e),fx=(e.getX(0)+e.getX(1))/2,fy=(e.getY(0)+e.getY(1))/2;if(lastSpan>0){crop.zoomAt(getWidth(),getHeight(),bitmap.getWidth(),bitmap.getHeight(),crop.zoom*span/lastSpan,lastFocusX,lastFocusY);crop.move(getWidth(),getHeight(),bitmap.getWidth(),bitmap.getHeight(),fx-lastFocusX,fy-lastFocusY);update();notifyChanged();}lastSpan=span;lastFocusX=fx;lastFocusY=fy;}else{crop.move(getWidth(),getHeight(),bitmap.getWidth(),bitmap.getHeight(),e.getX()-lastX,e.getY()-lastY);update();notifyChanged();}lastX=e.getX();lastY=e.getY();return true;
  case MotionEvent.ACTION_POINTER_UP:lastSpan=0;int remaining=e.getActionIndex()==0?1:0;lastX=e.getX(remaining);lastY=e.getY(remaining);return true;
  case MotionEvent.ACTION_UP:performClick();if(getParent()!=null)getParent().requestDisallowInterceptTouchEvent(false);return true;
  case MotionEvent.ACTION_CANCEL:if(getParent()!=null)getParent().requestDisallowInterceptTouchEvent(false);return true;
  default:return true;
 }}
 @Override public void onInitializeAccessibilityNodeInfo(android.view.accessibility.AccessibilityNodeInfo info){super.onInitializeAccessibilityNodeInfo(info);if(interactive&&isEnabled()){info.setScrollable(true);info.addAction(android.view.accessibility.AccessibilityNodeInfo.AccessibilityAction.ACTION_SCROLL_LEFT);info.addAction(android.view.accessibility.AccessibilityNodeInfo.AccessibilityAction.ACTION_SCROLL_RIGHT);info.addAction(android.view.accessibility.AccessibilityNodeInfo.AccessibilityAction.ACTION_SCROLL_UP);info.addAction(android.view.accessibility.AccessibilityNodeInfo.AccessibilityAction.ACTION_SCROLL_DOWN);}}
 @Override public boolean performAccessibilityAction(int action,android.os.Bundle args){if(interactive&&isEnabled()&&ready()){float dx=0,dy=0;if(action==android.R.id.accessibilityActionScrollLeft)dx=-getWidth()*.1f;else if(action==android.R.id.accessibilityActionScrollRight)dx=getWidth()*.1f;else if(action==android.R.id.accessibilityActionScrollUp)dy=-getHeight()*.1f;else if(action==android.R.id.accessibilityActionScrollDown)dy=getHeight()*.1f;if(dx!=0||dy!=0){crop.move(getWidth(),getHeight(),bitmap.getWidth(),bitmap.getHeight(),dx,dy);update();notifyChanged();return true;}}return super.performAccessibilityAction(action,args);}
 private static float span(MotionEvent e){return (float)Math.hypot(e.getX(1)-e.getX(0),e.getY(1)-e.getY(0));}
 @Override public boolean performClick(){super.performClick();return true;}
}

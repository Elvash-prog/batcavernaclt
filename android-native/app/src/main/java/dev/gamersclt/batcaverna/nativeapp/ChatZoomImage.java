package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;import android.graphics.*;import android.view.*;import android.widget.ImageView;
final class ChatZoomImage extends ImageView {
 private Bitmap bitmap;private float zoom=1,x,y,lastX,lastY;private final Matrix transform=new Matrix();private Runnable ready;private final ScaleGestureDetector scale;
 ChatZoomImage(Context c){super(c);setScaleType(ScaleType.MATRIX);setContentDescription("Imagem da conversa. Use dois dedos para ampliar e arraste para mover.");scale=new ScaleGestureDetector(c,new ScaleGestureDetector.SimpleOnScaleGestureListener(){public boolean onScale(ScaleGestureDetector d){zoomBy(d.getScaleFactor(),d.getFocusX(),d.getFocusY());return true;}});}
 void onReady(Runnable callback){ready=callback;}Bitmap bitmap(){return bitmap;}float zoom(){return zoom;}
 @Override public void setImageBitmap(Bitmap image){bitmap=image;super.setImageBitmap(image);reset();if(ready!=null)ready.run();}
 @Override protected void onSizeChanged(int w,int h,int oldW,int oldH){super.onSizeChanged(w,h,oldW,oldH);reset();}
 private float fit(){return bitmap==null?1:Math.min(getWidth()/(float)bitmap.getWidth(),getHeight()/(float)bitmap.getHeight());}
 void reset(){zoom=1;if(bitmap!=null){x=(getWidth()-bitmap.getWidth()*fit())/2;y=(getHeight()-bitmap.getHeight()*fit())/2;}apply();}
 void zoomBy(float factor){zoomBy(factor,getWidth()/2f,getHeight()/2f);}
 private void zoomBy(float factor,float focusX,float focusY){if(bitmap==null||getWidth()==0||getHeight()==0)return;float next=Math.max(1,Math.min(5,zoom*factor)),ratio=next/zoom;x=focusX-(focusX-x)*ratio;y=focusY-(focusY-y)*ratio;zoom=next;apply();}
 private void apply(){if(bitmap==null)return;float s=fit()*zoom,w=bitmap.getWidth()*s,h=bitmap.getHeight()*s;x=w<=getWidth()?(getWidth()-w)/2:Math.max(getWidth()-w,Math.min(0,x));y=h<=getHeight()?(getHeight()-h)/2:Math.max(getHeight()-h,Math.min(0,y));transform.setScale(s,s);transform.postTranslate(x,y);setImageMatrix(transform);}
 @Override public boolean onTouchEvent(MotionEvent e){if(bitmap==null)return true;if(getParent()!=null)getParent().requestDisallowInterceptTouchEvent(true);scale.onTouchEvent(e);switch(e.getActionMasked()){case MotionEvent.ACTION_DOWN:lastX=e.getX();lastY=e.getY();break;case MotionEvent.ACTION_MOVE:if(e.getPointerCount()==1&&!scale.isInProgress()){x+=e.getX()-lastX;y+=e.getY()-lastY;apply();}lastX=e.getX();lastY=e.getY();break;case MotionEvent.ACTION_POINTER_UP:int next=e.getActionIndex()==0?1:0;if(next<e.getPointerCount()){lastX=e.getX(next);lastY=e.getY(next);}break;case MotionEvent.ACTION_UP:performClick();break;}return true;}
 @Override public boolean performClick(){super.performClick();return true;}
}

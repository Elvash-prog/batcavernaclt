package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Matrix;
import android.widget.ImageView;
/** Reads the cover position/zoom persisted by the site's profile editor. */
final class ProfileCoverView extends ImageView {
 private Bitmap bitmap;private float x=.5f,y=.5f,zoom=1f;
 ProfileCoverView(Context c,String source){super(c);setScaleType(ScaleType.MATRIX);try{String fragment=android.net.Uri.parse(source).getFragment();String position=android.net.Uri.parse("https://cover.invalid/?"+fragment).getQueryParameter("bc-cover");if(position!=null){String[] values=position.split(",");if(values.length>=2){x=clamp(Float.parseFloat(values[0])/100,0,1);y=clamp(Float.parseFloat(values[1])/100,0,1);if(values.length>=3)zoom=clamp(Float.parseFloat(values[2])/100,.25f,2.5f);}}}catch(Exception ignored){}}
 @Override public void setImageBitmap(Bitmap image){bitmap=image;super.setImageBitmap(image);update();}
 @Override protected void onSizeChanged(int w,int h,int oldW,int oldH){super.onSizeChanged(w,h,oldW,oldH);update();}
 void position(int horizontal,int vertical,int percent){x=clamp(horizontal/100f,0,1);y=clamp(vertical/100f,0,1);zoom=clamp(percent/100f,.25f,2.5f);update();}
 private void update(){if(bitmap==null||getWidth()==0||getHeight()==0)return;float scale=Math.max(getWidth()/(float)bitmap.getWidth(),getHeight()/(float)bitmap.getHeight())*zoom;Matrix matrix=new Matrix();matrix.setScale(scale,scale);matrix.postTranslate((getWidth()-bitmap.getWidth()*scale)*x,(getHeight()-bitmap.getHeight()*scale)*y);setImageMatrix(matrix);}
 private static float clamp(float value,float min,float max){return Float.isNaN(value)||Float.isInfinite(value)?min:Math.max(min,Math.min(max,value));}
}

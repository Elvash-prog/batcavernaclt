package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.graphics.drawable.Drawable;
import android.widget.ImageView;
/** Shows the entire image; height follows its ratio with a bounded portrait size. */
final class MediaImageView extends ImageView {
 MediaImageView(Context c){super(c);setScaleType(ScaleType.FIT_CENTER);setAdjustViewBounds(true);setBackground(AppStyle.shape(this,0xff100f19,16));setClipToOutline(true);}
 protected void onMeasure(int width,int height){
  int w=MeasureSpec.getSize(width);if(w==0){super.onMeasure(width,height);return;}
  Drawable image=getDrawable();int desired=AppStyle.dp(this,200);
  if(image!=null&&image.getIntrinsicWidth()>0&&image.getIntrinsicHeight()>0)desired=Math.round(w*(image.getIntrinsicHeight()/(float)image.getIntrinsicWidth()));
  desired=Math.max(AppStyle.dp(this,72),Math.min(AppStyle.dp(this,520),desired));
  if(MeasureSpec.getMode(height)!=MeasureSpec.UNSPECIFIED)desired=Math.min(desired,MeasureSpec.getSize(height));
  super.onMeasure(width,MeasureSpec.makeMeasureSpec(desired,MeasureSpec.EXACTLY));
 }
}

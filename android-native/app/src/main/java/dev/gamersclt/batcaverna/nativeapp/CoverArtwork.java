package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.graphics.drawable.Drawable;
import android.widget.FrameLayout;
import android.widget.ImageView;
/** The card follows the decoded cover ratio, preserving its full image without bars. */
final class CoverArtwork extends FrameLayout {
 private ImageView image;
 CoverArtwork(Context c){super(c);}
 void image(ImageView value){image=value;}
 @Override protected void onMeasure(int widthSpec,int heightSpec){int width=MeasureSpec.getSize(widthSpec);if(width<=0){super.onMeasure(widthSpec,heightSpec);return;}Drawable cover=image==null?null:image.getDrawable();float ratio=9f/16f;if(cover!=null&&cover.getIntrinsicWidth()>0&&cover.getIntrinsicHeight()>0)ratio=cover.getIntrinsicHeight()/(float)cover.getIntrinsicWidth();int height=Math.max(1,Math.round(width*ratio));super.onMeasure(widthSpec,MeasureSpec.makeMeasureSpec(height,MeasureSpec.EXACTLY));}
}

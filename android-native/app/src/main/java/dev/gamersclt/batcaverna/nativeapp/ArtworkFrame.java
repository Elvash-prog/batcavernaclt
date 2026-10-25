package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.widget.FrameLayout;
/** Cover geometry follows allocated width, rather than a fixed phone size. */
final class ArtworkFrame extends FrameLayout {
 private final float widthToHeight;
 ArtworkFrame(Context c,float widthToHeight){super(c);this.widthToHeight=widthToHeight;}
 @Override protected void onMeasure(int width,int height){int w=MeasureSpec.getSize(width);super.onMeasure(width,MeasureSpec.makeMeasureSpec(ArtworkGeometry.height(w,widthToHeight),MeasureSpec.EXACTLY));}
}

package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.widget.FrameLayout;
/** Cover geometry follows allocated width, rather than a fixed phone size. */
final class ArtworkFrame extends FrameLayout {
 private final float ratio;
 ArtworkFrame(Context c,float ratio){super(c);this.ratio=ratio;}
 @Override protected void onMeasure(int width,int height){int w=MeasureSpec.getSize(width);super.onMeasure(width,MeasureSpec.makeMeasureSpec(Math.round(w*ratio),MeasureSpec.EXACTLY));}
}

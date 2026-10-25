package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.widget.ImageView;
/** Cards fill their artwork area; details can independently fit the full image. */
final class CardCoverImage extends ImageView {
 CardCoverImage(Context context){super(context);setScaleType(ScaleType.CENTER_CROP);}
}

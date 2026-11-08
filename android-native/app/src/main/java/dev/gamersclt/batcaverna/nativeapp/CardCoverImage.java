package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.widget.ImageView;
/** Cards fill their artwork area; details can independently fit the full image. */
final class CardCoverImage extends ImageView {
 CardCoverImage(Context context){super(context);setScaleType(ScaleType.CENTER_CROP);}
 @Override public void setImageResource(int id){super.setImageResource(id);setScaleType(id==R.drawable.app_logo?ScaleType.CENTER_INSIDE:ScaleType.CENTER_CROP);int pad=id==R.drawable.app_logo?NativeSheet.dp(getContext(),32):0;setPadding(pad,pad,pad,pad);}
 @Override public void setImageBitmap(android.graphics.Bitmap bitmap){setPadding(0,0,0,0);setScaleType(ScaleType.CENTER_CROP);super.setImageBitmap(bitmap);}
}

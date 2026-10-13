package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.widget.*;
final class CatalogCard {
 static LinearLayout create(Context c,String title,String cover){LinearLayout row=new LinearLayout(c);row.setGravity(android.view.Gravity.CENTER_VERTICAL);int p=NativeSheet.dp(c,10);row.setPadding(p,p,p,p);row.setBackground(AppStyle.shape(row,0xff201c2a,16));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.setMargins(0,0,0,NativeSheet.dp(c,8));row.setLayoutParams(lp);ImageView image=new ImageView(c);image.setScaleType(ImageView.ScaleType.CENTER_CROP);image.setBackground(AppStyle.shape(image,0xff363044,10));image.setClipToOutline(true);row.addView(image,new LinearLayout.LayoutParams(NativeSheet.dp(c,60),NativeSheet.dp(c,76)));AccountImageLoader.load(image,cover);TextView name=NativeSheet.text(c,title,15,0xfff3effa);name.setPadding(p,0,p,0);name.setMaxLines(3);row.addView(name,new LinearLayout.LayoutParams(0,-2,1));row.setContentDescription("Selecionar "+title);return row;}
}

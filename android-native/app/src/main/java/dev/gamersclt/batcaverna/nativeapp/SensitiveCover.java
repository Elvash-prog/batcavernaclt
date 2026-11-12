package dev.gamersclt.batcaverna.nativeapp;

import android.graphics.*;
import android.graphics.drawable.Drawable;
import android.widget.ImageView;
import org.json.JSONObject;

/** Per-view consent. The hidden state never starts an image request or shares a reveal. */
final class SensitiveCover {
 static boolean marked(JSONObject item){return item!=null&&(item.optBoolean("capa_adulta")||item.optBoolean("adult")||item.optBoolean("nsfw"));}
 static void load(ImageView image,JSONObject item,Runnable display){
  Object ticket=new Object();image.setTag(ticket);
  image.setOnClickListener(null);image.setOnLongClickListener(null);image.setClickable(false);image.setLongClickable(false);image.setForeground(null);
  if(!marked(item)){display.run();return;}
  String name=item.optString("nome",item.optString("name","capa"));
  hide(image,name,display);
 }
 private static void hide(ImageView image,String name,Runnable display){
  // Supersede any old in-flight loader before replacing pixels.
  image.setTag(new Object());image.setImageDrawable(new Warning());image.setForeground(null);
  image.setContentDescription("+18 · Conteúdo adulto · "+name+" · Toque para mostrar");
  image.setOnLongClickListener(null);
  image.setOnClickListener(v->{image.setOnClickListener(null);display.run();image.setContentDescription("Capa adulta de "+name+" · Toque para ocultar");image.setForeground(new Badge());image.setOnClickListener(x->hide(image,name,display));});
 }
 private static class Warning extends Drawable {
  final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
  @Override public void draw(Canvas canvas){Rect b=getBounds();paint.setShader(new LinearGradient(0,0,b.width(),b.height(),0xff352542,0xff171222,Shader.TileMode.CLAMP));canvas.drawRect(b,paint);paint.setShader(null);paint.setColor(0xffeee6fa);paint.setTextAlign(Paint.Align.CENTER);float scale=getResourcesScale(b);paint.setTextSize(scale);paint.setTypeface(Typeface.DEFAULT_BOLD);float y=b.exactCenterY();canvas.drawText("+18",b.exactCenterX(),y-scale*.7f,paint);paint.setTypeface(Typeface.DEFAULT);paint.setTextSize(scale*.58f);canvas.drawText("Conteúdo adulto",b.exactCenterX(),y+scale*.35f,paint);canvas.drawText("Toque para mostrar",b.exactCenterX(),y+scale*1.15f,paint);}
  float getResourcesScale(Rect b){return Math.max(12,Math.min(32,b.width()/5f));}
  @Override public void setAlpha(int alpha){paint.setAlpha(alpha);}
  @Override public void setColorFilter(ColorFilter filter){paint.setColorFilter(filter);}
  @Override public int getOpacity(){return PixelFormat.OPAQUE;}
 }
 private static final class Badge extends Warning {
  @Override public void draw(Canvas canvas){Rect b=getBounds();paint.setShader(null);paint.setColor(0xdd171222);float h=Math.min(60,b.height()/4f);canvas.drawRect(0,0,b.width(),h,paint);paint.setColor(0xffeee6fa);paint.setTextSize(Math.max(10,Math.min(22,h*.55f)));paint.setTextAlign(Paint.Align.CENTER);canvas.drawText("Ocultar +18",b.exactCenterX(),h*.72f,paint);}
 }
}

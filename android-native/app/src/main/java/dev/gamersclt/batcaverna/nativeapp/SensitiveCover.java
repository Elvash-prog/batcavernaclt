package dev.gamersclt.batcaverna.nativeapp;

import android.content.Context;
import android.graphics.*;
import android.graphics.drawable.Drawable;
import android.widget.*;
import org.json.*;
import java.lang.ref.WeakReference;
import java.util.*;

/** Optional local-account filter for explicit sexual art; no per-image reveal state. */
final class SensitiveCover {
 private static final List<WeakReference<ImageView>> IMAGES=new ArrayList<>();
 private static final List<WeakReference<CheckBox>> FILTERS=new ArrayList<>();
 private static String owner(Context c){return SessionPreferences.get(c).getString("user_id","");}
 static boolean allowed(Context c){String user=owner(c);return !user.isEmpty()&&SessionPreferences.get(c).getBoolean("explicit_content:"+user,false);}
 static boolean marked(JSONObject item){return item!=null&&(item.optBoolean("capa_adulta")||item.optBoolean("adult")||item.optBoolean("nsfw"));}
 static JSONArray filterRows(Context c,JSONArray rows){JSONArray result=new JSONArray();for(int i=0;rows!=null&&i<rows.length();i++){JSONObject row=rows.optJSONObject(i);if(row!=null&&(!marked(row)||allowed(c)))result.put(row);}return result;}
 static void setAllowed(Context c,boolean show){String user=owner(c);if(user.isEmpty())return;SessionPreferences.get(c).edit().putBoolean("explicit_content:"+user,show).apply();
  for(Iterator<WeakReference<ImageView>> it=IMAGES.iterator();it.hasNext();){ImageView image=it.next().get();if(image==null){it.remove();continue;}Binding b=(Binding)image.getTag(R.id.explicit_cover_binding);if(b!=null)render(image,b);}
  for(Iterator<WeakReference<CheckBox>> it=FILTERS.iterator();it.hasNext();){CheckBox check=it.next().get();if(check==null){it.remove();continue;}check.setChecked(allowed(check.getContext()));}
 }
 static CheckBox filter(Context c,Runnable changed){CheckBox check=new CheckBox(c);check.setTag("explicit-content-filter");check.setText("Mostrar conteúdo adulto");check.setTextColor(NativeTheme.textColor(check.getContext(),0xffddd2ec));check.setChecked(allowed(c));FILTERS.add(new WeakReference<>(check));check.setOnCheckedChangeListener((button,on)->{if(on!=allowed(c))setAllowed(c,on);if(changed!=null)changed.run();});return check;}
 private static final class Binding {final boolean explicit;final String name,owner;final Runnable display;Binding(Context c,JSONObject item,Runnable display){explicit=marked(item);name=item.optString("nome",item.optString("name","capa"));owner=owner(c);this.display=display;}}
 static void load(ImageView image,JSONObject item,Runnable display){
  if(image.getTag(R.id.explicit_cover_binding)==null){for(Iterator<WeakReference<ImageView>> it=IMAGES.iterator();it.hasNext();)if(it.next().get()==null)it.remove();IMAGES.add(new WeakReference<>(image));}
  Binding binding=new Binding(image.getContext(),item,display);image.setTag(R.id.explicit_cover_binding,binding);render(image,binding);
 }
 private static void render(ImageView image,Binding b){
  image.setTag(new Object());image.setOnClickListener(null);image.setOnLongClickListener(null);image.setClickable(false);image.setLongClickable(false);image.setForeground(null);
  if(b.owner.equals(owner(image.getContext()))&&(!b.explicit||allowed(image.getContext()))){image.setContentDescription("Capa de "+b.name);b.display.run();return;}
  image.setImageDrawable(new Warning());image.setContentDescription("Conteúdo sexual explícito oculto pelo filtro · "+b.name);
 }
 private static final class Warning extends Drawable {
  private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
  @Override public void draw(Canvas canvas){Rect b=getBounds();paint.setColor(0xff211a2c);canvas.drawRect(b,paint);paint.setColor(0xffc6bad6);paint.setTextAlign(Paint.Align.CENTER);float size=Math.max(12,Math.min(28,b.width()/5f));paint.setTextSize(size);paint.setTypeface(Typeface.DEFAULT_BOLD);canvas.drawText("+18",b.exactCenterX(),b.exactCenterY(),paint);paint.setTypeface(Typeface.DEFAULT);paint.setTextSize(size*.6f);canvas.drawText("Explícito",b.exactCenterX(),b.exactCenterY()+size,paint);}
  @Override public void setAlpha(int alpha){paint.setAlpha(alpha);}
  @Override public void setColorFilter(ColorFilter filter){paint.setColorFilter(filter);}
  @Override public int getOpacity(){return PixelFormat.OPAQUE;}
 }
}

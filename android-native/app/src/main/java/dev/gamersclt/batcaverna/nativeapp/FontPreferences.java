package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.graphics.Typeface;
import android.view.*;
import android.widget.*;
import java.lang.ref.WeakReference;
import java.util.*;

/** Local account preference. Uses installed fonts and preserves text styles and OS scaling. */
final class FontPreferences {
 static final String[] KEYS={"system","modern","classic","compact","mono"};
 static final String[] LABELS={"Sistema","Moderna","Clássica","Compacta","Monoespaçada"};
 private static final String[] FAMILIES={null,"sans-serif","serif","sans-serif-condensed","monospace"};
 private static final List<WeakReference<View>> ROOTS=new ArrayList<>();
 private static android.content.SharedPreferences preferences(Context c){return c.getApplicationContext().getSharedPreferences("batcaverna.typography",Context.MODE_PRIVATE);}
 static int index(Context c){if(SessionPreferences.get(c).getString("user_id","").isEmpty())return 0;String selected=preferences(c).getString(key(c),"system");for(int i=0;i<KEYS.length;i++)if(KEYS[i].equals(selected))return i;return 0;}
 private static String key(Context c){return "interface_font:"+SessionPreferences.get(c).getString("user_id","");}
 static void select(Context c,int index){if(index<0||index>=KEYS.length)index=0;if(SessionPreferences.get(c).getString("user_id","").isEmpty())return;preferences(c).edit().putString(key(c),KEYS[index]).apply();for(Iterator<WeakReference<View>> it=ROOTS.iterator();it.hasNext();){View root=it.next().get();if(root==null)it.remove();else apply(root);}}
 static void apply(View root){int selected=index(root.getContext());if(selected==0&&Integer.valueOf(0).equals(root.getTag(R.id.font_last_choice)))return;apply(root,selected);root.setTag(R.id.font_last_choice,selected);}
 private static void apply(View view,int selected){
  if(view instanceof TextView){TextView text=(TextView)view;Typeface original=(Typeface)text.getTag(R.id.font_original_typeface);if(original==null){original=text.getTypeface()==null?Typeface.DEFAULT:text.getTypeface();text.setTag(R.id.font_original_typeface,original);}int style=text.getTypeface()==null?Typeface.NORMAL:text.getTypeface().getStyle();Typeface desired=selected==0?Typeface.create(original,style):Typeface.create(FAMILIES[selected],style);if(!desired.equals(text.getTypeface()))text.setTypeface(desired);}
  if(view instanceof ViewGroup){ViewGroup group=(ViewGroup)view;for(int i=0;i<group.getChildCount();i++)apply(group.getChildAt(i),selected);}
 }
 static void install(View root){
  if(root.getTag(R.id.font_root_observer)!=null){apply(root);return;}
  ROOTS.add(new WeakReference<>(root));ViewTreeObserver.OnGlobalLayoutListener observer=()->apply(root);root.setTag(R.id.font_root_observer,observer);
  root.addOnAttachStateChangeListener(new View.OnAttachStateChangeListener(){public void onViewAttachedToWindow(View v){v.getViewTreeObserver().addOnGlobalLayoutListener(observer);apply(v);}public void onViewDetachedFromWindow(View v){if(v.getViewTreeObserver().isAlive())v.getViewTreeObserver().removeOnGlobalLayoutListener(observer);}});
  if(root.isAttachedToWindow())root.getViewTreeObserver().addOnGlobalLayoutListener(observer);apply(root);
 }
 static void controls(Context c,LinearLayout panel){String account=SessionPreferences.get(c).getString("user_id","");panel.addView(NativeSheet.text(c,"Fonte da interface",14,0xffb4a7c4));Spinner select=NativeSheet.options(c,LABELS);select.setTag("interface-font");select.setContentDescription("Fonte da interface");select.setSelection(index(c));panel.addView(select);TextView preview=NativeSheet.text(c,"BatCaverna · Jogos, pessoas e histórias",18,0xffedf2f8);preview.setTag("font-preview");panel.addView(preview);select.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener(){public void onNothingSelected(AdapterView<?> parent){}public void onItemSelected(AdapterView<?> parent,View view,int position,long id){if(account.equals(SessionPreferences.get(c).getString("user_id",""))&&position!=index(c))FontPreferences.select(c,position);}});}
}

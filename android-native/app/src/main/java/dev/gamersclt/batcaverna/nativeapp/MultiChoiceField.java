package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.widget.*;
import java.util.*;
final class MultiChoiceField extends LinearLayout {
 private final Button button;private final String title,separator;private final String[] options;private final int max;private final Set<String> selected=new LinkedHashSet<>();
 MultiChoiceField(Context c,String title,String[] options,String current,String separator,int max){super(c);this.title=title;this.options=options;this.separator=separator;this.max=max;setOrientation(VERTICAL);for(String part:current.split("[,•]"))if(!part.trim().isEmpty()){String value=part.trim(),key=key(value);for(String option:options)if(!key.isEmpty()&&key(option).equals(key)){value=option;break;}selected.add(value);}button=new Button(c);AppStyle.button(button,false);addView(button);label();button.setOnClickListener(v->open());}
 private static String key(String value){String key=BatchNames.normalized(value).replaceAll("[^a-z0-9]","");if(key.equals("amazonprimevideo"))return "primevideo";if(key.equals("disneyplus"))return "disney";if(key.equals("appletvplus"))return "appletv";return key;}
 void setValue(String value){selected.clear();for(String part:value.split("[,•]"))if(!part.trim().isEmpty())selected.add(part.trim());label();}
 String value(){return android.text.TextUtils.join(separator,selected);}
 private void label(){button.setText((value().isEmpty()?"Selecionar "+title:value())+" ▾");}
 @Override public void setEnabled(boolean enabled){super.setEnabled(enabled);if(button!=null)button.setEnabled(enabled);}
 private void open(){Context c=getContext();NativeSheet s=new NativeSheet(c,title);Set<String> choices=new LinkedHashSet<>(Arrays.asList(options));choices.addAll(selected);Set<String> draft=new LinkedHashSet<>(selected);for(String text:choices){CheckBox check=new CheckBox(c);check.setText(text);check.setTextColor(0xffeee6fc);check.setButtonTintList(android.content.res.ColorStateList.valueOf(0xffae85ff));check.setChecked(draft.contains(text));s.body.addView(check);check.setOnCheckedChangeListener((b,on)->{if(on)draft.add(text);else draft.remove(text);});}TextView error=NativeSheet.text(c,"",12,0xffffa8b5);s.body.addView(error);Button apply=new Button(c);apply.setText("Usar seleção");AppStyle.button(apply,true);s.footer.setVisibility(VISIBLE);s.footer.addView(apply);apply.setOnClickListener(v->{String value=android.text.TextUtils.join(separator,draft);if(value.length()>max){error.setText("A seleção excede "+max+" caracteres.");return;}selected.clear();selected.addAll(draft);label();s.dialog.dismiss();});s.show();}
}

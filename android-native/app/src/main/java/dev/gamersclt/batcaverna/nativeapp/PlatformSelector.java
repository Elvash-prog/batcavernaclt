package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.widget.*;
import java.util.*;
final class PlatformSelector extends LinearLayout {
 private static final String[] OPTIONS={"💻 PC","🎮 PlayStation 5","🎮 PlayStation 4","🟩 Xbox Series","🕹️ Switch","🎮 Steam Deck","📱 Mobile","👾 Retro","🥽 VR"};private final Set<String> selected=new LinkedHashSet<>();private final Button button;
 PlatformSelector(Context c){super(c);setOrientation(VERTICAL);selected.add(OPTIONS[0]);button=new Button(c);AppStyle.button(button,false);addView(button);label();button.setOnClickListener(v->open());}
 void setValue(String value){selected.clear();for(String option:value.split(","))if(!option.trim().isEmpty())selected.add(option.trim());label();}
 String value(){return android.text.TextUtils.join(", ",selected);}
 private void label(){button.setText(value().isEmpty()?"Selecionar plataformas":value()+" ▾");}
 @Override public void setEnabled(boolean enabled){super.setEnabled(enabled);if(button!=null)button.setEnabled(enabled);}
 private void open(){Context c=getContext();NativeSheet sheet=new NativeSheet(c,"Plataformas");Set<String> draft=new LinkedHashSet<>(selected);for(String option:OPTIONS){CheckBox choice=new CheckBox(c);choice.setText(option);choice.setTextColor(0xfff0e8f9);choice.setButtonTintList(android.content.res.ColorStateList.valueOf(0xffb890ff));choice.setChecked(draft.contains(option));sheet.body.addView(choice);choice.setOnCheckedChangeListener((b,on)->{if(on)draft.add(option);else draft.remove(option);});}TextView state=NativeSheet.text(c,"",12,0xffbaa5d3);sheet.body.addView(state);Button apply=new Button(c);apply.setText("Usar plataformas selecionadas");AppStyle.button(apply,true);sheet.body.addView(apply);apply.setOnClickListener(v->{String value=android.text.TextUtils.join(", ",draft);if(value.isEmpty()||value.length()>120){state.setText("Selecione ao menos uma plataforma, com até 120 caracteres no total.");return;}selected.clear();selected.addAll(draft);label();sheet.dialog.dismiss();});sheet.show();}
}

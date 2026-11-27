package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.View;
import android.widget.*;
/** Aba de temas: cada opção mostra uma prévia (fundo, painel, texto e botão) antes de aplicar. */
final class ThemeGallery {
 private ThemeGallery(){}
 static void show(Context c,LinearLayout panel,Runnable applied){
  panel.addView(NativeSheet.text(c,"Temas",22,0xfff3eafa));
  panel.addView(NativeSheet.text(c,NativeTheme.LABELS.length+" temas. Toque em um para aplicar.",13,0xffb4a7c4));
  android.content.res.Configuration config=c.getResources().getConfiguration();
  int columns=config.fontScale>1.3f||config.screenWidthDp<360?1:2,selected=NativeTheme.index(c);
  for(int row=0;row<(NativeTheme.KEYS.length+columns-1)/columns;row++){
   LinearLayout line=new LinearLayout(c);panel.addView(line,new LinearLayout.LayoutParams(-1,-2));
   for(int column=0;column<columns;column++){int theme=row*columns+column;if(theme>=NativeTheme.KEYS.length)break;
    View card=card(c,theme,theme==selected);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,-2,1);int gap=NativeSheet.dp(c,4);lp.setMargins(column==0?0:gap,gap,columns>1&&column==0?gap:0,gap);line.addView(card,lp);
    card.setOnClickListener(v->{NativeTheme.select(c,theme);applied.run();});}
  }
 }
 private static View card(Context c,int theme,boolean selected){
  int[] k=NativeTheme.colors(theme);boolean light=NativeTheme.light(theme);int text=light?0xff242033:0xfff3effa,muted=light?0xff62596f:0xffb2a9c1;
  LinearLayout card=new LinearLayout(c){public CharSequence getAccessibilityClassName(){return Button.class.getName();}};
  card.setOrientation(LinearLayout.VERTICAL);card.setFocusable(true);card.setClickable(true);card.setSelected(selected);card.setMinimumHeight(NativeSheet.dp(c,52));
  card.setContentDescription("Tema "+NativeTheme.LABELS[theme]+(selected?", selecionado":""));card.setTag("theme-card-"+NativeTheme.KEYS[theme]);
  int pad=NativeSheet.dp(c,8);card.setPadding(pad,pad,pad,pad);
  GradientDrawable frame=new GradientDrawable();frame.setCornerRadius(NativeSheet.dp(c,14));frame.setColor(NativeTheme.panel(c));frame.setStroke(NativeSheet.dp(c,selected?2:1),selected?NativeTheme.accent(c):NativeTheme.border(c));card.setBackground(frame);
  // Prévia: fundo em degradê, um cartão do tema com título, legenda e botão na cor de destaque.
  LinearLayout preview=new LinearLayout(c);preview.setOrientation(LinearLayout.VERTICAL);int inner=NativeSheet.dp(c,10);preview.setPadding(inner,inner,inner,inner);
  GradientDrawable bg=new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{k[2],k[3]});bg.setCornerRadius(NativeSheet.dp(c,10));preview.setBackground(bg);preview.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
  LinearLayout surface=new LinearLayout(c);surface.setOrientation(LinearLayout.VERTICAL);surface.setPadding(inner,inner,inner,inner);GradientDrawable sp=new GradientDrawable();sp.setCornerRadius(NativeSheet.dp(c,8));sp.setColor(k[4]);surface.setBackground(sp);
  TextView title=new TextView(c);title.setText("Biblioteca");title.setTextSize(13);title.setTypeface(null,Typeface.BOLD);title.setTextColor(text);surface.addView(title);
  TextView caption=new TextView(c);caption.setText("12 jogos");caption.setTextSize(11);caption.setTextColor(muted);surface.addView(caption);
  View accent=new View(c);GradientDrawable ap=new GradientDrawable();ap.setCornerRadius(NativeSheet.dp(c,6));ap.setColor(k[0]);accent.setBackground(ap);LinearLayout.LayoutParams alp=new LinearLayout.LayoutParams(NativeSheet.dp(c,56),NativeSheet.dp(c,14));alp.topMargin=NativeSheet.dp(c,6);surface.addView(accent,alp);
  preview.addView(surface,new LinearLayout.LayoutParams(-1,-2));card.addView(preview,new LinearLayout.LayoutParams(-1,-2));
  TextView label=NativeSheet.text(c,(selected?"✓ ":"")+NativeTheme.LABELS[theme],14,0xffedf2f8);label.setTypeface(null,Typeface.BOLD);label.setPadding(NativeSheet.dp(c,4),NativeSheet.dp(c,8),0,NativeSheet.dp(c,2));label.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);card.addView(label);
  return card;
 }
}

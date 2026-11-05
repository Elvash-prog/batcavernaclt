package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.graphics.Typeface;
import android.view.View;
import android.widget.*;
import org.json.JSONObject;
/** Personal library data stays separate from catalog ratings and descriptions. */
final class TitleDetailsSummary {
 interface Edit { void open(String field); }
 static LinearLayout create(Context c,JSONObject item,boolean media,Edit edit){
  LinearLayout root=new LinearLayout(c);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(0,NativeSheet.dp(c,8),0,NativeSheet.dp(c,14));root.setTag("title-personal-summary");
  LinearLayout grid=new LinearLayout(c);grid.setOrientation(c.getResources().getConfiguration().fontScale>1.3f||c.getResources().getConfiguration().screenWidthDp<360?LinearLayout.VERTICAL:LinearLayout.HORIZONTAL);root.addView(grid);
  if(!media)metric(c,grid,"horas","Horas jogadas",HoursDisplay.format(item.opt("horas")),edit);
  String rating=item.isNull("nota")?"":item.optString("nota").trim();metric(c,grid,"nota","Sua avaliação",rating.isEmpty()?"Ainda não avaliado":rating,edit);
  double earned=item.isNull("conquistas")?Double.NaN:item.optDouble("conquistas",Double.NaN);
  if(!media&&Double.isFinite(earned)&&earned>=0&&earned<=100){String label="Conquistas concluídas · "+java.text.NumberFormat.getNumberInstance(new java.util.Locale("pt","BR")).format(earned)+"%";root.addView(NativeSheet.text(c,label,12,0xffbfc8d5));ProgressBar bar=new ProgressBar(c,null,android.R.attr.progressBarStyleHorizontal);bar.setMax(1000);bar.setProgress((int)Math.round(earned*10));bar.setProgressTintList(android.content.res.ColorStateList.valueOf(NativeTheme.accent(c)));bar.setContentDescription(label);root.addView(bar,new LinearLayout.LayoutParams(-1,NativeSheet.dp(c,8)));}
  return root;
 }
 private static void metric(Context c,LinearLayout grid,String key,String label,String value,Edit edit){
  LinearLayout card=new LinearLayout(c);card.setOrientation(LinearLayout.VERTICAL);int pad=NativeSheet.dp(c,14);card.setPadding(pad,pad,pad,pad);card.setBackground(AppStyle.shape(card,NativeTheme.panel(c),16));card.setTag("title-edit-"+key);
  boolean vertical=grid.getOrientation()==LinearLayout.VERTICAL;LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(vertical?-1:0,-2,vertical?0:1);lp.setMargins(0,NativeSheet.dp(c,6),vertical?0:NativeSheet.dp(c,6),NativeSheet.dp(c,8));grid.addView(card,lp);
  card.addView(NativeSheet.text(c,label,12,0xffbfc8d5));TextView amount=NativeSheet.text(c,value,19,0xfff3f4f8);amount.setTypeface(null,Typeface.BOLD);card.addView(amount);
  if(edit!=null){card.addView(NativeSheet.text(c,"Editar ↗",12,NativeTheme.accent(c)));card.setFocusable(true);card.setClickable(true);card.setContentDescription("Editar "+label.toLowerCase(new java.util.Locale("pt","BR"))+", "+value);card.setOnClickListener(v->edit.open(key));}else card.setContentDescription(label+", "+value);
 }
}

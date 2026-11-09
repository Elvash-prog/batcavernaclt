package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.content.res.ColorStateList;
import android.graphics.Typeface;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.*;
import org.json.JSONObject;

/** One progress panel; display formatting never changes the stored library data. */
final class TitleDetailsSummary {
 interface Edit { void open(String field); }
 static LinearLayout create(Context c,JSONObject item,boolean media,Edit edit){
  LinearLayout root=new LinearLayout(c);root.setOrientation(LinearLayout.VERTICAL);
  int pad=NativeSheet.dp(c,14);root.setPadding(pad,pad,pad,pad);
  root.setBackground(AppStyle.surface(root,NativeTheme.panelDark(c),20));root.setTag("title-personal-summary");
  LinearLayout.LayoutParams outer=new LinearLayout.LayoutParams(-1,-2);outer.setMargins(0,0,0,NativeSheet.dp(c,18));root.setLayoutParams(outer);
  TextView heading=NativeSheet.text(c,edit==null?"PROGRESSO DESTE PERFIL":"SEU PROGRESSO",10,NativeTheme.accent(c));
  heading.setLetterSpacing(.08f);heading.setTypeface(null,Typeface.BOLD);root.addView(heading);
  status(c,root,item,edit);
  boolean stacked=c.getResources().getConfiguration().fontScale>1.3f||c.getResources().getConfiguration().screenWidthDp<360;
  LinearLayout grid=new LinearLayout(c);grid.setTag("title-progress-metrics");grid.setOrientation(stacked?LinearLayout.VERTICAL:LinearLayout.HORIZONTAL);root.addView(grid,new LinearLayout.LayoutParams(-1,-2));
  if(!media)metric(c,grid,"horas","Tempo jogado",HoursDisplay.detailed(item.opt("horas")),edit);
  String rating=item.isNull("nota")?"":item.optString("nota").trim();
  metric(c,grid,"nota","Sua avaliação",rating.isEmpty()?"Sem avaliação":rating,edit);
  double earned=item.isNull("conquistas")?Double.NaN:item.optDouble("conquistas",Double.NaN);
  if(!media&&Double.isFinite(earned)&&earned>=0&&earned<=100){
   String label="Conquistas concluídas · "+java.text.NumberFormat.getNumberInstance(new java.util.Locale("pt","BR")).format(earned)+"%";
   TextView achievement=NativeSheet.text(c,label,12,0xffbfc8d5);achievement.setPadding(0,NativeSheet.dp(c,12),0,NativeSheet.dp(c,8));root.addView(achievement);
   ProgressBar bar=new ProgressBar(c,null,android.R.attr.progressBarStyleHorizontal);bar.setTag("title-achievements");bar.setMax(10000);bar.setProgress((int)Math.round(earned*100));
   bar.setProgressTintList(ColorStateList.valueOf(NativeTheme.accent(c)));bar.setProgressBackgroundTintList(ColorStateList.valueOf(NativeTheme.soft(c)));bar.setContentDescription(label);
   root.addView(bar,new LinearLayout.LayoutParams(-1,NativeSheet.dp(c,6)));
  }
  return root;
 }
 private static void status(Context c,LinearLayout root,JSONObject item,Edit edit){
  LinearLayout card=new LinearLayout(c);card.setTag("title-edit-status");card.setGravity(Gravity.CENTER_VERTICAL);
  int pad=NativeSheet.dp(c,12);card.setPadding(pad,NativeSheet.dp(c,4),pad,NativeSheet.dp(c,4));card.setMinimumHeight(NativeSheet.dp(c,48));
  int color=NativeTheme.blend(NativeTheme.panel(c),NativeTheme.accent(c),.08f);
  card.setBackground(edit==null?AppStyle.shape(card,color,12):AppStyle.interactive(card,color,12));
  String value=item.isNull("status")?"":item.optString("status").trim();if(value.isEmpty())value="Sem status";
  TextView text=NativeSheet.text(c,value,14,0xfff3f4f8);text.setTypeface(null,Typeface.BOLD);card.addView(text,new LinearLayout.LayoutParams(0,-2,1));
  if(edit!=null){TextView action=NativeSheet.text(c,"Alterar ↗",12,NativeTheme.accent(c));action.setPadding(NativeSheet.dp(c,8),0,0,0);card.addView(action);card.setFocusable(true);card.setContentDescription("Editar status: "+value);card.setOnClickListener(v->edit.open("status"));}
  else card.setContentDescription("Status: "+value);
  LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.setMargins(0,NativeSheet.dp(c,6),0,NativeSheet.dp(c,6));root.addView(card,lp);
 }
 private static void metric(Context c,LinearLayout grid,String key,String label,String value,Edit edit){
  LinearLayout card=new LinearLayout(c);card.setOrientation(LinearLayout.VERTICAL);int pad=NativeSheet.dp(c,12);card.setPadding(pad,pad,pad,pad);
  int color=NativeTheme.panel(c);card.setBackground(edit==null?AppStyle.surface(card,color,14):AppStyle.interactive(card,color,14));card.setTag("title-edit-"+key);
  boolean vertical=grid.getOrientation()==LinearLayout.VERTICAL;
  // MATCH_PARENT makes horizontal cards share the tallest measured height.
  LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(vertical?-1:0,vertical?ViewGroup.LayoutParams.WRAP_CONTENT:ViewGroup.LayoutParams.MATCH_PARENT,vertical?0:1);
  lp.setMargins(0,NativeSheet.dp(c,6),0,0);if(!vertical&&grid.getChildCount()>0)((LinearLayout.LayoutParams)grid.getChildAt(0).getLayoutParams()).rightMargin=NativeSheet.dp(c,8);grid.addView(card,lp);
  card.addView(NativeSheet.text(c,label,11,0xffbfc8d5));
  TextView amount=NativeSheet.text(c,value,key.equals("horas")?23:18,0xfff3f4f8);amount.setTypeface(null,Typeface.BOLD);amount.setTag("title-value-"+key);amount.setLineSpacing(0,1.05f);card.addView(amount);
  if(edit!=null){
   card.addView(new View(c),new LinearLayout.LayoutParams(1,0,1));
   TextView action=NativeSheet.text(c,"Editar ↗",12,NativeTheme.accent(c));action.setTag("title-action-"+key);card.addView(action);
   card.setFocusable(true);card.setContentDescription("Editar "+label.toLowerCase(new java.util.Locale("pt","BR"))+", "+value);card.setOnClickListener(v->edit.open(key));
  }else card.setContentDescription(label+", "+value);
 }
}

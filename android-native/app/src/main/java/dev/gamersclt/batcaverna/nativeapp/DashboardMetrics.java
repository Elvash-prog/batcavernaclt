package dev.gamersclt.batcaverna.nativeapp;

import android.content.Context;
import android.graphics.Typeface;
import android.view.View;
import android.widget.*;
import org.json.JSONObject;

/** Responsive, real account totals; only library totals act as navigation shortcuts. */
final class DashboardMetrics {
 static LinearLayout create(Context c,JSONObject data,Runnable games,Runnable media){
  LinearLayout root=new LinearLayout(c);root.setTag("dashboard-metrics");root.setOrientation(LinearLayout.VERTICAL);
  boolean single=c.getResources().getConfiguration().fontScale>1.3f||c.getResources().getConfiguration().screenWidthDp<360;int columns=single?1:2;
  String[] keys={"total","media","playing","finished"},labels={"Jogos","Filmes e séries","Em andamento","Finalizados"};int[] colors={NativeTheme.accent(c),0xff79b9e9,0xffd4b579,0xff5fceae};
  LinearLayout row=null;
  for(int i=0;i<keys.length;i++){
   if(i%columns==0){row=new LinearLayout(c);root.addView(row);}
   LinearLayout card=new LinearLayout(c);card.setTag("dashboard-metric-"+keys[i]);card.setOrientation(LinearLayout.VERTICAL);int pad=NativeSheet.dp(c,16);card.setPadding(pad,pad,pad,pad);card.setBackground(AppStyle.surface(card,NativeTheme.blend(NativeTheme.panelDark(c),colors[i],.06f),18));
   LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,-2,1);lp.setMargins(0,0,i%columns<columns-1?NativeSheet.dp(c,10):0,NativeSheet.dp(c,10));row.addView(card,lp);
   View icon;
   if(i<2){NavIconView v=new NavIconView(c,i==0?1:5);v.color(colors[i]);icon=v;}else{ImageView v=new ImageView(c);v.setImageDrawable(new ActionIcon(i==2?ActionIcon.SEND:ActionIcon.CHECK,colors[i]));v.setPadding(NativeSheet.dp(c,6),NativeSheet.dp(c,6),NativeSheet.dp(c,6),NativeSheet.dp(c,6));icon=v;}
   icon.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);icon.setBackground(AppStyle.shape(icon,NativeTheme.blend(NativeTheme.panel(c),colors[i],.14f),11));card.addView(icon,new LinearLayout.LayoutParams(NativeSheet.dp(c,36),NativeSheet.dp(c,36)));
   TextView count=NativeSheet.text(c,String.valueOf(Math.max(0,data.optInt(keys[i]))),29,0xfff3f4f8);count.setTypeface(null,Typeface.BOLD);card.addView(count);card.addView(NativeSheet.text(c,labels[i],12,0xffbfc8d5));
   if(i<2){Runnable open=i==0?games:media;card.setFocusable(true);card.setClickable(true);card.setBackground(AppStyle.interactive(card,NativeTheme.blend(NativeTheme.panelDark(c),colors[i],.06f),18));card.setContentDescription(labels[i]+", "+Math.max(0,data.optInt(keys[i]))+", abrir biblioteca");card.setOnClickListener(v->open.run());}
  }
  return root;
 }
 private DashboardMetrics(){}
}

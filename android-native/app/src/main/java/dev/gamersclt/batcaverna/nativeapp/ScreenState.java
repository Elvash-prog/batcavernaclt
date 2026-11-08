package dev.gamersclt.batcaverna.nativeapp;

import android.content.Context;
import android.graphics.Typeface;
import android.view.*;
import android.widget.*;

/** Shared empty/read-error states. Actions are supplied by the owning screen. */
final class ScreenState {
 static LinearLayout message(Context c,boolean error,String title,String description,String action,Runnable retry){
  LinearLayout card=new LinearLayout(c);card.setTag(error?"screen-state-error":"screen-state-empty");card.setOrientation(LinearLayout.VERTICAL);card.setGravity(Gravity.CENTER_HORIZONTAL);
  int pad=NativeSheet.dp(c,20);card.setPadding(pad,pad,pad,pad);card.setBackground(AppStyle.surface(card,NativeTheme.panelDark(c),20));
  LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.setMargins(0,NativeSheet.dp(c,12),0,NativeSheet.dp(c,12));card.setLayoutParams(lp);
  TextView icon=NativeSheet.text(c,error?"↻":"＋",30,NativeTheme.accent(c));icon.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);card.addView(icon);
  TextView heading=NativeSheet.text(c,title,20,0xfff3f4f8);heading.setGravity(Gravity.CENTER);heading.setTypeface(null,Typeface.BOLD);heading.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);card.addView(heading);
  TextView detail=NativeSheet.text(c,description,14,0xffbfc8d5);detail.setGravity(Gravity.CENTER);card.addView(detail);
  if(retry!=null){Button button=new Button(c);button.setText(action);AppStyle.button(button,!error);button.setMinHeight(NativeSheet.dp(c,48));card.addView(button,new LinearLayout.LayoutParams(-1,-2));button.setOnClickListener(v->retry.run());}
  return card;
 }
 static LinearLayout loading(Context c,String title,int columns,boolean poster){
  LinearLayout root=new LinearLayout(c);root.setTag("screen-state-loading");root.setOrientation(LinearLayout.VERTICAL);
  TextView caption=NativeSheet.text(c,title,13,0xffbfc8d5);caption.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);root.addView(caption);
  LibraryGrid grid=new LibraryGrid(c,Math.max(1,columns));grid.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);root.addView(grid);
  // Static placeholders honor both system motion preferences and battery-saving modes.
  for(int i=0;i<Math.max(1,columns)*2;i++){
   LinearLayout card=new LinearLayout(c);card.setOrientation(LinearLayout.VERTICAL);int pad=NativeSheet.dp(c,10);card.setPadding(pad,pad,pad,pad);card.setBackground(AppStyle.shape(card,NativeTheme.panel(c),16));
   ArtworkFrame art=new ArtworkFrame(c,poster?ArtworkGeometry.PORTRAIT:ArtworkGeometry.LANDSCAPE);art.setBackground(AppStyle.shape(art,NativeTheme.soft(c),12));card.addView(art,new LinearLayout.LayoutParams(-1,-2));
   for(int width:new int[]{110,70}){View line=new View(c);line.setBackground(AppStyle.shape(line,NativeTheme.soft(c),4));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,NativeSheet.dp(c,10));lp.setMargins(0,pad,NativeSheet.dp(c,width==110?20:48),0);card.addView(line,lp);}
   grid.append(card);
  }
  return root;
 }
 private ScreenState(){}
}

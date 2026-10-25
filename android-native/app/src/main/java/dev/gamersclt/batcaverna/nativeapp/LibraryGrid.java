package dev.gamersclt.batcaverna.nativeapp;

import android.content.Context;
import android.view.View;
import android.widget.LinearLayout;

/** Append-only rows: adding a page keeps existing cards and their image requests. */
final class LibraryGrid extends LinearLayout {
 private final int columns,gap;private int count;
 LibraryGrid(Context context,int columns){super(context);this.columns=Math.max(1,columns);gap=NativeSheet.dp(context,10);setOrientation(VERTICAL);}
 void append(View card){
  int column=count%columns;
  if(column==0){LinearLayout row=new LinearLayout(getContext());addView(row);for(int i=0;i<columns;i++){LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,1,1);lp.setMargins(0,gap,i==columns-1?0:gap,0);row.addView(new View(getContext()),lp);}}
  LinearLayout row=(LinearLayout)getChildAt(getChildCount()-1);
  LinearLayout.LayoutParams lp=(LinearLayout.LayoutParams)row.getChildAt(column).getLayoutParams();lp.height=LayoutParams.WRAP_CONTENT;
  row.removeViewAt(column);row.addView(card,column,lp);count++;
 }
}

package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.graphics.Typeface;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.RelativeSizeSpan;
import android.text.style.StyleSpan;
import android.widget.TextView;
/** Compact time readout; decimal hours remain unchanged in storage. */
final class PlaytimeBadge {
 static TextView create(Context context,Object hours){
  String duration="◷ "+HoursDisplay.detailed(hours),label=duration+"\nTEMPO JOGADO";
  SpannableString text=new SpannableString(label);text.setSpan(new StyleSpan(Typeface.BOLD),0,duration.length(),Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);text.setSpan(new RelativeSizeSpan(.7f),duration.length()+1,label.length(),Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
  TextView view=new TextView(context);view.setText(text);view.setTextSize(14);view.setTextColor(0xffc9d9ff);view.setContentDescription("Tempo jogado: "+HoursDisplay.detailed(hours));view.setPadding(NativeSheet.dp(context,10),NativeSheet.dp(context,8),NativeSheet.dp(context,10),NativeSheet.dp(context,8));view.setBackground(AppStyle.shape(view,0xff2b2941,12));return view;
 }
}

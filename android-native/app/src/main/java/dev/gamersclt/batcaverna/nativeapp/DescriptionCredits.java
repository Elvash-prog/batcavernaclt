package dev.gamersclt.batcaverna.nativeapp;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.method.LinkMovementMethod;
import android.text.style.URLSpan;
import android.widget.TextView;
/** Preserve provider attribution, linking only our fixed, trusted DeepL URL. */
final class DescriptionCredits {
 static final String NOTICE="\n\nTradução automática por DeepL.com — https://www.deepl.com";
 static final String LABEL="\n\nTradução automática por DeepL.com";
 static void add(android.content.Context c,android.widget.LinearLayout parent,String source){if(source==null||!source.contains(NOTICE))return;TextView credit=NativeSheet.text(c,"",12,0xffb4a7c4);show(credit,NOTICE);parent.addView(credit);}
 static void show(TextView view,String source){
  if(source==null)source="";
  int marker=source.indexOf(NOTICE);
  if(marker<0){view.setText(source);return;}
  String value=source.substring(0,marker)+LABEL+source.substring(marker+NOTICE.length());
  SpannableString text=new SpannableString(value);
  int start=marker+LABEL.length()-"DeepL.com".length();
  text.setSpan(new URLSpan("https://www.deepl.com"),start,start+"DeepL.com".length(),Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
  view.setText(text);view.setMovementMethod(LinkMovementMethod.getInstance());
 }
}

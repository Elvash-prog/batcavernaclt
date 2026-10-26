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
 static String plainText(String source){
  if(source==null)return "";
  java.util.regex.Pattern entity=java.util.regex.Pattern.compile("&(?:#[0-9]+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);");
  for(int pass=0;pass<2;pass++){java.util.regex.Matcher match=entity.matcher(source);StringBuffer out=new StringBuffer();while(match.find()){String decoded=android.text.Html.fromHtml(match.group()).toString();match.appendReplacement(out,java.util.regex.Matcher.quoteReplacement(decoded));}match.appendTail(out);String next=out.toString();if(next.equals(source))break;source=next;}
  return source.replaceAll("(?is)<(script|style)\\b[^>]*>.*?</\\1\\s*>","").replaceAll("(?i)<br\\s*/?\\s*>|</(?:p|div|li|h[1-6])\\s*>","\n").replaceAll("<[^>]*>","").replace('\u00a0',' ');
 }
 static void show(TextView view,String source){
  if(source==null)source="";
  source=plainText(source);
  int marker=source.indexOf(NOTICE);
  if(marker<0){view.setText(source);return;}
  String value=source.substring(0,marker)+LABEL+source.substring(marker+NOTICE.length());
  SpannableString text=new SpannableString(value);
  int start=marker+LABEL.length()-"DeepL.com".length();
  text.setSpan(new URLSpan("https://www.deepl.com"),start,start+"DeepL.com".length(),Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
  view.setText(text);view.setMovementMethod(LinkMovementMethod.getInstance());
 }
}

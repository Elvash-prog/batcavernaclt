package dev.gamersclt.batcaverna.nativeapp;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import android.widget.TextView;
import android.text.Spanned;
import android.text.style.URLSpan;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class)
@Config(sdk=35,manifest=Config.NONE)
public class DescriptionTextTest {
 @Test public void decodesEscapedQuotesAndPreservesParagraphs(){assertEquals("\"How to Fish\"\nPesca & amigos\n",DescriptionCredits.plainText("<p>&amp;quot;How to Fish&amp;quot;</p><p>Pesca &amp; amigos</p>"));}
 @Test public void removesEncodedMarkupAndScripts(){assertEquals("Jogo",DescriptionCredits.plainText("&#60;script&#62;alert(1)&#60;/script&#62;<b>Jogo</b>"));}
 @Test public void preservesTranslationAttribution(){TextView view=new TextView(RuntimeEnvironment.getApplication());DescriptionCredits.show(view,"&quot;Jogo&quot;"+DescriptionCredits.NOTICE);assertEquals("\"Jogo\""+DescriptionCredits.LABEL,view.getText().toString());URLSpan[] links=((Spanned)view.getText()).getSpans(0,view.length(),URLSpan.class);assertEquals(1,links.length);assertEquals("https://www.deepl.com",links[0].getURL());}
}

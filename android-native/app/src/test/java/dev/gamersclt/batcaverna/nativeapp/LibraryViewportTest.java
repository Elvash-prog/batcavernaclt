package dev.gamersclt.batcaverna.nativeapp;
import android.app.Activity;import android.view.*;import android.widget.*;
import org.junit.Test;import org.junit.runner.RunWith;import org.robolectric.*;import org.robolectric.annotation.Config;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class) @Config(sdk=35,manifest=Config.NONE)
public class LibraryViewportTest {
 @Test public void anInsertedTitleKeepsTheVisibleTitleAtTheSameOffset(){Activity activity=Robolectric.buildActivity(Activity.class).setup().get();ScrollView scroll=new ScrollView(activity);LinearLayout body=new LinearLayout(activity);body.setOrientation(1);scroll.addView(body);LinearLayout list=new LinearLayout(activity);list.setOrientation(1);body.addView(list);for(int i=0;i<20;i++){View card=new View(activity);card.setTag("item-"+i);list.addView(card,new LinearLayout.LayoutParams(-1,100));}activity.setContentView(scroll);layout(scroll);scroll.scrollTo(0,250);LibraryViewport position=LibraryViewport.capture(scroll,list);assertEquals("item-2",position.id);View inserted=new View(activity);inserted.setTag("new-item");list.addView(inserted,0,new LinearLayout.LayoutParams(-1,100));layout(scroll);position.restore(scroll,list);assertEquals(350,scroll.getScrollY());assertEquals(position.id,LibraryViewport.capture(scroll,list).id);assertEquals(position.offset,LibraryViewport.capture(scroll,list).offset);activity.finish();}
 private void layout(View view){view.measure(View.MeasureSpec.makeMeasureSpec(320,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(400,View.MeasureSpec.EXACTLY));view.layout(0,0,320,400);}
}

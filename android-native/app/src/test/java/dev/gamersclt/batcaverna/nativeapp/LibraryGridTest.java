package dev.gamersclt.batcaverna.nativeapp;
import android.view.View;
import android.widget.LinearLayout;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class)
@Config(sdk=35,manifest=Config.NONE)
public class LibraryGridTest {
 @Test public void appendPreservesCardsAndFillsPartialRows(){
  for(int columns=1;columns<=4;columns++){
   android.content.Context c=RuntimeEnvironment.getApplication();LibraryGrid grid=new LibraryGrid(c,columns);
   View[] cards=new View[18];for(int i=0;i<cards.length;i++){cards[i]=new View(c);grid.append(cards[i]);}
   assertEquals((18+columns-1)/columns,grid.getChildCount());
   for(int i=0;i<cards.length;i++)assertSame(cards[i],((LinearLayout)grid.getChildAt(i/columns)).getChildAt(i%columns));
   for(int i=0;i<grid.getChildCount();i++)assertEquals(columns,((LinearLayout)grid.getChildAt(i)).getChildCount());
  }
 }
}

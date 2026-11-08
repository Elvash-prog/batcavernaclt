package dev.gamersclt.batcaverna.nativeapp;
import android.app.Activity;
import android.provider.Settings;
import android.view.*;
import android.widget.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class) @Config(sdk=23,manifest=Config.NONE)
public class LibraryCardTest {
 @Test public void scrollingCancelsPressAndDoesNotOpenTheCard(){
  Activity a=Robolectric.buildActivity(Activity.class).setup().get();
  Settings.Global.putFloat(a.getContentResolver(),Settings.Global.ANIMATOR_DURATION_SCALE,0f);
  ScrollView scroll=new ScrollView(a);LinearLayout list=new LinearLayout(a);list.setOrientation(LinearLayout.VERTICAL);scroll.addView(list);
  LibraryCard card=new LibraryCard(a);list.addView(card,new LinearLayout.LayoutParams(-1,200));list.addView(new View(a),new LinearLayout.LayoutParams(-1,1400));int[] clicks={0};card.setOnClickListener(v->clicks[0]++);
  a.setContentView(scroll);scroll.measure(View.MeasureSpec.makeMeasureSpec(360,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(600,View.MeasureSpec.EXACTLY));scroll.layout(0,0,360,600);
  long t=android.os.SystemClock.uptimeMillis();send(scroll,t,t,MotionEvent.ACTION_DOWN,160);send(scroll,t,t+20,MotionEvent.ACTION_UP,160);org.robolectric.Shadows.shadowOf(android.os.Looper.getMainLooper()).idleFor(200,java.util.concurrent.TimeUnit.MILLISECONDS);assertEquals(1,clicks[0]);
  t+=100;send(scroll,t,t,MotionEvent.ACTION_DOWN,160);send(scroll,t,t+20,MotionEvent.ACTION_MOVE,100);send(scroll,t,t+40,MotionEvent.ACTION_MOVE,20);send(scroll,t,t+60,MotionEvent.ACTION_UP,20);
  assertTrue(scroll.getScrollY()>0);assertEquals(1,clicks[0]);assertFalse(card.isPressed());assertEquals(1f,card.getScaleX(),.001f);assertEquals(1f,card.getScaleY(),.001f);
  CardCoverImage image=new CardCoverImage(a);image.setImageResource(R.drawable.app_logo);assertEquals(ImageView.ScaleType.CENTER_INSIDE,image.getScaleType());image.setImageBitmap(android.graphics.Bitmap.createBitmap(10,10,android.graphics.Bitmap.Config.ARGB_8888));assertEquals(ImageView.ScaleType.CENTER_CROP,image.getScaleType());assertEquals(0,image.getPaddingLeft());
 }
 private static void send(View view,long down,long time,int action,float y){MotionEvent e=MotionEvent.obtain(down,time,action,60,y,0);view.dispatchTouchEvent(e);e.recycle();}
}

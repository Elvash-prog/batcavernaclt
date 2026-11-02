package dev.gamersclt.batcaverna.nativeapp;
import android.graphics.*;
import android.view.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import org.robolectric.annotation.GraphicsMode;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class)
@Config(sdk=35,manifest=Config.NONE)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
public class ProfileCropTest {
 @Test public void fingerDragMovesTheImageAndCannotExposeBlankEdges(){
  ProfileCoverView view=view();view.position(50,50,200);view.interactive(()->{});float before=view.crop.x;touch(view,MotionEvent.ACTION_DOWN,100,100);touch(view,MotionEvent.ACTION_MOVE,140,120);touch(view,MotionEvent.ACTION_UP,140,120);assertTrue(view.crop.x<before);assertTrue(view.crop.y<50);
  touch(view,MotionEvent.ACTION_DOWN,100,100);touch(view,MotionEvent.ACTION_MOVE,9999,9999);touch(view,MotionEvent.ACTION_UP,9999,9999);assertEquals(0,view.crop.x,0);assertEquals(0,view.crop.y,0);
  view.setEnabled(false);float x=view.crop.x;touch(view,MotionEvent.ACTION_DOWN,100,100);touch(view,MotionEvent.ACTION_MOVE,-9999,-9999);assertEquals(x,view.crop.x,0);
 }
 @Test public void twoFingerPinchChangesZoomAndLiftingAFingerDoesNotJump(){
  ProfileCoverView view=view();view.interactive(()->{});long time=android.os.SystemClock.uptimeMillis();pinch(view,time,time,MotionEvent.ACTION_DOWN,new float[]{60},new float[]{100});pinch(view,time,time+20,MotionEvent.ACTION_POINTER_DOWN|(1<<MotionEvent.ACTION_POINTER_INDEX_SHIFT),new float[]{60,140},new float[]{100,100});pinch(view,time,time+40,MotionEvent.ACTION_MOVE,new float[]{35,165},new float[]{100,100});pinch(view,time,time+60,MotionEvent.ACTION_MOVE,new float[]{10,190},new float[]{100,100});assertTrue("Pinch must enlarge the image",view.crop.zoom>100);float x=view.crop.x,y=view.crop.y;pinch(view,time,time+80,MotionEvent.ACTION_POINTER_UP|(1<<MotionEvent.ACTION_POINTER_INDEX_SHIFT),new float[]{10,190},new float[]{100,100});pinch(view,time,time+100,MotionEvent.ACTION_MOVE,new float[]{10},new float[]{100});assertEquals(x,view.crop.x,.001);assertEquals(y,view.crop.y,.001);
 }
 private void pinch(View view,long down,long now,int action,float[] xs,float[] ys){MotionEvent.PointerProperties[] properties=new MotionEvent.PointerProperties[xs.length];MotionEvent.PointerCoords[] coordinates=new MotionEvent.PointerCoords[xs.length];for(int i=0;i<xs.length;i++){properties[i]=new MotionEvent.PointerProperties();properties[i].id=i;properties[i].toolType=MotionEvent.TOOL_TYPE_FINGER;coordinates[i]=new MotionEvent.PointerCoords();coordinates[i].x=xs[i];coordinates[i].y=ys[i];coordinates[i].pressure=1;coordinates[i].size=1;}MotionEvent event=MotionEvent.obtain(down,now,action,xs.length,properties,coordinates,0,0,1,1,0,0,InputDevice.SOURCE_TOUCHSCREEN,0);view.onTouchEvent(event);event.recycle();}
 @Test public void zoomKeepsTheSameImagePointUnderTheFocusAndClamps(){
  CropGeometry crop=new CropGeometry();crop.position(50,50,150);float scale=crop.scale(400,200,800,600),sx=(180-crop.left(400,800,scale))/scale,sy=(90-crop.top(200,600,scale))/scale;crop.zoomAt(400,200,800,600,200,180,90);scale=crop.scale(400,200,800,600);assertEquals(sx,(180-crop.left(400,800,scale))/scale,.001);assertEquals(sy,(90-crop.top(200,600,scale))/scale,.001);crop.zoomAt(400,200,800,600,999,200,100);assertEquals(250,crop.zoom,0);crop.zoomAt(400,200,800,600,1,200,100);assertEquals(100,crop.zoom,0);
 }
 @Test public void avatarExportMatchesPreviewCoordinatesAndChosenRegion(){
  Bitmap source=Bitmap.createBitmap(800,600,Bitmap.Config.ARGB_8888);Canvas canvas=new Canvas(source);Paint paint=new Paint();paint.setColor(Color.RED);canvas.drawRect(0,0,400,600,paint);paint.setColor(Color.BLUE);canvas.drawRect(400,0,800,600,paint);
  Bitmap left=ProfileImages.crop(source,512,512,0,50,200),right=ProfileImages.crop(source,512,512,100,50,200);assertEquals(Color.RED,left.getPixel(256,256));assertEquals(Color.BLUE,right.getPixel(256,256));
  ProfileCoverView preview=view();preview.setImageBitmap(source);preview.position(70,27,180);float[] matrix=new float[9];preview.getImageMatrix().getValues(matrix);CropGeometry crop=new CropGeometry();crop.position(70,27,180);float scale=crop.scale(512,512,800,600);assertEquals(matrix[Matrix.MTRANS_X]/matrix[Matrix.MSCALE_X],crop.left(512,800,scale)/scale,.001);assertEquals(matrix[Matrix.MTRANS_Y]/matrix[Matrix.MSCALE_Y],crop.top(512,600,scale)/scale,.001);left.recycle();right.recycle();source.recycle();
 }
 private ProfileCoverView view(){ProfileCoverView view=new ProfileCoverView(RuntimeEnvironment.getApplication(),"");view.setImageBitmap(Bitmap.createBitmap(800,600,Bitmap.Config.ARGB_8888));view.measure(View.MeasureSpec.makeMeasureSpec(200,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(200,View.MeasureSpec.EXACTLY));view.layout(0,0,200,200);return view;}
 private void touch(View view,int action,float x,float y){MotionEvent event=MotionEvent.obtain(0,10,action,x,y,0);view.onTouchEvent(event);event.recycle();}
}

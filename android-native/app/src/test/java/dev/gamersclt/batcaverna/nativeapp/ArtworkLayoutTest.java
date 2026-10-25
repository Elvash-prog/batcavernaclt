package dev.gamersclt.batcaverna.nativeapp;

import android.graphics.*;
import android.view.View;
import android.widget.FrameLayout;
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
public class ArtworkLayoutTest {
 @Test public void portraitMeasuresTallerAndLandscapeWider(){
  assertFrame(200,ArtworkGeometry.PORTRAIT,300,600,900);
  assertFrame(320,ArtworkGeometry.LANDSCAPE,180,1600,900);
 }
 @Test public void imageFillsArtworkEvenWhenProviderRatioDiffers(){
  assertFrame(200,ArtworkGeometry.PORTRAIT,300,264,374);
  assertFrame(320,ArtworkGeometry.LANDSCAPE,180,460,215);
 }
 @Test public void geometryTracksAllocatedWidth(){
  assertFrame(160,ArtworkGeometry.PORTRAIT,240,600,900);
  assertFrame(240,ArtworkGeometry.PORTRAIT,360,600,900);
  assertFrame(160,ArtworkGeometry.LANDSCAPE,90,1600,900);
 }
 @Test public void weightedGridUsesEachCardsWidth(){
  android.content.Context context=RuntimeEnvironment.getApplication();
  for(float ratio:new float[]{ArtworkGeometry.PORTRAIT,ArtworkGeometry.LANDSCAPE}){
   android.widget.LinearLayout row=new android.widget.LinearLayout(context);
   ArtworkFrame[] frames=new ArtworkFrame[2];
   for(int i=0;i<2;i++){
    android.widget.LinearLayout card=new android.widget.LinearLayout(context);card.setOrientation(android.widget.LinearLayout.VERTICAL);
    frames[i]=new ArtworkFrame(context,ratio);frames[i].addView(new CardCoverImage(context),new FrameLayout.LayoutParams(-1,-1));
    card.addView(frames[i],new android.widget.LinearLayout.LayoutParams(-1,-2));row.addView(card,new android.widget.LinearLayout.LayoutParams(0,-2,1));
   }
   row.measure(View.MeasureSpec.makeMeasureSpec(400,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(0,View.MeasureSpec.UNSPECIFIED));row.layout(0,0,row.getMeasuredWidth(),row.getMeasuredHeight());
   for(ArtworkFrame frame:frames){assertEquals(200,frame.getWidth());assertEquals(ArtworkGeometry.height(200,ratio),frame.getHeight());}
  }
 }
 private void assertFrame(int width,float ratio,int expectedHeight,int imageWidth,int imageHeight){
  ArtworkFrame frame=new ArtworkFrame(RuntimeEnvironment.getApplication(),ratio);
  CardCoverImage image=new CardCoverImage(RuntimeEnvironment.getApplication());
  Bitmap bitmap=Bitmap.createBitmap(imageWidth,imageHeight,Bitmap.Config.ARGB_8888);
  bitmap.eraseColor(Color.CYAN);image.setImageBitmap(bitmap);frame.addView(image,new FrameLayout.LayoutParams(-1,-1));
  frame.measure(View.MeasureSpec.makeMeasureSpec(width,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(0,View.MeasureSpec.UNSPECIFIED));
  frame.layout(0,0,frame.getMeasuredWidth(),frame.getMeasuredHeight());
  assertEquals(width,frame.getMeasuredWidth());assertEquals(expectedHeight,frame.getMeasuredHeight());
  assertEquals(width,image.getWidth());assertEquals(expectedHeight,image.getHeight());
  RectF drawn=new RectF(0,0,imageWidth,imageHeight);image.getImageMatrix().mapRect(drawn);
  assertTrue("Image must fill width",drawn.width()>=width-1);assertTrue("Image must fill height",drawn.height()>=expectedHeight-1);
  Bitmap output=Bitmap.createBitmap(width,expectedHeight,Bitmap.Config.ARGB_8888);frame.draw(new Canvas(output));
  assertEquals(Color.CYAN,output.getPixel(0,0));assertEquals(Color.CYAN,output.getPixel(width-1,expectedHeight-1));
  output.recycle();image.setImageDrawable(null);bitmap.recycle();
 }
}

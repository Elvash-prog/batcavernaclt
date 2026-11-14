package dev.gamersclt.batcaverna.nativeapp;
import android.graphics.*;
import java.io.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;
import org.robolectric.annotation.GraphicsMode;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class) @Config(sdk=35,manifest=Config.NONE) @GraphicsMode(GraphicsMode.Mode.NATIVE)
public class CoverQualityTest {
 @Test public void variantsKeepTheChosenArtwork(){
  for(String[] pair:new String[][]{
   {"https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx123.jpg","https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx123.jpg"},
   {"https://images.igdb.com/igdb/image/upload/t_cover_big/co123.jpg","https://images.igdb.com/igdb/image/upload/t_1080p/co123.jpg"},
   {"https://image.tmdb.org/t/p/w500/poster.jpg","https://image.tmdb.org/t/p/original/poster.jpg"}
  })assertArrayEquals(new String[]{pair[1],pair[0]},CoverPolicy.qualityCandidates(pair[0]));
  for(String url:new String[]{"https://example.test/custom.jpg","https://cdn2.steamgriddb.com/grid/custom.png","https://image.tmdb.org.evil.test/t/p/w500/a.jpg","https://image.tmdb.org/t/p/w500/a.jpg?token=private"})assertArrayEquals(new String[]{url},CoverPolicy.qualityCandidates(url));
 }
 @Test public void decodedArtworkRetainsUsefulPixelsAndRemainsBounded(){
  assertEquals(512,CoverPolicy.decodeEdge(240,360));assertEquals(1024,CoverPolicy.decodeEdge(500,750));assertEquals(2048,CoverPolicy.decodeEdge(1100,1650));assertEquals(1,CoverPolicy.sampleSize(1200,1800));assertEquals(2,CoverPolicy.sampleSize(2000,3000));assertEquals(4,CoverPolicy.sampleSize(6000,4000));
 }
 @Test public void largerSourceDoesNotBecomeSmallerThanTheOldPoster()throws Exception{
  android.content.Context context=RuntimeEnvironment.getApplication();File file=File.createTempFile("quality-rounding-",".png",context.getCacheDir());Bitmap original=Bitmap.createBitmap(1600,2400,Bitmap.Config.ARGB_8888);original.eraseColor(Color.BLUE);
  try{try(OutputStream out=new FileOutputStream(file)){assertTrue(original.compress(Bitmap.CompressFormat.PNG,100,out));}Bitmap decoded=PublicCoverDiskCache.decode(file,1024);assertNotNull(decoded);assertTrue(decoded.getWidth()>500);assertEquals(1024,decoded.getHeight());assertEquals(683,decoded.getWidth());decoded.recycle();}finally{original.recycle();file.delete();}
 }
 @Test public void diskCacheDoesNotReduceAUsefulPosterToHalfWidth()throws Exception{
  android.content.Context context=RuntimeEnvironment.getApplication();String url="https://image.tmdb.org/t/p/original/quality-regression.jpg";File input=File.createTempFile("quality-",".png",context.getCacheDir());Bitmap original=Bitmap.createBitmap(1200,1800,Bitmap.Config.ARGB_8888);original.eraseColor(Color.CYAN);
  try{try(OutputStream out=new FileOutputStream(input)){assertTrue(original.compress(Bitmap.CompressFormat.PNG,100,out));}PublicCoverDiskCache.put(context,url,input);Bitmap decoded=PublicCoverDiskCache.get(context,url,2048);assertNotNull(decoded);assertEquals(1200,decoded.getWidth());assertEquals(1800,decoded.getHeight());decoded.recycle();Bitmap thumbnail=PublicCoverDiskCache.get(context,url,512);assertNotNull(thumbnail);assertEquals(341,thumbnail.getWidth());assertEquals(512,thumbnail.getHeight());thumbnail.recycle();}finally{original.recycle();input.delete();}
 }
}

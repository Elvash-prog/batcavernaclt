package dev.gamersclt.batcaverna.nativeapp;
import android.content.*;
import android.graphics.*;
import android.graphics.drawable.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class) @Config(sdk=35)
public class LauncherIconTest {
 @Test public void modernLauncherHasNoOpaqueBackground(){Context c=RuntimeEnvironment.getApplication();Drawable icon=c.getDrawable(R.mipmap.ic_launcher);assertTrue(icon instanceof AdaptiveIconDrawable);Drawable background=((AdaptiveIconDrawable)icon).getBackground();assertTrue(background instanceof ColorDrawable);assertEquals(0,Color.alpha(((ColorDrawable)background).getColor()));}
 @Test public void startupThemeUsesATransparentIconBackground(){Context c=new android.view.ContextThemeWrapper(RuntimeEnvironment.getApplication(),R.style.AppTheme);android.content.res.TypedArray values=c.obtainStyledAttributes(new int[]{android.R.attr.windowSplashScreenIconBackgroundColor,android.R.attr.windowSplashScreenAnimatedIcon});assertEquals(0,Color.alpha(values.getColor(0,Color.WHITE)));assertNotNull(values.getDrawable(1));values.recycle();}
 @Test public void startupLogoHasTransparentCorners(){Bitmap image=BitmapFactory.decodeResource(RuntimeEnvironment.getApplication().getResources(),R.drawable.app_icon);assertNotNull(image);assertEquals(0,Color.alpha(image.getPixel(0,0)));assertEquals(0,Color.alpha(image.getPixel(image.getWidth()-1,image.getHeight()-1)));}
}

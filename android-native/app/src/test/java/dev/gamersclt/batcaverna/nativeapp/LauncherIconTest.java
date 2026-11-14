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
 @Test public void startupLogoHasTransparentCorners(){Bitmap image=BitmapFactory.decodeResource(RuntimeEnvironment.getApplication().getResources(),R.drawable.app_icon);assertNotNull(image);assertEquals(0,Color.alpha(image.getPixel(0,0)));assertEquals(0,Color.alpha(image.getPixel(image.getWidth()-1,image.getHeight()-1)));}
}

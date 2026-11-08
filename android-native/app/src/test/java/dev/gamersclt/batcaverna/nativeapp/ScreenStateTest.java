package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.content.res.Configuration;
import android.view.*;
import android.widget.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.*;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class) @Config(sdk=35,manifest=Config.NONE)
public class ScreenStateTest {
 @Test public void retryRunsOnlyWhenRequestedAndIsAccessible(){Context c=RuntimeEnvironment.getApplication();int[] calls={0};LinearLayout card=ScreenState.message(c,true,"Falha de conexão","Seus filtros foram mantidos.","Tentar novamente",()->calls[0]++);assertEquals(0,calls[0]);Button retry=(Button)card.getChildAt(3);assertTrue(retry.getMinimumHeight()>=NativeSheet.dp(c,48));assertTrue(retry.performClick());assertEquals(1,calls[0]);}
 @Test public void loadingIsDecorativeAndDoesNotPretendToBeEmpty(){Context c=RuntimeEnvironment.getApplication();LinearLayout loading=ScreenState.loading(c,"Carregando sua coleção…",2,true);assertEquals("screen-state-loading",loading.getTag());assertEquals(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS,loading.getChildAt(1).getImportantForAccessibility());assertFalse(loading.getChildAt(1).hasOnClickListeners());}
 @Test public void largeFontMessageGrowsWithoutClipping(){Context app=RuntimeEnvironment.getApplication();Configuration config=new Configuration(app.getResources().getConfiguration());config.fontScale=1.6f;config.screenWidthDp=320;Context c=app.createConfigurationContext(config);LinearLayout card=ScreenState.message(c,false,"Sua coleção começa aqui","Adicione seu primeiro título para acompanhar seu progresso.","Adicionar primeiro título",()->{});card.measure(View.MeasureSpec.makeMeasureSpec(NativeSheet.dp(c,280),View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(0,View.MeasureSpec.UNSPECIFIED));card.layout(0,0,card.getMeasuredWidth(),card.getMeasuredHeight());Button action=(Button)card.getChildAt(3);assertTrue(action.getBottom()<=card.getHeight());assertTrue(card.getHeight()>NativeSheet.dp(c,150));}
}

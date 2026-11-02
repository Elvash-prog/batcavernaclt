package dev.gamersclt.batcaverna.nativeapp;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.app.Instrumentation;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import static org.junit.Assert.*;
import android.view.View;
import android.widget.*;
import java.io.File;
import java.io.FileOutputStream;

/** Captures production components without authenticating or mutating account data. */
public final class MobileAppearanceTest {
 private Instrumentation getInstrumentation(){return InstrumentationRegistry.getInstrumentation();}
 @Test public void testLoginAndSharedControls() throws Exception {
  Intent intent=new Intent(getInstrumentation().getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
  Activity activity=getInstrumentation().startActivitySync(intent);
  try {
   getInstrumentation().waitForIdleSync(); capture(activity,"login-android");
   final Button[] primary=new Button[1];
   getInstrumentation().runOnMainSync(()->{
    LinearLayout body=new LinearLayout(activity);body.setOrientation(LinearLayout.VERTICAL);body.setPadding(24,48,24,24);body.setBackgroundColor(NativeTheme.backgroundEnd(activity));
    TextView title=new TextView(activity);title.setText("Adicionar título");title.setTextColor(0xfff4f2ff);title.setTextSize(26);body.addView(title);
    EditText name=NativeSheet.input(activity,"Nome do título",160);name.setText("Black");body.addView(name);
    EditText hours=NativeSheet.input(activity,"Horas jogadas",20);hours.setText("2,5");body.addView(hours);
    Button save=new Button(activity);save.setText("Salvar alterações");AppStyle.button(save,true);body.addView(save);
    Button cancel=new Button(activity);cancel.setText("Cancelar");AppStyle.button(cancel,false);body.addView(cancel);
    activity.setContentView(body);primary[0]=save;
   });
   getInstrumentation().waitForIdleSync();
   assertTrue(primary[0].getHeight()>=Math.round(48*activity.getResources().getDisplayMetrics().density));
   capture(activity,"controles-android");
   final HomeView[] home=new HomeView[1];
   getInstrumentation().runOnMainSync(()->{home[0]=new HomeView(activity);activity.setContentView(home[0]);home[0].navigate(12);});
   getInstrumentation().waitForIdleSync();
   View retro=findDescription(home[0],"Meu Retrô"),games=findDescription(home[0],"Jogos");
   assertNotNull(retro);assertNotNull(games);assertTrue(retro.isSelected());assertFalse(games.isSelected());
   for(String name:new String[]{"Início","Jogos","Meu Retrô","Filmes","Amigos","Perfil"}){View tab=findDescription(home[0],name);assertNotNull(tab);assertTrue(tab.getWidth()>=NativeSheet.dp(activity,48));}
   capture(activity,"navegacao-retro-android");
   getInstrumentation().runOnMainSync(()->{assertTrue(home[0].back());assertTrue(findDescription(home[0],"Início").isSelected());});
   getInstrumentation().runOnMainSync(()->{
    LinearLayout studio=new LinearLayout(activity);studio.setOrientation(LinearLayout.VERTICAL);studio.setPadding(32,24,32,24);studio.setBackgroundColor(NativeTheme.backgroundEnd(activity));studio.addView(NativeSheet.text(activity,"Seu perfil, seu enquadramento",23,0xfff4effb));
    android.graphics.Bitmap artwork=android.graphics.Bitmap.createBitmap(800,600,android.graphics.Bitmap.Config.ARGB_8888);android.graphics.Canvas canvas=new android.graphics.Canvas(artwork);android.graphics.Paint paint=new android.graphics.Paint();paint.setShader(new android.graphics.LinearGradient(0,0,800,600,new int[]{0xff34205e,0xff9e5f99,0xfff1c79a},null,android.graphics.Shader.TileMode.CLAMP));canvas.drawRect(0,0,800,600,paint);paint.setShader(null);paint.setColor(0x70ffffff);canvas.drawCircle(550,180,100,paint);paint.setColor(0xff201c38);canvas.drawRect(0,420,800,600,paint);
    studio.addView(NativeSheet.text(activity,"Capa",15,0xfff4effb));ProfileCoverView cover=new ProfileCoverView(activity,"");cover.setImageBitmap(artwork);cover.setBackground(AppStyle.shape(cover,0xff111722,14));cover.setClipToOutline(true);studio.addView(cover,new LinearLayout.LayoutParams(-1,NativeSheet.dp(activity,160)));ProfileImageControls.add(activity,studio,cover);cover.position(50,50,130);
    studio.addView(NativeSheet.text(activity,"Foto de perfil",15,0xfff4effb));ProfileCoverView avatar=new ProfileCoverView(activity,"");avatar.setImageBitmap(artwork);avatar.setBackground(AppStyle.shape(avatar,0xff111722,76));avatar.setClipToOutline(true);LinearLayout.LayoutParams ap=new LinearLayout.LayoutParams(NativeSheet.dp(activity,152),NativeSheet.dp(activity,152));ap.gravity=android.view.Gravity.CENTER_HORIZONTAL;studio.addView(avatar,ap);ProfileImageControls.add(activity,studio,avatar);avatar.position(65,35,150);Button save=new Button(activity);save.setText("Salvar imagem");AppStyle.button(save,true);studio.addView(save);activity.setContentView(studio);
   });
   getInstrumentation().waitForIdleSync();capture(activity,"perfil-enquadramento-android");
  } finally { getInstrumentation().runOnMainSync(activity::finish); }
 }
 private View findDescription(View view,String description){
  if(description.contentEquals(view.getContentDescription()==null?"":view.getContentDescription()))return view;
  if(view instanceof android.view.ViewGroup){android.view.ViewGroup group=(android.view.ViewGroup)view;for(int i=0;i<group.getChildCount();i++){View found=findDescription(group.getChildAt(i),description);if(found!=null)return found;}}
  return null;
 }
 private void capture(Activity activity,String name) throws Exception {
  // Capture the app view itself; emulator launcher/system dialogs are separate windows.
  final Bitmap[] pixels=new Bitmap[1];
  getInstrumentation().runOnMainSync(()->{
   View content=activity.findViewById(android.R.id.content);
   pixels[0]=Bitmap.createBitmap(content.getWidth(),content.getHeight(),Bitmap.Config.ARGB_8888);
   content.draw(new android.graphics.Canvas(pixels[0]));
  });
  Bitmap image=pixels[0];assertNotNull(image);
  File directory=new File(getInstrumentation().getTargetContext().getFilesDir(),"mobile-previews");assertTrue(directory.isDirectory()||directory.mkdirs());
  try(FileOutputStream out=new FileOutputStream(new File(directory,name+".png"))){assertTrue(image.compress(Bitmap.CompressFormat.PNG,100,out));}finally{image.recycle();}
 }
}

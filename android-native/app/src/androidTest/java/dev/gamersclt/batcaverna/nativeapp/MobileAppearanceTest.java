package dev.gamersclt.batcaverna.nativeapp;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.test.InstrumentationTestCase;
import android.view.View;
import android.widget.*;
import java.io.File;
import java.io.FileOutputStream;

/** Captures production components without authenticating or mutating account data. */
public final class MobileAppearanceTest extends InstrumentationTestCase {
 public void testLoginAndSharedControls() throws {
  Intent intent=new Intent(getInstrumentation().getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
  Activity activity=getInstrumentation().startActivitySync(intent);
  try {
   getInstrumentation().waitForIdleSync(); capture("login-android");
   getInstrumentation().runOnMainSync(()->{
    LinearLayout body=new LinearLayout(activity);body.setOrientation(LinearLayout.VERTICAL);body.setPadding(24,48,24,24);body.setBackgroundColor(NativeTheme.backgroundEnd(activity));
    TextView title=new TextView(activity);title.setText("Adicionar título");title.setTextColor(0xfff4f2ff);title.setTextSize(26);body.addView(title);
    EditText name=NativeSheet.input(activity,"Nome do título",160);name.setText("Black");body.addView(name);
    EditText hours=NativeSheet.input(activity,"Horas jogadas",20);hours.setText("2,5");body.addView(hours);
    Button save=new Button(activity);save.setText("Salvar alterações");AppStyle.button(save,true);body.addView(save);
    Button cancel=new Button(activity);cancel.setText("Cancelar");AppStyle.button(cancel,false);body.addView(cancel);
    activity.setContentView(body);
    assertTrue(save.getMinimumHeight()>=Math.round(48*activity.getResources().getDisplayMetrics().density));
   });
   getInstrumentation().waitForIdleSync();capture("controles-android");
  } finally { getInstrumentation().runOnMainSync(activity::finish); }
 }
 private void capture(String name) throws Exception {
  Bitmap image=getInstrumentation().getUiAutomation().takeScreenshot();assertNotNull(image);
  File directory=new File(getInstrumentation().getTargetContext().getFilesDir(),"mobile-previews");assertTrue(directory.isDirectory()||directory.mkdirs());
  try(FileOutputStream out=new FileOutputStream(new File(directory,name+".png"))){assertTrue(image.compress(Bitmap.CompressFormat.PNG,100,out));}finally{image.recycle();}
 }
}

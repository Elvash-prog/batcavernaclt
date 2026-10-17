package dev.gamersclt.batcaverna.nativeapp;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.Window;
import android.content.SharedPreferences;
import android.os.Build;
import android.view.View;

public final class MainActivity extends Activity {
    public interface ImageCallback {void accept(android.net.Uri uri);}
    private int notificationRequest;private HomeView home;private NativeAlerts alerts;private LoginView login;
 public void toggleNotifications(){SharedPreferences p=SessionPreferences.get(this);boolean enable=!p.getBoolean("native_alerts",false);p.edit().putBoolean("native_alerts",enable).putLong("alerts_cursor",System.currentTimeMillis()).apply();if(enable&&Build.VERSION.SDK_INT>=33&&checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},91);if(enable)PushSetup.register(this);else PushSetup.revoke(this);android.widget.Toast.makeText(this,enable?"Alertas ativados. O push depende do cadastro do dispositivo e do envio no servidor.":"Alertas desativados",android.widget.Toast.LENGTH_LONG).show();}
 @Override protected void onNewIntent(android.content.Intent intent){super.onNewIntent(intent);setIntent(intent);handleNotificationIntent();}

 private void handleNotificationIntent(){if(home==null)return;android.content.Intent intent=getIntent();String id=intent.getStringExtra("notification_id"),owner=intent.getStringExtra("notification_user");if(id!=null){String current=SessionPreferences.get(this).getString("user_id","");intent.removeExtra("notification_id");intent.removeExtra("notification_user");intent.removeExtra("notifications");if(owner!=null&&!owner.equals(current)){android.widget.Toast.makeText(this,"Este aviso pertence a outra conta.",android.widget.Toast.LENGTH_LONG).show();return;}openNotification(id);}else if(intent.getBooleanExtra("notifications",false)){intent.removeExtra("notifications");destination(8);}}
 public void openNotification(String id){if(home==null)return;final HomeView target=home;final int ticket=++notificationRequest;final String owner=SessionPreferences.get(this).getString("user_id","");new AccountRepository(this).notification(id,(rows,error)->{if(ticket!=notificationRequest||home!=target||!owner.equals(SessionPreferences.get(this).getString("user_id",""))||isFinishing())return;if(error!=null){destination(8);android.widget.Toast.makeText(this,error,android.widget.Toast.LENGTH_LONG).show();return;}org.json.JSONObject row=rows.optJSONObject(0);if(row==null)return;target.openNotification(row);new AccountRepository(this).notificationRead(id,(r,e)->{if(home==target&&e==null)refreshChatCounts();});});}
    public void refreshChatCounts(){if(home!=null)home.refreshChatCounts();}
    public void refreshPresence(){if(home!=null)home.refreshPresence();}
    public void destination(int page){if(home!=null)home.navigate(page);}
    private String imageField;
    private ImageCallback stickerPicked,mediaPicked;
 public void chooseFeedMedia(ImageCallback callback){mediaPicked=callback;android.content.Intent pick=new android.content.Intent(android.content.Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(android.content.Intent.CATEGORY_OPENABLE).putExtra(android.content.Intent.EXTRA_MIME_TYPES,new String[]{"image/jpeg","image/png","image/webp","video/mp4","video/webm"});startActivityForResult(pick,83);}

    public void chooseStickerImage(ImageCallback callback){stickerPicked=callback;android.content.Intent pick=new android.content.Intent(android.content.Intent.ACTION_OPEN_DOCUMENT);pick.setType("image/*");pick.addCategory(android.content.Intent.CATEGORY_OPENABLE);pick.putExtra(android.content.Intent.EXTRA_MIME_TYPES,new String[]{"image/jpeg","image/png","image/webp"});startActivityForResult(pick,82);}
    public void chooseImage(String field){imageField=field;android.content.Intent pick=new android.content.Intent(android.content.Intent.ACTION_OPEN_DOCUMENT);pick.setType("image/*");pick.addCategory(android.content.Intent.CATEGORY_OPENABLE);pick.putExtra(android.content.Intent.EXTRA_MIME_TYPES,new String[]{"image/jpeg","image/png","image/webp"});startActivityForResult(pick,81);}
    @Override protected void onActivityResult(int request,int result,android.content.Intent data){super.onActivityResult(request,result,data);if(request==83){ImageCallback callback=mediaPicked;mediaPicked=null;if(result==RESULT_OK&&data!=null&&data.getData()!=null&&callback!=null)callback.accept(data.getData());return;}if(request==82){ImageCallback callback=stickerPicked;stickerPicked=null;if(result==RESULT_OK&&data!=null&&data.getData()!=null&&callback!=null)callback.accept(data.getData());return;}if(request!=81||result!=RESULT_OK||data==null||data.getData()==null||imageField==null)return;String field=imageField;imageField=null;android.net.Uri uri=data.getData();NativeSheet confirm=new NativeSheet(this,"Atualizar imagem");ProfileCoverView preview=new ProfileCoverView(this,"");final int[] imageZoom={100};android.widget.LinearLayout.LayoutParams previewLayout=new android.widget.LinearLayout.LayoutParams(field.equals("avatar_url")?NativeSheet.dp(this,200):-1,NativeSheet.dp(this,200));previewLayout.gravity=android.view.Gravity.CENTER_HORIZONTAL;preview.setBackground(AppStyle.shape(preview,0xff151c27,field.equals("avatar_url")?100:16));preview.setClipToOutline(true);confirm.body.addView(preview,previewLayout);if(field.equals("avatar_url")){android.widget.TextView zoomLabel=NativeSheet.text(this,"Zoom • 100%",13,0xffb7a6ff);confirm.body.addView(zoomLabel);android.widget.SeekBar zoomControl=new android.widget.SeekBar(this);zoomControl.setMax(225);zoomControl.setProgress(75);confirm.body.addView(zoomControl);zoomControl.setOnSeekBarChangeListener(new android.widget.SeekBar.OnSeekBarChangeListener(){public void onStartTrackingTouch(android.widget.SeekBar s){}public void onStopTrackingTouch(android.widget.SeekBar s){}public void onProgressChanged(android.widget.SeekBar s,int value,boolean user){imageZoom[0]=value+25;zoomLabel.setText("Zoom • "+imageZoom[0]+"%");preview.position(50,50,imageZoom[0]);}});}android.widget.TextView status=NativeSheet.text(this,"A imagem será enviada para moderação ao salvar.",13,0xffb7a6ff);confirm.body.addView(status);android.widget.Button save=new android.widget.Button(this);save.setText("Salvar imagem");AppStyle.button(save,true);confirm.body.addView(save);save.setEnabled(false);java.util.concurrent.ExecutorService decoder=java.util.concurrent.Executors.newSingleThreadExecutor();decoder.execute(()->{try{android.graphics.Bitmap bitmap=ProfileImages.decode(getApplicationContext(),uri);runOnUiThread(()->{if(confirm.dialog.isShowing()){preview.setImageBitmap(bitmap);save.setEnabled(true);}else bitmap.recycle();});}catch(Exception e){runOnUiThread(()->status.setText("Não foi possível abrir a imagem. Escolha JPG, PNG ou WebP de até 10 MB."));}finally{decoder.shutdown();}});save.setOnClickListener(v->{confirm.busy(true);save.setEnabled(false);status.setText("Enviando e verificando imagem…");new AccountRepository(this).uploadProfile(uri,field,imageZoom[0],(rows,error)->{confirm.busy(false);if(error!=null){status.setText(error);return;}AccountImageLoader.clear();confirm.dialog.dismiss();android.widget.Toast.makeText(this,"Imagem salva",android.widget.Toast.LENGTH_SHORT).show();openProfile();});});confirm.show();}
    private boolean foreground=false;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        NativeDiagnostics.install(getApplicationContext());NativeDiagnostics.log(this,"INFO","APP_START","Inicialização nativa "+BuildConfig.VERSION_NAME);
        AppContextHolder.context=getApplicationContext();alerts=new NativeAlerts(this);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        applyWindowTheme();
        if(Build.VERSION.SDK_INT>=30) getWindow().setDecorFitsSystemWindows(true);
        getWindow().getDecorView().setSystemUiVisibility(0);
        SharedPreferences prefs=SessionPreferences.get(this);
        if(!prefs.getBoolean("remember_session",true)&&!SupabaseAuthClient.sessionInProcess)prefs.edit().remove("access_token").remove("refresh_token").remove("user_id").remove("user_email").remove("expires_at").putBoolean("authenticated",false).apply();
        if(prefs.getLong("expires_at",0)<=System.currentTimeMillis()&&prefs.getString("refresh_token","").isEmpty())prefs.edit().remove("access_token").putBoolean("authenticated",false).apply();
        if(prefs.getBoolean("demo_session",false)||prefs.getBoolean("authenticated",false)) openProfile(); else showLogin();
        handleNotificationIntent();
    }

    private void display(View view){
        setContentView(view);
        view.setOnApplyWindowInsetsListener((v,insets)->{
            if(Build.VERSION.SDK_INT>=30){android.graphics.Insets i=insets.getInsets(android.view.WindowInsets.Type.systemBars()|android.view.WindowInsets.Type.displayCutout()|android.view.WindowInsets.Type.ime());v.setPadding(i.left,i.top,i.right,i.bottom);}
            else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets;
        });
        view.requestApplyInsets();
    }
    public void openProfile(){login=null;home=new HomeView(this);home.setForeground(foreground);display(home);handleNotificationIntent();}
    private void applyWindowTheme(){getWindow().setStatusBarColor(NativeTheme.backgroundStart(this));getWindow().setNavigationBarColor(NativeTheme.backgroundEnd(this));}
    public void applyTheme(){applyWindowTheme();if(home!=null)openProfile();else showLogin();}
    @Override protected void onResume(){super.onResume();AppUpdater.automatic(this);foreground=true;PushSetup.register(this);if(alerts!=null)alerts.foreground(true);if(home!=null)home.setForeground(true);}
    @Override protected void onPause(){foreground=false;if(alerts!=null)alerts.foreground(false);if(home!=null)home.setForeground(false);super.onPause();}
    public void showLogin(){home=null;login=new LoginView(this);display(login);}
    public void logout(){notificationRequest++;getIntent().removeExtra("notification_id");getIntent().removeExtra("notification_user");getIntent().removeExtra("notifications");PushSetup.revoke(this);AccountImageLoader.clear();SessionPreferences.get(this).edit().clear().apply();showLogin();}

    @Override public void onBackPressed(){
        if(home!=null&&home.back())return;
        if(login!=null&&login.back())return;
        super.onBackPressed();
    }
}

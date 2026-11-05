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
   final AccountDataView[] collection=new AccountDataView[1];
   getInstrumentation().runOnMainSync(()->{try{
    collection[0]=new AccountDataView(activity,false,0);activity.setContentView(collection[0]);org.json.JSONArray rows=new org.json.JSONArray("[{\"id\":\"1\",\"nome\":\"Pokémon Écarlate\",\"categoria\":\"jogos\",\"status\":\"📌 Backlog\",\"generos\":[\"RPG\",\"Ação\"],\"plataforma\":\"Switch • PC\",\"nota\":\"💎 Lenda (GOTY)\",\"horas\":12.5},{\"id\":\"2\",\"nome\":\"Celeste\",\"categoria\":\"jogos\",\"status\":\"📌 Backlog\",\"generos\":\"Plataforma • Ação\",\"plataforma\":\"PC\",\"nota\":\"⭐⭐⭐⭐½ Excelente\",\"horas\":20.5}]");
    java.lang.reflect.Field data=AccountDataView.class.getDeclaredField("all");data.setAccessible(true);data.set(collection[0],rows);java.lang.reflect.Field error=AccountDataView.class.getDeclaredField("loadError");error.setAccessible(true);error.set(collection[0],"");java.lang.reflect.Field steam=AccountDataView.class.getDeclaredField("currentSteam");steam.setAccessible(true);((View)steam.get(collection[0])).setVisibility(View.GONE);
    for(String method:new String[]{"rebuildFilters","render"}){java.lang.reflect.Method m=AccountDataView.class.getDeclaredMethod(method);m.setAccessible(true);m.invoke(collection[0]);}
    Button filters=findButton(collection[0],"Filtrar ▾");assertNotNull(filters);filters.performClick();
   }catch(Exception e){throw new AssertionError(e);}});
   getInstrumentation().waitForIdleSync();capture(activity,"biblioteca-filtros-android");
   final NativeSheet[] details=new NativeSheet[1];
   getInstrumentation().runOnMainSync(()->{try{org.json.JSONObject item=new org.json.JSONObject().put("nome","Celeste").put("categoria","jogos").put("status","🎮 Em Progresso").put("plataforma","PC • Switch").put("horas",12.5).put("nota","⭐⭐⭐⭐½ Excelente").put("conquistas",42.5).put("_readonly",true);details[0]=TitleDetailsDialog.show(activity,item,false,(updated,deleted)->{throw new AssertionError("Prévia somente leitura");});}catch(Exception e){throw new AssertionError(e);}});
   getInstrumentation().waitForIdleSync();capture(details[0].dialog.getWindow().getDecorView(),"detalhes-jogo-android");
   getInstrumentation().runOnMainSync(()->details[0].dialog.dismiss());
   getInstrumentation().runOnMainSync(()->{try{
    FriendsDataView chat=new FriendsDataView(activity,true);chat.setBackgroundColor(NativeTheme.backgroundEnd(activity));activity.setContentView(chat);org.json.JSONArray messages=new org.json.JSONArray();for(int i=79;i>=0;i--)messages.put(new org.json.JSONObject().put("id","preview-"+i).put("remetente_id","friend-preview").put("texto",i==0?"Novidades para a próxima partida?":"Mensagem de exemplo "+i).put("created_at",String.format(java.util.Locale.ROOT,"2026-11-05T10:%02d:%02dZ",i/60,i%60)).put("lida",false));
    for(String name:new String[]{"activeId","activeName","records","opening"}){java.lang.reflect.Field field=FriendsDataView.class.getDeclaredField(name);field.setAccessible(true);field.set(chat,name.equals("activeId")?"friend-preview":name.equals("activeName")?"Luna":name.equals("records")?messages:true);}
    java.lang.reflect.Field heading=FriendsDataView.class.getDeclaredField("heading");heading.setAccessible(true);((TextView)heading.get(chat)).setText("Luna");java.lang.reflect.Method render=FriendsDataView.class.getDeclaredMethod("render");render.setAccessible(true);render.invoke(chat);java.lang.reflect.Field composer=FriendsDataView.class.getDeclaredField("composer");composer.setAccessible(true);((View)composer.get(chat)).setVisibility(View.VISIBLE);java.lang.reflect.Field draft=FriendsDataView.class.getDeclaredField("draft");draft.setAccessible(true);((EditText)draft.get(chat)).setText("Vamos jogar mais tarde?");java.lang.reflect.Field delivery=FriendsDataView.class.getDeclaredField("delivery");delivery.setAccessible(true);((ChatDeliveryStatus)delivery.get(chat)).failed();
   }catch(Exception e){throw new AssertionError(e);}});
   getInstrumentation().waitForIdleSync();capture(activity,"chat-envio-android");
   final ChatImageDraft[] imageDraft=new ChatImageDraft[1];
   getInstrumentation().runOnMainSync(()->{try{FriendsDataView chat=(FriendsDataView)((android.view.ViewGroup)activity.findViewById(android.R.id.content)).getChildAt(0);java.lang.reflect.Field field=FriendsDataView.class.getDeclaredField("imageDraft");field.setAccessible(true);imageDraft[0]=(ChatImageDraft)field.get(chat);android.graphics.Bitmap bitmap=android.graphics.Bitmap.createBitmap(640,360,android.graphics.Bitmap.Config.ARGB_8888);android.graphics.Canvas canvas=new android.graphics.Canvas(bitmap);android.graphics.Paint paint=new android.graphics.Paint();paint.setShader(new android.graphics.LinearGradient(0,0,640,360,new int[]{0xff174b70,0xff8e62ce,0xffedb986},null,android.graphics.Shader.TileMode.CLAMP));canvas.drawRect(0,0,640,360,paint);File file=new File(activity.getCacheDir(),"chat-preview.png");try(FileOutputStream out=new FileOutputStream(file)){bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,out);}bitmap.recycle();imageDraft[0].select(android.net.Uri.fromFile(file));}catch(Exception e){throw new AssertionError(e);}});
   for(int i=0;i<30&&!imageDraft[0].ready();i++){Thread.sleep(100);getInstrumentation().waitForIdleSync();}assertTrue(imageDraft[0].ready());getInstrumentation().waitForIdleSync();capture(activity,"chat-imagem-android");
   getInstrumentation().runOnMainSync(()->{try{FriendsDataView friends=new FriendsDataView(activity,false,new NativePresence(activity));friends.setBackgroundColor(NativeTheme.backgroundEnd(activity));activity.setContentView(friends);org.json.JSONArray rows=new org.json.JSONArray("[{\"id\":\"friend-a\",\"nome\":\"Luna\",\"slug\":\"luna\"},{\"id\":\"friend-b\",\"nome\":\"Rafael\",\"slug\":\"rafael\"},{\"id\":\"friend-c\",\"nome\":\"Marina\",\"slug\":\"marina\"}]");org.json.JSONObject peers=new org.json.JSONObject();long now=System.currentTimeMillis();peers.put("friend-a",new org.json.JSONObject().put("metas",new org.json.JSONArray().put(new org.json.JSONObject().put("status","online").put("jogo","Hades").put("jogo_fonte","steam").put("online_at",now)).put(new org.json.JSONObject().put("status","online").put("jogo","Minecraft").put("jogo_fonte","pc").put("online_at",now))));peers.put("friend-b",new org.json.JSONObject().put("metas",new org.json.JSONArray().put(new org.json.JSONObject().put("status","ausente").put("jogo","Celeste").put("jogo_fonte","pc").put("online_at",now))));for(String name:new String[]{"records","friendPeers","friendsConnected"}){java.lang.reflect.Field field=FriendsDataView.class.getDeclaredField(name);field.setAccessible(true);field.set(friends,name.equals("records")?rows:name.equals("friendPeers")?peers:true);}java.lang.reflect.Method render=FriendsDataView.class.getDeclaredMethod("render");render.setAccessible(true);render.invoke(friends);assertTrue(((TextView)friends.findViewWithTag("friend-activity:friend-a")).getText().toString().contains("Minecraft"));assertTrue(((TextView)friends.findViewWithTag("friend-activity:friend-b")).getText().toString().contains("Ausente"));}catch(Exception e){throw new AssertionError(e);}});
   getInstrumentation().waitForIdleSync();capture(activity,"amigos-presenca-android");
   getInstrumentation().runOnMainSync(()->{try{
    org.json.JSONArray rows=new org.json.JSONArray();String[] names={"Hollow Knight","Frieren","Interestelar","The Last of Us"},types={"","Anime","Filme","Série"};for(int i=0;i<names.length;i++)rows.put(new org.json.JSONObject().put("id","resume-"+i).put("nome",names[i]).put("tipo",types[i]).put("categoria",i==0?"jogos":"filmes").put("status",i==0?"🎮 Em Progresso":"📺 Assistindo").put("horas",12.5).put("updated_at","2026-11-05T10:00:00Z"));
    ScrollView scroll=new ScrollView(activity);HomeResumeView view=new HomeResumeView(activity,rows,new HomeResumeView.Actions(){public void details(org.json.JSONObject item,Button button){}public void progress(org.json.JSONObject item,AccountRepository.Callback cb){try{cb.done(new org.json.JSONArray().put(new org.json.JSONObject().put("temporada",1).put("episodio",6)),null);}catch(Exception e){throw new AssertionError(e);}}public void episodes(org.json.JSONObject item,Runnable saved){saved.run();}public void status(org.json.JSONObject item,String status,AccountRepository.Callback cb){cb.done(new org.json.JSONArray(),"Falha simulada");}public void explore(String kind){}});view.setPadding(24,24,24,24);scroll.setBackgroundColor(NativeTheme.backgroundEnd(activity));scroll.addView(view);activity.setContentView(scroll);
   }catch(Exception e){throw new AssertionError(e);}});
   getInstrumentation().waitForIdleSync();capture(activity,"inicio-continuar-android");
   getInstrumentation().runOnMainSync(()->{try{ScrollView scroll=new ScrollView(activity);LinearLayout panel=new LinearLayout(activity);panel.setOrientation(LinearLayout.VERTICAL);panel.setPadding(24,24,24,24);panel.addView(NativeSheet.text(activity,"Escolha a edição",24,0xffeee8fa));panel.addView(NativeSheet.text(activity,"Confira ano, plataformas e sua biblioteca antes de adicionar.",14,0xffb4a6c7));String[] names={"Control","Control Ultimate Edition","Duna"},years={"2019","2020","2021"},states={"owned","new","variant"};for(int i=0;i<names.length;i++){org.json.JSONObject row=new org.json.JSONObject().put("name",names[i]).put("released",years[i]+"-01-01").put("platforms",new org.json.JSONArray().put(new org.json.JSONObject().put("platform",new org.json.JSONObject().put("name",i==1?"PlayStation 5":"PC (Microsoft Windows)"))));LinearLayout card=CatalogCard.result(activity,row,false,0,CatalogSelection.label(states[i]));panel.addView(card);assertFalse(((TextView)((LinearLayout)card.getChildAt(1)).getChildAt(0)).getText().toString().isEmpty());}scroll.setBackgroundColor(NativeTheme.backgroundEnd(activity));scroll.addView(panel);activity.setContentView(scroll);}catch(Exception e){throw new AssertionError(e);}});
   getInstrumentation().waitForIdleSync();capture(activity,"catalogo-edicoes-android");







  } finally { getInstrumentation().runOnMainSync(activity::finish); }
 }
 private Button findButton(View view,String label){if(view instanceof Button&&label.contentEquals(((Button)view).getText()))return (Button)view;if(view instanceof android.view.ViewGroup){android.view.ViewGroup group=(android.view.ViewGroup)view;for(int i=0;i<group.getChildCount();i++){Button found=findButton(group.getChildAt(i),label);if(found!=null)return found;}}return null;}
 private View findDescription(View view,String description){
  if(description.contentEquals(view.getContentDescription()==null?"":view.getContentDescription()))return view;
  if(view instanceof android.view.ViewGroup){android.view.ViewGroup group=(android.view.ViewGroup)view;for(int i=0;i<group.getChildCount();i++){View found=findDescription(group.getChildAt(i),description);if(found!=null)return found;}}
  return null;
 }
 private void capture(Activity activity,String name) throws Exception {capture(activity.findViewById(android.R.id.content),name);}
 private void capture(View content,String name) throws Exception {
  // Capture the app view itself; emulator launcher/system dialogs are separate windows.
  final Bitmap[] pixels=new Bitmap[1];
  getInstrumentation().runOnMainSync(()->{
   pixels[0]=Bitmap.createBitmap(content.getWidth(),content.getHeight(),Bitmap.Config.ARGB_8888);
   content.draw(new android.graphics.Canvas(pixels[0]));
  });
  Bitmap image=pixels[0];assertNotNull(image);
  File directory=new File(getInstrumentation().getTargetContext().getFilesDir(),"mobile-previews");assertTrue(directory.isDirectory()||directory.mkdirs());
  try(FileOutputStream out=new FileOutputStream(new File(directory,name+".png"))){assertTrue(image.compress(Bitmap.CompressFormat.PNG,100,out));}finally{image.recycle();}
 }
}

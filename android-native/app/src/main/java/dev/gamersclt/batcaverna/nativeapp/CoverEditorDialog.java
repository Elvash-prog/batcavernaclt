package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.widget.*;
import org.json.*;
final class CoverEditorDialog {
 static void show(Context c,JSONObject profile,Runnable saved){String source=profile.optString("banner_url","");if(source.isEmpty()||source.equals("null")){Toast.makeText(c,"Adicione uma capa primeiro",Toast.LENGTH_SHORT).show();return;}
  NativeSheet sheet=new NativeSheet(c,"Enquadrar capa");ProfileCoverView preview=new ProfileCoverView(c,source);preview.setBackground(AppStyle.shape(preview,0xff111722,16));preview.setClipToOutline(true);sheet.body.addView(preview,new LinearLayout.LayoutParams(-1,NativeSheet.dp(c,180)));LinearLayout controls=ProfileImageControls.add(c,sheet.body,preview);AccountImageLoader.load(preview,source);TextView state=NativeSheet.text(c,"",12,0xffaaa3b8);sheet.body.addView(state);sheet.footer.setVisibility(android.view.View.VISIBLE);Button save=new Button(c);save.setText("Salvar enquadramento");AppStyle.button(save,true);sheet.footer.addView(save);
  save.setOnClickListener(v->{if(!preview.ready()){state.setText("Aguarde a capa carregar.");return;}save.setEnabled(false);preview.setEnabled(false);ProfileImageControls.enabled(controls,false);sheet.busy(true);new AccountRepository(c).coverPosition(Math.round(preview.crop.x),Math.round(preview.crop.y),Math.round(preview.crop.zoom),(r,e)->{sheet.busy(false);if(!sheet.dialog.isShowing())return;if(e!=null){state.setText(e);save.setEnabled(true);preview.setEnabled(true);ProfileImageControls.enabled(controls,true);return;}sheet.dialog.dismiss();saved.run();});});sheet.show();
 }
}

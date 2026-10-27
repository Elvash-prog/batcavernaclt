package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.view.View;
import android.widget.*;
import org.json.*;

final class GameCoverPickerDialog {
 interface Choice {void selected(String url);}
 static void show(Context c,JSONObject item,Choice choice){
  NativeSheet sheet=new NativeSheet(c,"Capas do SteamGridDB");
  TextView state=NativeSheet.text(c,"Escolha o formato e depois a imagem oficial do jogo.",13,0xffbcaed0);sheet.body.addView(state);
  Spinner format=NativeSheet.options(c,new String[]{"Vertical","Horizontal"});sheet.body.addView(format);
  Button search=new Button(c);search.setText("Buscar capas");AppStyle.button(search,true);sheet.body.addView(search);
  GridLayout grid=new GridLayout(c);grid.setColumnCount(2);sheet.body.addView(grid,new LinearLayout.LayoutParams(-1,-2));
  search.setOnClickListener(v->{boolean vertical=format.getSelectedItemPosition()==0;search.setEnabled(false);sheet.busy(true);state.setText("Buscando capas "+(vertical?"verticais":"horizontais")+"…");grid.removeAllViews();new AccountRepository(c).searchGameArtworkOptions(item,vertical,(rows,error)->{sheet.busy(false);search.setEnabled(true);if(error!=null){state.setText(error);return;}if(rows.length()==0){state.setText("Nenhuma capa exata foi encontrada para este jogo.");return;}state.setText(rows.length()+" opções encontradas. Toque na capa desejada.");for(int i=0;i<rows.length();i++){JSONObject row=rows.optJSONObject(i);String url=row.optString("url");LinearLayout card=new LinearLayout(c);card.setOrientation(LinearLayout.VERTICAL);card.setPadding(NativeSheet.dp(c,5),NativeSheet.dp(c,5),NativeSheet.dp(c,5),NativeSheet.dp(c,8));card.setBackground(AppStyle.interactive(card,0xff211b2e,14));GridLayout.LayoutParams lp=new GridLayout.LayoutParams();lp.width=0;lp.columnSpec=GridLayout.spec(GridLayout.UNDEFINED,1f);lp.setMargins(NativeSheet.dp(c,4),NativeSheet.dp(c,4),NativeSheet.dp(c,4),NativeSheet.dp(c,4));grid.addView(card,lp);ImageView image=new ImageView(c);image.setScaleType(ImageView.ScaleType.CENTER_CROP);card.addView(image,new LinearLayout.LayoutParams(-1,vertical?NativeSheet.dp(c,220):NativeSheet.dp(c,105)));AccountImageLoader.load(image,url);card.addView(NativeSheet.text(c,row.optInt("width")+" × "+row.optInt("height"),11,0xffb9accb));card.setContentDescription("Escolher capa "+(i+1));card.setOnClickListener(x->{choice.selected(url);sheet.dialog.dismiss();});}});});
  sheet.show();search.performClick();
 }
}

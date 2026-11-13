package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.view.View;
import android.widget.*;
import org.json.*;

final class GameCoverPickerDialog {
 interface Choice {void selected(String url,boolean sensitive);}
 static void show(Context c,JSONObject item,Choice choice){
  NativeSheet sheet=new NativeSheet(c,"Capas do SteamGridDB");
  TextView state=NativeSheet.status(c,"",13,0xffbcaed0);sheet.body.addView(state);
  Spinner format=NativeSheet.options(c,new String[]{"Vertical","Horizontal"});sheet.body.addView(format);
  Button search=new Button(c);search.setText("Buscar capas");AppStyle.button(search,true);sheet.body.addView(search);
  final int[] generation={0};GridLayout grid=new GridLayout(c);grid.setColumnCount(2);sheet.body.addView(grid,new LinearLayout.LayoutParams(-1,-2));
  sheet.body.addView(SensitiveCover.filter(c,()->{if(!sheet.dialog.isShowing())return;generation[0]++;search.setEnabled(true);search.performClick();}),sheet.body.indexOfChild(grid));
  search.setOnClickListener(v->{final int ticket=++generation[0];boolean vertical=format.getSelectedItemPosition()==0;search.setEnabled(false);sheet.busy(true);state.setText("Buscando capas "+(vertical?"verticais":"horizontais")+"…");grid.removeAllViews();new AccountRepository(c).searchGameArtworkOptions(item,vertical,(rows,error)->{if(ticket!=generation[0]||!sheet.dialog.isShowing())return;sheet.busy(false);search.setEnabled(true);if(error!=null){state.setText(error);return;}int total=rows.length();rows=SensitiveCover.filterRows(c,rows);if(rows.length()==0){state.setText(total>0?"Conteúdo adulto oculto pelo filtro.":"Nenhuma capa exata foi encontrada para este jogo.");return;}state.setText(rows.length()+" opções encontradas.");for(int i=0;i<rows.length();i++){JSONObject row=rows.optJSONObject(i);String url=row.optString("url");LinearLayout card=new LinearLayout(c);card.setOrientation(LinearLayout.VERTICAL);card.setPadding(NativeSheet.dp(c,5),NativeSheet.dp(c,5),NativeSheet.dp(c,5),NativeSheet.dp(c,8));card.setBackground(AppStyle.interactive(card,0xff211b2e,14));GridLayout.LayoutParams lp=new GridLayout.LayoutParams();lp.width=0;lp.columnSpec=GridLayout.spec(GridLayout.UNDEFINED,1f);lp.setMargins(NativeSheet.dp(c,4),NativeSheet.dp(c,4),NativeSheet.dp(c,4),NativeSheet.dp(c,4));grid.addView(card,lp);ImageView image=new ImageView(c);image.setScaleType(ImageView.ScaleType.CENTER_CROP);card.addView(image,new LinearLayout.LayoutParams(-1,vertical?NativeSheet.dp(c,220):NativeSheet.dp(c,105)));SensitiveCover.load(image,row,()->AccountImageLoader.load(image,url));card.addView(NativeSheet.text(c,row.optInt("width")+" × "+row.optInt("height"),11,0xffb9accb));Button use=new Button(c);use.setText("Usar esta capa");AppStyle.button(use,false);card.addView(use);use.setOnClickListener(x->{choice.selected(url,row.optBoolean("nsfw"));sheet.dialog.dismiss();});card.setContentDescription("Escolher capa "+(i+1));card.setOnClickListener(x->{choice.selected(url,row.optBoolean("nsfw"));sheet.dialog.dismiss();});}});});
  sheet.show();search.performClick();
 }
}

package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.widget.*;
import org.json.*;

final class FriendRequestsSheet {
 private final Context c;private final NativeSheet sheet;private final AccountRepository repo;private final String owner;private final Runnable changed;private int revision;private boolean busy;
 FriendRequestsSheet(Context context,Runnable changed){c=context;this.changed=changed;owner=c.getSharedPreferences("batcaverna",0).getString("user_id","");repo=new AccountRepository(c);sheet=new NativeSheet(c,"Convites de amizade");sheet.show();load();}
 private boolean active(int ticket){return FriendSearchInput.current(ticket,revision,owner,c.getSharedPreferences("batcaverna",0).getString("user_id",""),sheet.dialog.isShowing());}
 private void load(){int ticket=++revision;sheet.body.removeAllViews();TextView state=NativeSheet.text(c,"Carregando convites…",14,0xffd7cbe7);sheet.body.addView(state);repo.friendInvitations((rows,error)->{if(!active(ticket))return;if(error!=null){state.setText(error);button("Tentar novamente",this::load);return;}state.setText(rows.length()==0?"Nenhum convite pendente.":rows.length()+" convites recebidos");button("Atualizar",this::load);for(int i=0;i<rows.length();i++){JSONObject row=rows.optJSONObject(i);if(row==null)continue;ImageView avatar=new ImageView(c);avatar.setScaleType(ImageView.ScaleType.CENTER_CROP);avatar.setImageResource(R.drawable.app_logo);sheet.body.addView(avatar,new LinearLayout.LayoutParams(NativeSheet.dp(c,44),NativeSheet.dp(c,44)));AccountImageLoader.load(avatar,row.optString("avatar_url",""));sheet.body.addView(NativeSheet.text(c,row.optString("nome","Pessoa")+" quer ser sua amiga",16,0xfff3f4f8));for(boolean accept:new boolean[]{true,false})button(accept?"Aceitar amizade":"Recusar convite",()->{if(busy||!active(ticket))return;busy=true;sheet.busy(true);state.setText("Respondendo…");repo.respondFriendInvitation(row.optString("id"),accept,(reply,problem)->{busy=false;sheet.busy(false);if(!active(ticket))return;if(problem!=null){state.setText(problem);return;}if(accept&&changed!=null)changed.run();load();});});}});}
 private void button(String label,Runnable click){Button b=new Button(c);b.setText(label);AppStyle.button(b,false);sheet.body.addView(b,new LinearLayout.LayoutParams(-1,-2));b.setOnClickListener(v->{if(!busy)click.run();});}
}

package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.view.View;
import android.view.Gravity;
import android.view.inputmethod.EditorInfo;
import android.widget.*;
import org.json.*;

/** Public account search; inviting a person does not grant friendship access. */
final class FriendSearchSheet {
 private final Context c;private final NativeSheet sheet;private final AccountRepository repo;
 private final EditText query;private final TextView state;private final LinearLayout results;
 private final String owner;private int revision;private final java.util.Set<String> sent=new java.util.HashSet<>(),pending=new java.util.HashSet<>();
 private final java.util.Map<String,Button> inviteButtons=new java.util.HashMap<>();
 FriendSearchSheet(Context context){
  c=context;owner=account();repo=new AccountRepository(c);sheet=new NativeSheet(c,"Adicionar amigos");
  query=NativeSheet.input(c,"Nome, @usuário ou código de convite",80);query.setSingleLine(true);query.setImeOptions(EditorInfo.IME_ACTION_SEARCH);sheet.body.addView(query);
  Button search=new Button(c);search.setText("Pesquisar pessoas");AppStyle.button(search,true);sheet.body.addView(search,new LinearLayout.LayoutParams(-1,-2));search.setOnClickListener(v->search());
  state=NativeSheet.text(c,"Encontre uma pessoa e envie um convite. Ela precisa aceitar para virar sua amiga.",13,0xffb9aace);sheet.body.addView(state);
  results=new LinearLayout(c);results.setOrientation(LinearLayout.VERTICAL);sheet.body.addView(results);
  query.addTextChangedListener(new android.text.TextWatcher(){public void beforeTextChanged(CharSequence s,int a,int n,int x){}public void afterTextChanged(android.text.Editable e){}public void onTextChanged(CharSequence s,int a,int b,int n){revision++;inviteButtons.clear();results.removeAllViews();state.setText("Toque em Pesquisar ou use a busca do teclado.");}});
  query.setOnEditorActionListener((v,action,event)->{if(action==EditorInfo.IME_ACTION_SEARCH){search();return true;}return false;});
  sheet.dialog.setOnDismissListener(d->revision++);sheet.show();
 }
 private String account(){return c.getSharedPreferences("batcaverna",0).getString("user_id","");}
 private boolean active(int ticket){return FriendSearchInput.current(ticket,revision,owner,account(),sheet.dialog.isShowing());}
 private void search(){
  final String term;try{term=FriendSearchInput.term(query.getText().toString());}catch(IllegalArgumentException e){state.setText(e.getMessage());return;}
  int ticket=++revision;inviteButtons.clear();results.removeAllViews();state.setText("Procurando pessoas…");
  repo.searchPeople(term,(rows,error)->{if(!active(ticket))return;if(error!=null){state.setText(error+" Toque em Pesquisar para tentar novamente.");return;}
   state.setText(rows.length()==0?"Nenhuma pessoa encontrada. Tente outro nome, @usuário ou código.":rows.length()+" pessoas encontradas");
   for(int i=0;i<rows.length();i++){JSONObject person=rows.optJSONObject(i);if(person==null)continue;String id=person.optString("id");if(id.equals(owner)||!ItemEditInput.validId(id))continue;
    LinearLayout card=new LinearLayout(c);card.setOrientation(LinearLayout.VERTICAL);card.setPadding(dp(12),dp(10),dp(12),dp(10));card.setBackground(AppStyle.shape(card,0xff242035,14));LinearLayout.LayoutParams cp=new LinearLayout.LayoutParams(-1,-2);cp.setMargins(0,dp(6),0,dp(6));results.addView(card,cp);
    LinearLayout row=new LinearLayout(c);row.setGravity(Gravity.CENTER_VERTICAL);card.addView(row);
    ImageView avatar=new ImageView(c);avatar.setImageResource(R.drawable.app_logo);avatar.setScaleType(ImageView.ScaleType.CENTER_CROP);avatar.setBackground(AppStyle.shape(avatar,0xff303449,24));avatar.setClipToOutline(true);row.addView(avatar,new LinearLayout.LayoutParams(dp(44),dp(44)));AccountImageLoader.load(avatar,person.optString("avatar_url",""));
    LinearLayout labels=new LinearLayout(c);labels.setOrientation(LinearLayout.VERTICAL);labels.setPadding(dp(12),0,0,0);row.addView(labels,new LinearLayout.LayoutParams(0,-2,1));labels.addView(NativeSheet.text(c,person.optString("nome","Pessoa"),16,0xfff3f4f8));String slug=person.optString("slug","");if(!slug.isEmpty())labels.addView(NativeSheet.text(c,"@"+slug,12,0xffb9aace));
    Button invite=new Button(c);invite.setAllCaps(false);AppStyle.button(invite,true);card.addView(invite,new LinearLayout.LayoutParams(-1,-2));invite.setText(sent.contains(id)?"Convite enviado":pending.contains(id)?"Enviando…":"Adicionar amigo");invite.setEnabled(!sent.contains(id)&&!pending.contains(id));
    inviteButtons.put(id,invite);invite.setOnClickListener(v->{if(!active(ticket)||sent.contains(id)||!pending.add(id))return;invite.setEnabled(false);invite.setText("Enviando…");repo.inviteFriend(id,(reply,problem)->{pending.remove(id);if(!owner.equals(account()))return;if(problem==null)sent.add(id);if(!sheet.dialog.isShowing())return;Button current=inviteButtons.get(id);if(current==null)return;if(problem!=null){current.setEnabled(true);current.setText("Adicionar amigo");state.setText(problem);}else{current.setEnabled(false);current.setText("Convite enviado");state.setText("Convite enviado. Aguarde a pessoa aceitar.");}});});
   }
  });
 }
 private int dp(int value){return NativeSheet.dp(c,value);}
}

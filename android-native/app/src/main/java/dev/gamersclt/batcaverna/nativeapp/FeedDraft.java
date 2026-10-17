package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.*;
/** Local text only, isolated by account. Confirmed publishing cannot erase a newer draft. */
final class FeedDraft {
 private final Context c;private final EditText text;private final TextView status;private final SharedPreferences store;private final String owner,key;private boolean silent;
 FeedDraft(Context context,EditText input,LinearLayout parent){c=context;text=input;owner=SessionPreferences.get(c).getString("user_id","");key="text:"+owner;store=c.getSharedPreferences("feed_drafts",0);String saved=owner.isEmpty()?"":store.getString(key,"");if(saved.length()>500)saved=saved.substring(0,500);text.setText(saved);status=NativeSheet.text(c,saved.isEmpty()?"O texto será salvo automaticamente neste aparelho.":"Rascunho recuperado. Selecione novamente os anexos.",12,0xffa99bbb);parent.addView(status);Button discard=new Button(c);discard.setText("Limpar texto");AppStyle.button(discard,false);parent.addView(discard);discard.setOnClickListener(v->{if(active()&&text.isEnabled())text.setText("");});text.addTextChangedListener(new android.text.TextWatcher(){public void beforeTextChanged(CharSequence s,int a,int n,int x){}public void onTextChanged(CharSequence s,int a,int b,int n){if(!silent&&active()){String value=s.toString();if(value.isEmpty())store.edit().remove(key).apply();else store.edit().putString(key,value).apply();status.setText(value.isEmpty()?"Rascunho vazio.":"Texto salvo neste aparelho. Anexos precisam ser selecionados novamente.");}}public void afterTextChanged(android.text.Editable e){}});}
 private boolean active(){return !owner.isEmpty()&&owner.equals(SessionPreferences.get(c).getString("user_id",""));}
 void published(String sent){if(sent.equals(store.getString(key,"")))store.edit().remove(key).apply();silent=true;text.setText("");silent=false;status.setText("Publicado. O texto da próxima publicação será salvo automaticamente.");}
}

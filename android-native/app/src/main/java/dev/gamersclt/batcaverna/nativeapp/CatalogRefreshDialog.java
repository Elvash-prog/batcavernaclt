package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.view.View;
import android.widget.*;
import org.json.*;

/** Read-only catalog search and an explicit metadata review before changing an existing draft. */
final class CatalogRefreshDialog {
 interface Apply {void done(JSONObject data,boolean replace,boolean useCover);}
 interface Source {void search(String term,boolean media,int type,AccountRepository.Callback cb);void details(JSONObject selected,boolean media,int type,AccountRepository.Callback cb);}
 final NativeSheet sheet;NativeSheet reviewSheet;
 private final Context c;private final boolean media;private final Source source;private final Apply applied;private final Runnable added;private final String owner;
 private final EditText query;private final Spinner type;private final Button search;private final TextView state;private final LinearLayout results;private int generation;private boolean loading;
 CatalogRefreshDialog(Context c,JSONObject item,boolean media,Apply applied,Runnable added){this(c,item,media,applied,added,backend(c));}
 CatalogRefreshDialog(Context c,JSONObject item,boolean media,Apply applied,Runnable added,Source source){
  this.c=c;this.media=media;this.applied=applied;this.added=added;this.source=source;owner=SessionPreferences.get(c).getString("user_id","");sheet=new NativeSheet(c,"Buscar dados no catálogo");
  type=NativeSheet.options(c,MediaInput.TYPES);String kind=LibraryCategory.classify(item.optString("tipo"));type.setSelection(kind.equals("anime")?2:kind.equals("serie")?1:0);type.setTag("refresh-type");if(media)sheet.body.addView(type);
  query=NativeSheet.input(c,media?"Buscar filme, série ou anime":"Buscar jogo",100);query.setSingleLine(true);query.setTag("refresh-query");query.setText(item.optString("nome"));sheet.body.addView(query);
  search=button("Buscar no catálogo",false);search.setTag("refresh-search");sheet.body.addView(search);state=NativeSheet.status(c,"",13,NativeTheme.muted(c));state.setTag("refresh-state");sheet.body.addView(state);results=new LinearLayout(c);results.setOrientation(LinearLayout.VERTICAL);sheet.body.addView(results);
  if(!media)sheet.body.addView(SensitiveCover.filter(c,()->{generation++;results.removeAllViews();search.setEnabled(true);}));
  search.setOnClickListener(v->search());query.setImeOptions(android.view.inputmethod.EditorInfo.IME_ACTION_SEARCH);query.setOnEditorActionListener((v,action,event)->{if(action==android.view.inputmethod.EditorInfo.IME_ACTION_SEARCH){search();return true;}return false;});
  query.addTextChangedListener(new android.text.TextWatcher(){public void beforeTextChanged(CharSequence s,int st,int count,int after){}public void afterTextChanged(android.text.Editable s){}public void onTextChanged(CharSequence s,int st,int before,int count){generation++;results.removeAllViews();search.setEnabled(!loading);}});
  type.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener(){public void onNothingSelected(AdapterView<?> p){}public void onItemSelected(AdapterView<?> p,View v,int pos,long id){generation++;results.removeAllViews();search.setEnabled(!loading);}});
  sheet.dialog.setOnDismissListener(d->generation++);sheet.show();
 }
 private static Source backend(Context c){AccountRepository repo=new AccountRepository(c);return new Source(){public void search(String term,boolean media,int type,AccountRepository.Callback cb){if(media)repo.searchMedia(term,type,cb);else repo.searchGames(term,cb);}public void details(JSONObject selected,boolean media,int type,AccountRepository.Callback cb){repo.catalogDetails(selected,media,type,cb);}};}
 private boolean active(){return sheet.dialog.isShowing()&&owner.equals(SessionPreferences.get(c).getString("user_id",""));}
 private void search(){String term=query.getText().toString().trim();if(loading||!active())return;if(term.length()<2){state.setText("Digite ao menos 2 caracteres.");return;}int ticket=++generation,kind=type.getSelectedItemPosition();search.setEnabled(false);results.removeAllViews();state.setText("Buscando…");source.search(term,media,kind,(rows,error)->{if(!active())return;if(ticket!=generation)return;search.setEnabled(true);if(error!=null){state.setText(error);return;}JSONArray visible=media?rows:SensitiveCover.filterRows(c,rows);state.setText(visible==null||visible.length()==0?"Nenhum título encontrado com este filtro.":"");for(int i=0;visible!=null&&i<visible.length();i++){JSONObject row=visible.optJSONObject(i);if(row==null)continue;LinearLayout card=CatalogCard.result(c,row,media,kind,"Conferir dados");card.setTag("refresh-result-"+i);results.addView(card);card.setOnClickListener(v->select(row,kind));}});}
 private void select(JSONObject selected,int kind){if(loading||!active())return;loading=true;generation++;sheet.busy(true);search.setEnabled(false);query.setEnabled(false);type.setEnabled(false);state.setText("Carregando detalhes…");source.details(selected,media,kind,(rows,error)->{loading=false;sheet.busy(false);if(!active())return;search.setEnabled(true);query.setEnabled(true);type.setEnabled(true);if(error!=null){state.setText(error);return;}JSONObject detail=rows==null?null:rows.optJSONObject(0);if(detail==null){state.setText("O catálogo não retornou detalhes. Tente novamente.");return;}state.setText("");review(detail,kind);});}
 private void review(JSONObject selected,int kind){try{
  JSONObject data=CatalogRefreshInput.normalize(selected,media);if(media)data.put("tipo",MediaInput.TYPES[kind]);NativeSheet review=new NativeSheet(c,"Dados encontrados");reviewSheet=review;review.body.addView(CatalogCard.result(c,selected,media,kind,""));
  for(String[] field:new String[][]{{"ano","Ano"},{"generos","Gêneros"},{"tempo_est","Tempo para zerar (h)"},{"steam_appid","Steam App ID"},{"duracao","Duração"},{"onde","Onde assistir"}})if(!data.optString(field[0]).isEmpty())review.body.addView(NativeSheet.text(c,field[1]+": "+data.optString(field[0]),13,NativeTheme.text(c)));
  if(!data.optString("sinopse").isEmpty()){TextView description=NativeSheet.text(c,data.optString("sinopse"),13,NativeTheme.muted(c));description.setMaxLines(8);review.body.addView(description);}
  CheckBox cover=new CheckBox(c);cover.setText("Usar a capa deste resultado");cover.setTag("refresh-use-cover");cover.setTextColor(NativeTheme.text(c));cover.setEnabled(!data.optString("capa").isEmpty());review.body.addView(cover);
  review.footer.setVisibility(View.VISIBLE);for(boolean replace:new boolean[]{false,true}){Button apply=button(replace?"Usar dados do catálogo":"Completar campos vazios",!replace);apply.setTag(replace?"refresh-replace":"refresh-fill");review.footer.addView(apply);apply.setOnClickListener(v->{if(!active())return;applied.done(data,replace,cover.isChecked());review.dialog.dismiss();sheet.dialog.dismiss();});}
  Button another=button("Adicionar este resultado à biblioteca",false);another.setTag("refresh-add");review.body.addView(another);another.setOnClickListener(v->{if(!active())return;new CatalogAddDialog(c,media,kind,selected,added);});review.show();
 }catch(Exception e){state.setText("Não foi possível preparar os detalhes.");}}
 private Button button(String label,boolean primary){Button b=new Button(c);b.setText(label);AppStyle.button(b,primary);return b;}
}

package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.content.res.ColorStateList;
import android.view.View;
import android.widget.*;
import org.json.*;
import java.util.*;
/** Two selection panels in one scroll, with a fixed save footer. */
final class HighlightsDialog {
 static void show(Context c,JSONObject profile,Runnable saved){
  NativeSheet sheet=new NativeSheet(c,"Seus destaques");TextView state=NativeSheet.text(c,"Carregando sua biblioteca…",13,0xffc2add9);sheet.body.addView(state);AccountRepository repo=new AccountRepository(c);
  repo.profileLibrary((items,error)->{
   if(!sheet.dialog.isShowing())return;if(error!=null){state.setText(error);return;}state.setText("Escolha os jogos e as conquistas que aparecem no seu perfil.");
   Set<String> selectedGames=new LinkedHashSet<>();Set<Integer> selectedAchievements=new LinkedHashSet<>();JSONArray oldGames=profile.optJSONArray("jogos_destaque"),oldAchievements=profile.optJSONArray("conquistas_destaque");
   if(oldGames!=null)for(int i=0;i<Math.min(8,oldGames.length());i++)selectedGames.add(oldGames.optString(i));if(oldAchievements!=null)for(int i=0;i<Math.min(4,oldAchievements.length());i++)selectedAchievements.add(oldAchievements.optInt(i,-1));
   List<JSONObject> games=new ArrayList<>();Set<String> validGames=new HashSet<>();for(int i=0;i<items.length();i++){JSONObject game=items.optJSONObject(i);if(game!=null&&"jogos".equals(game.optString("categoria"))){games.add(game);validGames.add(game.optString("nome"));}}Collections.sort(games,(a,b)->a.optString("nome").compareToIgnoreCase(b.optString("nome")));selectedGames.retainAll(validGames);
   final JSONArray achievements;try{achievements=ProfileAchievements.calculate(items);}catch(JSONException e){state.setText("Não foi possível carregar as conquistas.");return;}
   Set<Integer> validAchievements=new HashSet<>();for(int i=0;i<achievements.length();i++){JSONObject a=achievements.optJSONObject(i);if(a!=null&&a.optBoolean("unlocked"))validAchievements.add(a.optInt("id"));}selectedAchievements.retainAll(validAchievements);
   LinearLayout tabs=new LinearLayout(c);sheet.controls.setVisibility(View.VISIBLE);sheet.controls.addView(tabs);Button gameTab=new Button(c),achievementTab=new Button(c);for(Button tab:new Button[]{gameTab,achievementTab}){AppStyle.button(tab,false);tab.setPadding(NativeSheet.dp(c,8),NativeSheet.dp(c,10),NativeSheet.dp(c,8),NativeSheet.dp(c,10));tabs.addView(tab,new LinearLayout.LayoutParams(0,-2,1));}
   LinearLayout gamePanel=new LinearLayout(c);gamePanel.setOrientation(LinearLayout.VERTICAL);sheet.body.addView(gamePanel);LinearLayout achievementPanel=new LinearLayout(c);achievementPanel.setOrientation(LinearLayout.VERTICAL);sheet.body.addView(achievementPanel);achievementPanel.setVisibility(View.GONE);
   EditText search=NativeSheet.input(c,"Buscar na sua biblioteca",100);search.setSingleLine(true);gamePanel.addView(search);CheckBox onlySelected=new CheckBox(c);onlySelected.setText("Mostrar os selecionados");onlySelected.setTextColor(0xffcdbcec);onlySelected.setButtonTintList(ColorStateList.valueOf(0xffb892ff));gamePanel.addView(onlySelected);
   LinearLayout grid=new LinearLayout(c);grid.setOrientation(LinearLayout.VERTICAL);gamePanel.addView(grid);Button more=new Button(c);more.setText("Mostrar mais jogos");AppStyle.button(more,false);gamePanel.addView(more);int[] limit={24};boolean[] saving={false},gameActive={true};
   sheet.footer.setVisibility(View.VISIBLE);TextView feedback=NativeSheet.text(c,"",12,0xffc4b1e8);sheet.footer.addView(feedback);Button save=new Button(c);save.setText("Salvar destaques");AppStyle.button(save,true);AppStyle.icon(save,ActionIcon.TROPHY,0xffffe1a0);sheet.footer.addView(save);
   Runnable counters=()->{gameTab.setText("Jogos "+selectedGames.size()+"/8");achievementTab.setText("Conquistas "+selectedAchievements.size()+"/4");feedback.setText(selectedGames.size()+" de 8 jogos • "+selectedAchievements.size()+" de 4 conquistas");};
   Runnable[] render={null};render[0]=()->{
    grid.removeAllViews();String query=search.getText().toString().trim().toLowerCase(Locale.ROOT);int matches=0,shown=0;
    for(JSONObject game:games){String name=game.optString("nome");if(!name.toLowerCase(Locale.ROOT).contains(query)||onlySelected.isChecked()&&!selectedGames.contains(name))continue;matches++;if(shown++>=limit[0])continue;
     LinearLayout row=CatalogCard.create(c,name,game.optString("capa"));AccountImageLoader.load((ImageView)row.getChildAt(0),game.optString("capa"),game.optString("steam_appid",""));CheckBox check=new CheckBox(c);check.setContentDescription("Destacar "+name);check.setChecked(selectedGames.contains(name));check.setButtonTintList(ColorStateList.valueOf(0xffb28aff));row.addView(check,0);
     check.setOnCheckedChangeListener((button,on)->{if(saving[0])return;if(on&&selectedGames.size()>=8){check.setChecked(false);feedback.setText("Selecione no máximo 8 jogos.");return;}if(on)selectedGames.add(name);else selectedGames.remove(name);counters.run();});row.setOnClickListener(v->{if(!saving[0])check.setChecked(!check.isChecked());});grid.addView(row);
    }
    if(matches==0)grid.addView(NativeSheet.text(c,"Nenhum jogo encontrado.",14,0xffb3a5c2));more.setVisibility(matches>limit[0]?View.VISIBLE:View.GONE);
   };
   more.setOnClickListener(v->{limit[0]+=24;render[0].run();});onlySelected.setOnCheckedChangeListener((b,on)->{limit[0]=24;render[0].run();});search.addTextChangedListener(new android.text.TextWatcher(){public void beforeTextChanged(CharSequence s,int a,int b,int d){}public void afterTextChanged(android.text.Editable e){}public void onTextChanged(CharSequence s,int a,int b,int d){limit[0]=24;render[0].run();}});
   for(int i=0;i<achievements.length();i++){JSONObject achievement=achievements.optJSONObject(i);if(achievement==null||!achievement.optBoolean("unlocked"))continue;int id=achievement.optInt("id");LinearLayout row=new LinearLayout(c);row.setGravity(android.view.Gravity.CENTER_VERTICAL);row.setPadding(NativeSheet.dp(c,8),NativeSheet.dp(c,8),NativeSheet.dp(c,12),NativeSheet.dp(c,8));row.setBackground(AppStyle.shape(row,0xff241d32,16));LinearLayout.LayoutParams rp=new LinearLayout.LayoutParams(-1,-2);rp.setMargins(0,0,0,NativeSheet.dp(c,8));achievementPanel.addView(row,rp);
    CheckBox check=new CheckBox(c);check.setChecked(selectedAchievements.contains(id));check.setButtonTintList(ColorStateList.valueOf(0xffc899ff));check.setContentDescription("Destacar "+achievement.optString("name"));row.addView(check);
    ImageView badge=new ImageView(c);badge.setImageDrawable(new ActionIcon(ActionIcon.TROPHY,0xffffca70));row.addView(badge,new LinearLayout.LayoutParams(NativeSheet.dp(c,30),NativeSheet.dp(c,30)));LinearLayout labels=new LinearLayout(c);labels.setOrientation(LinearLayout.VERTICAL);labels.setPadding(NativeSheet.dp(c,10),0,0,0);row.addView(labels,new LinearLayout.LayoutParams(0,-2,1));labels.addView(NativeSheet.text(c,achievement.optString("name"),14,0xfff0e5ff));labels.addView(NativeSheet.text(c,"Desbloqueada",11,0xffc8a56f));
    check.setOnCheckedChangeListener((b,on)->{if(saving[0])return;if(on&&selectedAchievements.size()>=4){check.setChecked(false);feedback.setText("Selecione no máximo 4 conquistas.");return;}if(on)selectedAchievements.add(id);else selectedAchievements.remove(id);counters.run();});row.setOnClickListener(v->{if(!saving[0])check.setChecked(!check.isChecked());});
   }
   if(validAchievements.isEmpty())achievementPanel.addView(NativeSheet.text(c,"Ainda não há conquistas desbloqueadas.",14,0xffb3a5c2));
   Runnable tabsStyle=()->{AppStyle.button(gameTab,gameActive[0]);AppStyle.button(achievementTab,!gameActive[0]);gameTab.setTextSize(13);achievementTab.setTextSize(13);gamePanel.setVisibility(gameActive[0]?View.VISIBLE:View.GONE);achievementPanel.setVisibility(gameActive[0]?View.GONE:View.VISIBLE);};
   gameTab.setOnClickListener(v->{gameActive[0]=true;tabsStyle.run();});achievementTab.setOnClickListener(v->{gameActive[0]=false;tabsStyle.run();});counters.run();tabsStyle.run();render[0].run();
   save.setOnClickListener(v->{saving[0]=true;enabled(sheet.body,false);save.setEnabled(false);gameTab.setEnabled(false);achievementTab.setEnabled(false);sheet.busy(true);feedback.setText("Salvando destaques…");repo.saveHighlights(new JSONArray(selectedGames),new JSONArray(selectedAchievements),profile.optInt("titulo_destaque_nivel"),(r,e)->{sheet.busy(false);if(!sheet.dialog.isShowing())return;if(e!=null){feedback.setText(e+" Confira o perfil antes de reenviar.");saving[0]=false;enabled(sheet.body,true);save.setEnabled(true);gameTab.setEnabled(true);achievementTab.setEnabled(true);return;}sheet.dialog.dismiss();saved.run();});});
  });sheet.show();
 }
 private static void enabled(View view,boolean active){view.setEnabled(active);if(view instanceof android.view.ViewGroup){android.view.ViewGroup group=(android.view.ViewGroup)view;for(int i=0;i<group.getChildCount();i++)enabled(group.getChildAt(i),active);}}
}

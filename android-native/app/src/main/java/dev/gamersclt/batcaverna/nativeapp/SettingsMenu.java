package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.graphics.Typeface;
import android.view.*;
import android.widget.*;
import java.util.*;
/** Search locates a category without changing any account or device preference. */
final class SettingsMenu extends LinearLayout {
 interface Choice {void open(int tab);}
 static final String[] LABELS={"Conta","Aparência","Notificações","Privacidade","Diagnóstico","Atualizações","Créditos e serviços","Integrações"};
 private static final String[] DESCRIPTIONS={"Acesso, e-mail e sessão.","Tema, imagens e opções da interface.","Alertas no aparelho e preferências da conta.","Amizades, bloqueios e seus dados.","Exportar ou limpar informações técnicas.","Consultar versões e atualizar o aplicativo.","Fornecedores e atribuições do aplicativo.","Steam, RetroAchievements e serviços da coleção."};
 private static final String[] KEYWORDS={"senha email entrar sair perfil segurança","cores fundo foto capa tema claro escuro tamanho cache","avisos mensagens som convites alertas","bloqueados amigos segurança dados","logs erro falhas suporte","versão instalar baixar atualizar","api licenças privacidade créditos fornecedor","steam retro retroachievements igdb tmdb anilist conectar"};
 private final List<View> entries=new ArrayList<>(),groups=new ArrayList<>();private final TextView empty;
 SettingsMenu(Context c,Choice choice){super(c);setTag("settings-menu");setOrientation(VERTICAL);setFocusableInTouchMode(true);
  TextView intro=NativeSheet.text(c,"Encontre o ajuste que procura",22,0xffedf2f8);intro.setTypeface(null,Typeface.BOLD);addView(intro);addView(NativeSheet.text(c,"Busque por um assunto ou escolha uma categoria.",13,0xffbfc8d5));
  EditText search=NativeSheet.input(c,"Buscar nas configurações",100);search.setTag("settings-menu-search");search.setContentDescription("Buscar nas configurações");search.setSingleLine(true);addView(search);
  String[] names={"PESSOAL","CONEXÕES","APLICATIVO E SUPORTE"};int[][] tabs={{0,1,2,3},{7},{4,5,6}};
  for(int group=0;group<names.length;group++){LinearLayout box=new LinearLayout(c);box.setOrientation(VERTICAL);groups.add(box);addView(box);TextView title=NativeSheet.text(c,names[group],10,NativeTheme.accent(c));title.setPadding(0,NativeSheet.dp(c,16),0,NativeSheet.dp(c,8));box.addView(title);
   for(int tab:tabs[group]){LinearLayout row=new LinearLayout(c){public CharSequence getAccessibilityClassName(){return Button.class.getName();}};row.setOrientation(VERTICAL);row.setTag("settings-category-"+tab);row.setFocusable(true);row.setMinimumHeight(NativeSheet.dp(c,72));int pad=NativeSheet.dp(c,14);row.setPadding(pad,pad,pad,pad);row.setBackground(AppStyle.interactive(row,NativeTheme.panel(c),14));row.setContentDescription(LABELS[tab]+". "+DESCRIPTIONS[tab]);TextView label=NativeSheet.text(c,LABELS[tab]+"  ›",16,0xffedf2f8);label.setTypeface(null,Typeface.BOLD);label.setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);row.addView(label);TextView description=NativeSheet.text(c,DESCRIPTIONS[tab],12,0xffbfc8d5);description.setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);row.addView(description);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.setMargins(0,0,0,NativeSheet.dp(c,8));box.addView(row,lp);entries.add(row);row.setOnClickListener(v->choice.open(tab));}
  }
  empty=NativeSheet.text(c,"Nenhuma categoria encontrada. Tente outro termo.",14,0xffbfc8d5);empty.setVisibility(GONE);empty.setAccessibilityLiveRegion(ACCESSIBILITY_LIVE_REGION_POLITE);addView(empty);
  search.addTextChangedListener(new android.text.TextWatcher(){public void beforeTextChanged(CharSequence s,int a,int count,int after){}public void afterTextChanged(android.text.Editable e){}public void onTextChanged(CharSequence s,int a,int before,int count){String[] words=fold(s.toString()).split("\\s+");int visible=0;for(View row:entries){int tab=Integer.parseInt(row.getTag().toString().substring("settings-category-".length()));String haystack=fold(LABELS[tab]+" "+DESCRIPTIONS[tab]+" "+KEYWORDS[tab]);boolean show=true;for(String word:words)if(!haystack.contains(word)){show=false;break;}row.setVisibility(show?VISIBLE:GONE);if(show)visible++;}for(View group:groups){boolean show=false;LinearLayout box=(LinearLayout)group;for(int i=1;i<box.getChildCount();i++)if(box.getChildAt(i).getVisibility()==VISIBLE)show=true;group.setVisibility(show?VISIBLE:GONE);}empty.setVisibility(visible==0?VISIBLE:GONE);}});requestFocus();
 }
 private String fold(String text){return java.text.Normalizer.normalize(text,java.text.Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(new Locale("pt","BR")).trim();}
}

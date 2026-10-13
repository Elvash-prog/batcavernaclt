package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.widget.*;
/** Reference-inspired profile composition. Demo data is clearly labelled. */
public final class ProfileView extends ScrollView {
    private static final int FG=0xfff3f4f8, MUTED=0xff9da9b8, CARD=0xff1c242d, PURPLE=0xff9256eb;
    private final LinearLayout body;
    public ProfileView(Context c){super(c);setFillViewport(true);setVerticalScrollBarEnabled(false);setBackgroundColor(0xff101419);body=new LinearLayout(c);body.setOrientation(LinearLayout.VERTICAL);addView(body,new LayoutParams(-1,-2));build();}
    private void build(){
        LinearLayout hero=new LinearLayout(getContext());hero.setOrientation(LinearLayout.VERTICAL);hero.setPadding(dp(18),dp(24),dp(18),dp(18));GradientDrawable cover=new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{0xff12616c,0xff163744,0xff101419});hero.setBackground(cover);
        TextView badge=label("BATCAVERNA  /  PERFIL",11,0xffa2d6dc);badge.setLetterSpacing(.16f);hero.addView(badge);
        LinearLayout person=new LinearLayout(getContext());person.setGravity(Gravity.CENTER_VERTICAL);ImageView avatar=new ImageView(getContext());avatar.setImageResource(R.drawable.app_logo);avatar.setScaleType(ImageView.ScaleType.CENTER_INSIDE);person.addView(avatar,new LinearLayout.LayoutParams(dp(76),dp(76)));
        LinearLayout details=new LinearLayout(getContext());details.setOrientation(LinearLayout.VERTICAL);details.setPadding(dp(14),0,0,0);TextView name=label("Meu perfil",29,FG);name.setTypeface(null,Typeface.BOLD);details.addView(name);details.addView(label("Prévia do novo aplicativo",12,MUTED));person.addView(details,new LinearLayout.LayoutParams(0,-2,1));LinearLayout.LayoutParams pp=new LinearLayout.LayoutParams(-1,-2);pp.setMargins(0,dp(22),0,dp(18));hero.addView(person,pp);
        LinearLayout counts=new LinearLayout(getContext());counts.addView(tile("JOGOS","—"),weight());counts.addView(tile("FILMES","—"),weight());counts.addView(tile("SÉRIES","—"),weight());hero.addView(counts);body.addView(hero);
        LinearLayout content=new LinearLayout(getContext());content.setOrientation(LinearLayout.VERTICAL);content.setPadding(dp(18),dp(12),dp(18),dp(26));body.addView(content);
        LinearLayout level=new LinearLayout(getContext());level.setGravity(Gravity.CENTER_VERTICAL);TextView lv=label("LV\n—",24,FG);lv.setGravity(Gravity.CENTER);GradientDrawable frame=round(0xff241c36,18);frame.setStroke(dp(3),PURPLE);lv.setBackground(frame);level.addView(lv,new LinearLayout.LayoutParams(dp(68),dp(72)));
        TextView social=label("AMIGOS          CONQUISTAS\n—                     —",13,MUTED);social.setGravity(Gravity.CENTER);social.setBackground(round(CARD,18));LinearLayout.LayoutParams sp=new LinearLayout.LayoutParams(0,dp(72),1);sp.setMargins(dp(12),0,0,0);level.addView(social,sp);content.addView(level);
        TextView progress=label("PROGRESSO DO NÍVEL",12,MUTED);progress.setLetterSpacing(.12f);progress.setPadding(0,dp(18),0,dp(10));content.addView(progress);ProgressBar bar=new ProgressBar(getContext(),null,android.R.attr.progressBarStyleHorizontal);bar.setMax(100);bar.setProgress(0);bar.setProgressTintList(android.content.res.ColorStateList.valueOf(PURPLE));content.addView(bar,new LinearLayout.LayoutParams(-1,dp(8)));
        TextView notice=label("Prévia visual • estatísticas reais ainda não carregadas",11,MUTED);notice.setPadding(0,dp(10),0,dp(18));content.addView(notice);
        LinearLayout categories=new LinearLayout(getContext());categories.addView(category("JOGOS",0xff315768),weight());categories.addView(category("FILMES",0xff513a69),weight());categories.addView(category("SÉRIES",0xff395c50),weight());content.addView(categories);
        TextView heading=label("EM ANDAMENTO",14,0xffef9254);heading.setLetterSpacing(.14f);heading.setTypeface(null,Typeface.BOLD);heading.setPadding(0,dp(26),0,dp(16));content.addView(heading);
        HorizontalScrollView shelf=new HorizontalScrollView(getContext());shelf.setHorizontalScrollBarEnabled(false);LinearLayout row=new LinearLayout(getContext());String[] games={"HADES","TUNIC","STRAY","SHADOWS"};int[] colors={0xff753d43,0xff396358,0xff8b5939,0xff41426b};for(int i=0;i<4;i++){LinearLayout card=new LinearLayout(getContext());card.setOrientation(LinearLayout.VERTICAL);TextView art=label(games[i],17,FG);art.setGravity(Gravity.BOTTOM|Gravity.CENTER_HORIZONTAL);art.setTypeface(null,Typeface.BOLD);art.setPadding(dp(6),0,dp(6),dp(16));art.setBackground(new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{colors[i],0xff17222e}));card.addView(art,new LinearLayout.LayoutParams(dp(98),dp(142)));TextView caption=label("Exemplo visual",10,MUTED);caption.setPadding(0,dp(8),0,0);card.addView(caption);LinearLayout.LayoutParams cp=new LinearLayout.LayoutParams(dp(98),-2);cp.setMargins(0,0,dp(10),0);row.addView(card,cp);}shelf.addView(row);content.addView(shelf);
        Button exit=new Button(getContext());exit.setText("Sair da conta");exit.setAllCaps(false);exit.setOnClickListener(v->((MainActivity)getContext()).logout());LinearLayout.LayoutParams ep=new LinearLayout.LayoutParams(-1,-2);ep.setMargins(0,dp(22),0,0);content.addView(exit,ep);
    }
    private LinearLayout category(String name,int color){LinearLayout b=new LinearLayout(getContext());b.setOrientation(LinearLayout.VERTICAL);TextView art=label(name.substring(0,1),28,FG);art.setGravity(Gravity.CENTER);art.setBackground(round(color,14));b.addView(art,new LinearLayout.LayoutParams(-1,dp(66)));TextView t=label(name,11,FG);t.setPadding(0,dp(8),0,0);b.addView(t);return b;}
    private TextView tile(String h,String n){TextView t=label(n+"  "+h,12,FG);t.setGravity(Gravity.CENTER);t.setBackground(round(CARD,12));t.setPadding(dp(4),dp(12),dp(4),dp(12));return t;}
    private LinearLayout.LayoutParams weight(){LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,-2,1);p.setMargins(0,0,dp(6),0);return p;}
    private TextView label(String s,int size,int color){TextView t=new TextView(getContext());t.setText(s);t.setTextSize(size);t.setTextColor(color);t.setIncludeFontPadding(false);return t;}
    private GradientDrawable round(int color,int radius){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));return d;}
    private int dp(int v){return Math.round(v*getResources().getDisplayMetrics().density);}
}

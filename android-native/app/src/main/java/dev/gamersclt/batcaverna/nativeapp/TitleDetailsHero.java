package dev.gamersclt.batcaverna.nativeapp;

import android.content.Context;
import android.graphics.Typeface;
import android.view.Gravity;
import android.widget.*;
import org.json.JSONObject;

/** Flexible title header: keep the full title readable with large system fonts. */
final class TitleDetailsHero {
 static LinearLayout create(Context c,JSONObject item,boolean media,boolean readOnly){
  boolean stacked=c.getResources().getConfiguration().screenWidthDp<360||c.getResources().getConfiguration().fontScale>1.3f;
  LinearLayout hero=new LinearLayout(c);hero.setTag("title-details-hero");hero.setOrientation(stacked?LinearLayout.VERTICAL:LinearLayout.HORIZONTAL);hero.setGravity(Gravity.CENTER_VERTICAL);
  int pad=NativeSheet.dp(c,14);hero.setPadding(pad,pad,pad,pad);hero.setBackground(AppStyle.surface(hero,NativeTheme.panelDark(c),20));
  FrameLayout artwork=new FrameLayout(c);artwork.setTag("title-details-artwork");artwork.setBackground(AppStyle.shape(artwork,NativeTheme.panelDark(c),14));artwork.setClipToOutline(true);
  TextView placeholder=NativeSheet.text(c,media?"▶":"🎮",32,NativeTheme.accent(c));placeholder.setGravity(Gravity.CENTER);artwork.addView(placeholder,new FrameLayout.LayoutParams(-1,-1));
  ImageView art=new ImageView(c);art.setScaleType(ImageView.ScaleType.FIT_CENTER);art.setContentDescription("Capa de "+value(item,"nome","título"));artwork.addView(art,new FrameLayout.LayoutParams(-1,-1));
  LinearLayout.LayoutParams imageLayout=new LinearLayout.LayoutParams(NativeSheet.dp(c,stacked?104:88),NativeSheet.dp(c,stacked?156:132));imageLayout.gravity=Gravity.CENTER_HORIZONTAL;hero.addView(artwork,imageLayout);MobileArtworkLoader.load(art,item,media,true);
  LinearLayout heading=new LinearLayout(c);heading.setOrientation(LinearLayout.VERTICAL);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(stacked?-1:0,-2,stacked?0:1);lp.setMargins(stacked?0:pad,stacked?pad:0,0,0);hero.addView(heading,lp);
  TextView eyebrow=NativeSheet.text(c,readOnly?"COLEÇÃO DESTE PERFIL":media?"NA SUA COLEÇÃO":"NA SUA BIBLIOTECA",10,NativeTheme.accent(c));eyebrow.setLetterSpacing(.06f);heading.addView(eyebrow);
  TextView title=NativeSheet.text(c,value(item,"nome","Sem título"),22,0xfff3f4f8);title.setTypeface(null,Typeface.BOLD);title.setLineSpacing(0,1.05f);title.setTag("title-details-name");heading.addView(title);
  String platform=value(item,media?"onde":"plataforma","");String year=value(item,"ano","");String metadata=platform+(platform.isEmpty()||year.isEmpty()?"":" · ")+year;
  if(!metadata.isEmpty())heading.addView(NativeSheet.text(c,metadata,12,0xffbfc8d5));
  LinearLayout.LayoutParams outer=new LinearLayout.LayoutParams(-1,-2);outer.setMargins(0,0,0,NativeSheet.dp(c,16));hero.setLayoutParams(outer);return hero;
 }
 private static String value(JSONObject item,String key,String fallback){return item.isNull(key)?fallback:item.optString(key,fallback).trim();}
}

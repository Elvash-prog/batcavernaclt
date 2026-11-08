package dev.gamersclt.batcaverna.nativeapp;

import android.content.Context;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.widget.*;
import org.json.JSONObject;

/** Account artwork stays decorative; the greeting and actions remain readable. */
final class DashboardBanner extends FrameLayout {
 final TextView level;
 final ProgressBar progress;
 DashboardBanner(Context c,JSONObject profile,Runnable browse){
  super(c);setTag("dashboard-banner");int pad=NativeSheet.dp(c,20);
  GradientDrawable surface=new GradientDrawable(GradientDrawable.Orientation.TL_BR,new int[]{NativeTheme.blend(NativeTheme.panel(c),NativeTheme.accent(c),.23f),NativeTheme.panelDark(c)});surface.setCornerRadius(NativeSheet.dp(c,24));surface.setStroke(NativeSheet.dp(c,1),NativeTheme.soft(c));setBackground(surface);setClipToOutline(true);
  ImageView artwork=new ImageView(c);artwork.setScaleType(ImageView.ScaleType.CENTER_CROP);artwork.setAlpha(.15f);artwork.setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);addView(artwork,new FrameLayout.LayoutParams(-1,-1));if(profile!=null)AccountImageLoader.load(artwork,profile.optString("banner_url",""));
  LinearLayout body=new LinearLayout(c);body.setOrientation(LinearLayout.VERTICAL);body.setPadding(pad,pad,pad,pad);addView(body,new FrameLayout.LayoutParams(-1,-2));
  TextView eyebrow=NativeSheet.text(c,"SEU UNIVERSO, NO SEU RITMO",10,0xffd7c9ff);body.addView(eyebrow);
  boolean stacked=c.getResources().getConfiguration().fontScale>1.3f||c.getResources().getConfiguration().screenWidthDp<360;
  LinearLayout heading=new LinearLayout(c);heading.setOrientation(stacked?LinearLayout.VERTICAL:LinearLayout.HORIZONTAL);heading.setGravity(Gravity.CENTER_VERTICAL);body.addView(heading);
  String name=profile==null||profile.isNull("nome")?"":profile.optString("nome").trim();TextView title=NativeSheet.text(c,name.isEmpty()?"O que vamos explorar hoje?":"Olá, "+name,27,0xfff3f4f8);title.setTag("dashboard-greeting");title.setTypeface(null,Typeface.BOLD);heading.addView(title,new LinearLayout.LayoutParams(stacked?-1:0,-2,stacked?0:1));
  ImageView avatar=new ImageView(c);avatar.setImageResource(R.drawable.app_logo);avatar.setScaleType(ImageView.ScaleType.CENTER_CROP);avatar.setBackground(AppStyle.shape(avatar,NativeTheme.soft(c),16));avatar.setClipToOutline(true);avatar.setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);LinearLayout.LayoutParams ap=new LinearLayout.LayoutParams(NativeSheet.dp(c,48),NativeSheet.dp(c,48));ap.setMargins(stacked?0:NativeSheet.dp(c,12),stacked?NativeSheet.dp(c,10):0,0,0);heading.addView(avatar,ap);if(profile!=null)AccountImageLoader.load(avatar,profile.optString("avatar_url",""));
  body.addView(NativeSheet.text(c,"Escolha uma história para continuar hoje.",13,0xffcbd0df));
  level=NativeSheet.text(c,"Seu espaço de jogos e histórias",12,0xffd7c9ff);body.addView(level);
  progress=new ProgressBar(c,null,android.R.attr.progressBarStyleHorizontal);progress.setMax(100);progress.setProgressTintList(android.content.res.ColorStateList.valueOf(NativeTheme.accent(c)));progress.setVisibility(GONE);body.addView(progress,new LinearLayout.LayoutParams(-1,NativeSheet.dp(c,6)));
  Button explore=new Button(c);explore.setText("Explorar minha coleção");explore.setTag("dashboard-explore");AppStyle.button(explore,true);explore.setMinHeight(NativeSheet.dp(c,48));explore.setOnClickListener(v->browse.run());LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.setMargins(0,NativeSheet.dp(c,12),0,0);body.addView(explore,lp);
  LinearLayout.LayoutParams outer=new LinearLayout.LayoutParams(-1,-2);outer.setMargins(0,NativeSheet.dp(c,8),0,NativeSheet.dp(c,14));setLayoutParams(outer);
 }
}

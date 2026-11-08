package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.view.View;
import android.widget.*;
/** Collapsed fields remain attached so opening the section never resets a draft. */
final class OptionalSection extends LinearLayout {
 final LinearLayout body;private final Button toggle;private final String title;
 OptionalSection(Context c,String title,String description){super(c);this.title=title;setOrientation(VERTICAL);setTag("catalog-optional");toggle=new Button(c);AppStyle.button(toggle,false);toggle.setTag("catalog-optional-toggle");addView(toggle,new LayoutParams(-1,-2));TextView hint=NativeSheet.text(c,description,12,0xffbfc8d5);addView(hint);body=new LinearLayout(c);body.setOrientation(VERTICAL);body.setTag("catalog-optional-fields");addView(body);setExpanded(false);toggle.setOnClickListener(v->setExpanded(body.getVisibility()!=VISIBLE));}
 void setExpanded(boolean expanded){body.setVisibility(expanded?VISIBLE:GONE);toggle.setText((expanded?"▾ ":"▸ ")+title);toggle.setContentDescription(title+(expanded?", expandido":", recolhido"));toggle.setSelected(expanded);}
}

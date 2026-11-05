package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.view.View;
import android.widget.*;
final class ChatDeliveryStatus extends LinearLayout {
 final TextView label;final Button retry;
 ChatDeliveryStatus(Context c,Runnable resend){super(c);setGravity(android.view.Gravity.CENTER_VERTICAL);label=NativeSheet.text(c,"",12,0xffc6b8ff);label.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);addView(label,new LayoutParams(0,-2,1));retry=new Button(c);retry.setText("Tentar novamente");AppStyle.button(retry,false);retry.setOnClickListener(v->resend.run());addView(retry);clear();}
 void clear(){setVisibility(GONE);retry.setVisibility(GONE);}
 void sending(){setVisibility(VISIBLE);label.setText("Enviando mensagem…");retry.setVisibility(GONE);}
 void failed(){setVisibility(VISIBLE);label.setText("Envio sem confirmação. Seu texto foi mantido.");retry.setVisibility(VISIBLE);}
 void sent(){setVisibility(VISIBLE);label.setText("Mensagem enviada");retry.setVisibility(GONE);}
}

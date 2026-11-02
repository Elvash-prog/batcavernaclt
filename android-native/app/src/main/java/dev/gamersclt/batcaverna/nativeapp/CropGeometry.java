package dev.gamersclt.batcaverna.nativeapp;
/** The same overflow percentages drive preview, avatar export and saved cover metadata. */
final class CropGeometry {
 float x=50,y=50,zoom=100;
 static float clamp(float value,float min,float max){return Float.isNaN(value)||Float.isInfinite(value)?min:Math.max(min,Math.min(max,value));}
 void position(float horizontal,float vertical,float percent){x=clamp(horizontal,0,100);y=clamp(vertical,0,100);zoom=clamp(percent,100,250);}
 float scale(float w,float h,float iw,float ih){return Math.max(w/iw,h/ih)*zoom/100;}
 float left(float w,float iw,float scale){return (w-iw*scale)*x/100;}
 float top(float h,float ih,float scale){return (h-ih*scale)*y/100;}
 void move(float w,float h,float iw,float ih,float dx,float dy){float scale=scale(w,h,iw,ih),ow=iw*scale-w,oh=ih*scale-h;x=ow>0?clamp(x-dx/ow*100,0,100):50;y=oh>0?clamp(y-dy/oh*100,0,100):50;}
 void zoomAt(float w,float h,float iw,float ih,float percent,float px,float py){float old=scale(w,h,iw,ih),sx=(px-left(w,iw,old))/old,sy=(py-top(h,ih,old))/old;zoom=clamp(percent,100,250);float scale=scale(w,h,iw,ih),ow=iw*scale-w,oh=ih*scale-h;x=ow>0?clamp((sx*scale-px)/ow*100,0,100):50;y=oh>0?clamp((sy*scale-py)/oh*100,0,100):50;}
}

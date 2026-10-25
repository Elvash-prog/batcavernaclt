package dev.gamersclt.batcaverna.nativeapp;
import android.graphics.*;
import android.graphics.drawable.Drawable;
/** Crisp code-drawn icons, independent of the phone's emoji font. */
final class ActionIcon extends Drawable {
 static final int HEART=0,COMMENT=1,TRASH=2,REPLY=3,STICKER=4,SEND=5,IMAGE=6,TROPHY=7,COPY=8,CHECK=9,BELL=10,SEARCH=11;
 private final int kind;private final Paint paint=new Paint(3);private final int color;
 ActionIcon(int kind,int color){this.kind=kind;this.color=color;}
 public void draw(Canvas c){c.save();Rect b=getBounds();c.translate(b.left,b.top);c.scale(b.width()/24f,b.height()/24f);paint.setColor(color);paint.setStyle(Paint.Style.STROKE);paint.setStrokeWidth(1.8f);paint.setStrokeCap(Paint.Cap.ROUND);paint.setStrokeJoin(Paint.Join.ROUND);Path p=new Path();
  switch(kind){
   case HEART:p.moveTo(12,21);p.cubicTo(9,18,2,13,2,7);p.cubicTo(2,1,9,1,12,6);p.cubicTo(15,1,22,1,22,7);p.cubicTo(22,13,15,18,12,21);c.drawPath(p,paint);break;
   case COMMENT:c.drawRoundRect(3,3,21,18,4,4,paint);p.moveTo(6,18);p.lineTo(6,22);p.lineTo(11,18);c.drawPath(p,paint);c.drawLine(7,8,17,8,paint);c.drawLine(7,12,14,12,paint);break;
   case TRASH:c.drawLine(4,6,20,6,paint);c.drawRoundRect(6,6,18,21,2,2,paint);c.drawLine(9,3,15,3,paint);c.drawLine(10,10,10,17,paint);c.drawLine(14,10,14,17,paint);break;
   case REPLY:p.moveTo(10,5);p.lineTo(3,11);p.lineTo(10,17);p.moveTo(3,11);p.cubicTo(15,9,20,12,21,20);c.drawPath(p,paint);break;
   case STICKER:c.drawRoundRect(3,3,21,21,5,5,paint);c.drawCircle(8,9,.6f,paint);c.drawCircle(16,9,.6f,paint);c.drawArc(7,10,17,17,10,160,false,paint);break;
   case SEND:p.moveTo(3,3);p.lineTo(22,12);p.lineTo(3,21);p.lineTo(7,12);p.close();c.drawPath(p,paint);c.drawLine(7,12,15,12,paint);break;
   case IMAGE:c.drawRoundRect(3,3,21,21,3,3,paint);c.drawCircle(8,8,2,paint);p.moveTo(4,18);p.lineTo(10,12);p.lineTo(14,16);p.lineTo(18,11);p.lineTo(21,14);c.drawPath(p,paint);break;
   case TROPHY:c.drawRoundRect(7,3,17,15,2,2,paint);c.drawArc(2,4,10,12,90,180,false,paint);c.drawArc(14,4,22,12,270,180,false,paint);c.drawLine(12,15,12,21,paint);c.drawLine(8,21,16,21,paint);break;
   case CHECK:p.moveTo(4,12);p.lineTo(9,17);p.lineTo(20,6);c.drawPath(p,paint);break;
   case BELL:p.moveTo(5,16);p.lineTo(7,13);p.lineTo(7,9);p.cubicTo(7,2,17,2,17,9);p.lineTo(17,13);p.lineTo(19,16);p.close();c.drawPath(p,paint);c.drawArc(9,16,15,22,0,180,false,paint);c.drawLine(12,2,12,4,paint);break;
   case SEARCH:c.drawCircle(10,10,6,paint);c.drawLine(14.5f,14.5f,21,21,paint);break;
   case COPY:c.drawRoundRect(7,7,21,21,2,2,paint);p.moveTo(3,16);p.lineTo(3,3);p.lineTo(16,3);c.drawPath(p,paint);break;
  }c.restore();
 }
 public void setAlpha(int a){paint.setAlpha(a);}public void setColorFilter(ColorFilter f){paint.setColorFilter(f);}public int getOpacity(){return PixelFormat.TRANSLUCENT;}
}

package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.graphics.*;
import android.view.View;
final class NavIconView extends View {
 private final int type;private int color=0xff929caf;private final Paint p=new Paint(3);
 NavIconView(Context c,int type){super(c);this.type=type;setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);}
 void color(int c){color=c;invalidate();}
 protected void onDraw(Canvas canvas){super.onDraw(canvas);canvas.save();canvas.translate((getWidth()-24*getResources().getDisplayMetrics().density)/2,(getHeight()-24*getResources().getDisplayMetrics().density)/2);canvas.scale(getResources().getDisplayMetrics().density,getResources().getDisplayMetrics().density);p.setColor(color);p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(1.8f);p.setStrokeCap(Paint.Cap.ROUND);p.setStrokeJoin(Paint.Join.ROUND);
 Path path=new Path();
 if(type==0){path.moveTo(3,11);path.lineTo(12,3);path.lineTo(21,11);path.moveTo(5,10);path.lineTo(5,21);path.lineTo(10,21);path.lineTo(10,15);path.lineTo(14,15);path.lineTo(14,21);path.lineTo(19,21);path.lineTo(19,10);canvas.drawPath(path,p);}
 if(type==1){canvas.drawRoundRect(2,6,22,19,4,4,p);canvas.drawLine(6,12,12,12,p);canvas.drawLine(9,9,9,15,p);canvas.drawCircle(17,10,0.7f,p);canvas.drawCircle(19,14,0.7f,p);}
 if(type==2){canvas.drawCircle(9,7,3,p);canvas.drawArc(2,13,16,25,180,180,false,p);canvas.drawArc(13,4,21,12,260,180,false,p);canvas.drawArc(13,14,23,24,250,110,false,p);}
 if(type==3){canvas.drawRoundRect(3,3,21,18,4,4,p);path.moveTo(6,18);path.lineTo(6,22);path.lineTo(11,18);canvas.drawPath(path,p);canvas.drawLine(7,8,17,8,p);canvas.drawLine(7,12,14,12,p);}
 if(type==4){canvas.drawCircle(12,8,4,p);canvas.drawArc(3,15,21,29,180,180,false,p);}
 if(type==5){canvas.drawRoundRect(3,5,21,21,2,2,p);canvas.drawLine(3,10,21,10,p);canvas.drawLine(6,5,10,10,p);canvas.drawLine(13,5,17,10,p);path.moveTo(10,13);path.lineTo(15,16);path.lineTo(10,19);path.close();canvas.drawPath(path,p);}
 if(type==8){path.moveTo(5,17);path.lineTo(7,14);path.lineTo(7,9);path.cubicTo(7,2,17,2,17,9);path.lineTo(17,14);path.lineTo(19,17);path.close();canvas.drawPath(path,p);canvas.drawArc(10,18,14,22,0,180,false,p);canvas.drawLine(12,2,12,4,p);}
 // Small colored accents keep the icon recognizable without relying on emoji glyphs.
 p.setStyle(Paint.Style.FILL);p.setColor(type==1||type==3?0xff88d9ef:type==5?0xffffa0b1:type==8?0xffffd086:0xffbc9bff);
 if(type==1){canvas.drawCircle(17,10,1.1f,p);p.setColor(0xffff9dad);canvas.drawCircle(19,14,1.1f,p);}
 if(type==3)canvas.drawRoundRect(7,7.5f,17,8.5f,.5f,.5f,p);
 if(type==5){Path play=new Path();play.moveTo(10.5f,13.7f);play.lineTo(14,16);play.lineTo(10.5f,18.3f);play.close();canvas.drawPath(play,p);}
 if(type==4)canvas.drawCircle(12,8,1.5f,p);
 if(type==0)canvas.drawRoundRect(10.8f,16,13.2f,21,.5f,.5f,p);
 if(type==8)canvas.drawCircle(12,20,1,p);
 canvas.restore();}
}

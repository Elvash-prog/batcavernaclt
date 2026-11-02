package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.net.Uri;
import android.graphics.*;
import java.io.*;
final class ProfileImages {
 static Bitmap decode(Context c,Uri uri)throws IOException{
  byte[] source;try(InputStream in=c.getContentResolver().openInputStream(uri);ByteArrayOutputStream out=new ByteArrayOutputStream()){if(in==null)throw new IOException("Não foi possível abrir a foto.");byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1){if(out.size()+n>10*1024*1024)throw new IOException("Escolha uma imagem de até 10 MB.");out.write(b,0,n);}source=out.toByteArray();}
  BitmapFactory.Options options=new BitmapFactory.Options();options.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(source,0,source.length,options);if(options.outWidth<=0||options.outHeight<=0)throw new IOException("Imagem inválida.");options.inSampleSize=1;while(options.outWidth/options.inSampleSize>1600||options.outHeight/options.inSampleSize>1600)options.inSampleSize*=2;options.inJustDecodeBounds=false;Bitmap bitmap=BitmapFactory.decodeByteArray(source,0,source.length,options);if(bitmap==null)throw new IOException("Imagem inválida.");
  if(android.os.Build.VERSION.SDK_INT>=24){try{android.media.ExifInterface exif=new android.media.ExifInterface(new ByteArrayInputStream(source));int orientation=exif.getAttributeInt(android.media.ExifInterface.TAG_ORIENTATION,1);Matrix m=new Matrix();switch(orientation){case 2:m.setScale(-1,1);break;case 3:m.setRotate(180);break;case 4:m.setScale(1,-1);break;case 5:m.setRotate(90);m.postScale(-1,1);break;case 6:m.setRotate(90);break;case 7:m.setRotate(-90);m.postScale(-1,1);break;case 8:m.setRotate(-90);break;}if(!m.isIdentity()){Bitmap upright=Bitmap.createBitmap(bitmap,0,0,bitmap.getWidth(),bitmap.getHeight(),m,true);if(upright!=bitmap)bitmap.recycle();bitmap=upright;}}catch(IOException ignored){}}
  return bitmap;
 }
 static Bitmap crop(Bitmap bitmap,int width,int height,float x,float y,float zoom){
  CropGeometry crop=new CropGeometry();crop.position(x,y,zoom);float scale=crop.scale(width,height,bitmap.getWidth(),bitmap.getHeight());Matrix transform=new Matrix();transform.setScale(scale,scale);transform.postTranslate(crop.left(width,bitmap.getWidth(),scale),crop.top(height,bitmap.getHeight(),scale));Bitmap output=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888);Canvas canvas=new Canvas(output);canvas.drawColor(0xff151c27);canvas.drawBitmap(bitmap,transform,new Paint(Paint.FILTER_BITMAP_FLAG));return output;
 }

}

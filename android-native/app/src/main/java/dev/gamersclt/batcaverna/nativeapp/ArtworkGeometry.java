package dev.gamersclt.batcaverna.nativeapp;
/** Aspect ratios are width / height, matching image dimensions and SwiftUI. */
final class ArtworkGeometry {
 static final float PORTRAIT=2f/3f,LANDSCAPE=16f/9f;
 static int height(int width,float widthToHeight){
  if(!Float.isFinite(widthToHeight)||widthToHeight<=0)throw new IllegalArgumentException("Invalid artwork aspect ratio");
  return Math.max(1,Math.round(Math.max(0,width)/widthToHeight));
 }
}

package dev.gamersclt.batcaverna.nativeapp;
public final class ImageSessionPolicy {
 public static boolean accepts(String owner,String current,boolean privateImage,String usedToken,String token){return owner.equals(current)&&(!privateImage||!owner.isEmpty()&&!usedToken.isEmpty()&&usedToken.equals(token));}
}

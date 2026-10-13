package dev.gamersclt.batcaverna.nativeapp;
public final class CoverEditPolicy {
 public static boolean allowed(String value,String original,String user,String base){if(value.equals(original)||value.isEmpty())return true;if(CoverPolicy.publicUrl(value))return true;String prefix=base+"/storage/v1/object/public/avatars/"+user+"/";return !user.isEmpty()&&value.startsWith(prefix)&&value.substring(prefix.length()).matches("[a-zA-Z0-9-]+\\.(jpg|png|webp)");}
}

package dev.gamersclt.batcaverna.nativeapp;
final class GroupInput {
 static String name(String value){String v=value==null?"":value.trim();if(v.length()<2||v.length()>60||hasControl(v))throw new IllegalArgumentException("Use um nome entre 2 e 60 caracteres.");return v;}
 private static boolean hasControl(String v){for(int i=0;i<v.length();i++)if(Character.isISOControl(v.charAt(i)))return true;return false;}
 static String message(String value){String v=value==null?"":value.trim();if(v.isEmpty()||v.length()>4000)throw new IllegalArgumentException("Escreva entre 1 e 4.000 caracteres.");return v;}
}

package dev.gamersclt.batcaverna.nativeapp;

/** Normalizes a public directory search without accepting PostgREST syntax. */
final class FriendSearchInput {
 static String term(String value){
  String q=value==null?"":value.trim();
  if(q.startsWith("@"))q=q.substring(1).trim();
  if(q.length()<2||q.length()>80)throw new IllegalArgumentException("Digite entre 2 e 80 caracteres: nome, @usuário ou código.");
  return q;
 }
 static String filter(String value){
  String clean=term(value).replaceAll("[^\\p{L}\\p{N} @-]", " ").replaceAll("\\s+", " ").trim();
  if(clean.length()<2)throw new IllegalArgumentException("Digite pelo menos duas letras ou números.");
  return clean;
 }
 static boolean current(int request,int revision,String owner,String active,boolean showing){return showing&&request==revision&&!owner.isEmpty()&&owner.equals(active);}
}

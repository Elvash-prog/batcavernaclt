package dev.gamersclt.batcaverna.nativeapp;
import java.text.Normalizer;
import java.util.Locale;
public final class LibraryStatus {
 private static final java.util.regex.Pattern MARKS=java.util.regex.Pattern.compile("\\p{M}");
 private static final java.util.LinkedHashMap<String,String> GROUPS=new java.util.LinkedHashMap<>(64,.75f,true);
 public static synchronized String group(String status,boolean media){String key=(media?"m:":"g:")+(status==null?"":status),hit=GROUPS.get(key);if(hit!=null)return hit;String value=classify(status,media);GROUPS.put(key,value);if(GROUPS.size()>64)GROUPS.remove(GROUPS.keySet().iterator().next());return value;}
 private static String classify(String status,boolean media){String s=MARKS.matcher(Normalizer.normalize(status==null?"":status,Normalizer.Form.NFD)).replaceAll("").toLowerCase(Locale.ROOT);if(media){if(s.contains("favorit"))return "Favoritos";if(s.contains("assistido")||s.contains("concluid"))return "Assistidos";if(s.contains("assistindo")||s.contains("maraton"))return "Assistindo";if(s.contains("para assistir")||s.contains("pretendo")||s.contains("backlog"))return "Para assistir";}else{if(s.contains("platina")||s.contains("100%"))return "Platinados";if(s.contains("zerado")||s.contains("finalizado"))return "Zerados";if(s.contains("jogando agora"))return "Jogando agora";if(s.contains("progresso")||s.contains("jogando"))return "Em progresso";if(s.contains("backlog")||s.contains("pretendo"))return "Backlog";if(s.contains("wishlist"))return "Wishlist";if(s.contains("biblioteca steam"))return "Biblioteca Steam";}if(s.contains("pausad"))return "Pausados";if(s.contains("abandon"))return "Abandonados";return "Outros";}
 public static boolean finished(String status,boolean media){String g=group(status,media);return media?(g.equals("Assistidos")||g.equals("Favoritos")):(g.equals("Zerados")||g.equals("Platinados"));}
 public static String[] order(boolean media){return media?new String[]{"Assistindo","Para assistir","Assistidos","Favoritos","Pausados","Abandonados","Outros"}:new String[]{"Jogando agora","Em progresso","Backlog","Zerados","Platinados","Wishlist","Biblioteca Steam","Pausados","Abandonados","Outros"};}
}

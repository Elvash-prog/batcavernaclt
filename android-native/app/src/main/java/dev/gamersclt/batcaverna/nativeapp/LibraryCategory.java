package dev.gamersclt.batcaverna.nativeapp;
import java.util.Locale;
/** Same classification order as the site: anime, series, then film. */
public final class LibraryCategory {
 public static String classify(String type){String t=type==null?"":type.toLowerCase(Locale.ROOT);if(t.contains("anime")||t.contains("🍥"))return "anime";if(t.contains("série")||t.contains("serie")||t.contains("📺"))return "serie";return "filme";}
 public static String filter(int index){
  if(index==0)return "";
  String noAnime="tipo.not.ilike.*anime*,tipo.not.ilike.*🍥*";
  String series="or(tipo.ilike.*serie*,tipo.ilike.*série*,tipo.ilike.*📺*)";
  if(index==3)return "or=(tipo.ilike.*anime*,tipo.ilike.*🍥*)";
  if(index==2)return "and=("+noAnime+","+series+")";
  if(index==1)return "or=(tipo.is.null,and("+noAnime+",tipo.not.ilike.*serie*,tipo.not.ilike.*série*,tipo.not.ilike.*📺*))";
  throw new IllegalArgumentException("Categoria inválida");
 }
}

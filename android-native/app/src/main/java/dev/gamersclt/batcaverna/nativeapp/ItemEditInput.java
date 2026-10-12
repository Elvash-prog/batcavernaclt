package dev.gamersclt.batcaverna.nativeapp;
public final class ItemEditInput {
 public static final String[] GAME_STATUS={"🎮 Em Progresso","⏸️ Pausado","📌 Backlog","🧪 Simulando","✅ Zerado","🏆 100% (Platina)","❌ Abandonado","⌛ Wishlist","🟦 Biblioteca Steam"};
 public static final String[] MEDIA_STATUS={"📺 Assistindo","⏸️ Pausado","⏳ Para Assistir","🍿 Maratonando","✅ Assistido","❤️ Favorito","❌ Abandonado"};
 public static final String[] RATINGS={"Sem avaliação","💎 Lenda (GOTY)","⭐⭐⭐⭐⭐ Obra-prima","⭐⭐⭐⭐½ Excelente","⭐⭐⭐⭐ Muito bom","⭐⭐⭐½ Bom","⭐⭐⭐ Ok","⭐⭐ Fraco","⭐ Ruim","🤔 A considerar"};
 public static boolean validId(String id){return id!=null&&(id.matches("[1-9][0-9]{0,18}")||id.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"));}
 public static void validate(String id,String status,String rating,Double hours,String review){if(!validId(id))throw new IllegalArgumentException("Título inválido. Atualize sua biblioteca.");if(status==null||status.trim().isEmpty()||status.length()>80)throw new IllegalArgumentException("Selecione um status válido.");if(rating==null||rating.length()>80)throw new IllegalArgumentException("Avaliação inválida.");if(hours!=null&&(Double.isNaN(hours)||Double.isInfinite(hours)||hours<0||hours>100000))throw new IllegalArgumentException("Informe horas entre 0 e 100.000.");if(review==null||review.length()>4000)throw new IllegalArgumentException("As anotações podem ter até 4.000 caracteres.");}
 public static String[] preserve(String[] choices,String current){if(current==null||current.trim().isEmpty()||java.util.Arrays.asList(choices).contains(current))return choices.clone();String[] values=java.util.Arrays.copyOf(choices,choices.length+1);values[values.length-1]=current;return values;}
}

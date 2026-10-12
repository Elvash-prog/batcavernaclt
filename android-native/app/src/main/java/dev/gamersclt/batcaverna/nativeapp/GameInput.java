package dev.gamersclt.batcaverna.nativeapp;
public final class GameInput {
 public static final String[] STATUSES={"📌 Backlog","🎮 Em Progresso","✅ Zerado","🏆 100% (Platina)","❌ Abandonado","⏸️ Pausado","🧪 Simulando","⌛ Wishlist","🟦 Biblioteca Steam"};
 public static String name(String name){String n=name==null?"":name.trim();if(n.isEmpty()||n.length()>160)throw new IllegalArgumentException("O nome precisa ter entre 1 e 160 caracteres.");if(n.matches("(?is).*\\b(hentai|pornografia|pornography|nsfw|sex simulator)\\b.*"))throw new IllegalArgumentException("Este conteúdo não é permitido.");return n;}
 public static double hours(String value){try{double v=Double.parseDouble(value.trim().replace(',','.'));if((Double.isNaN(v)||Double.isInfinite(v))||v<0||v>100000)throw new NumberFormatException();return v;}catch(Exception e){throw new IllegalArgumentException("Informe horas entre 0 e 100.000.");}}
}

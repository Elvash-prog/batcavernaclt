package dev.gamersclt.batcaverna.nativeapp;
public final class MediaInput {
 public static final String[] TYPES={"🎬 Filme","📺 Série","🍥 Anime"};
 public static final String[] STATUS={"📌 Para assistir","📺 Assistindo","✅ Assistido","❤️ Favorito","❌ Abandonado","⏸️ Pausado","🍿 Maratonando"};
 public static void validate(String name,int type,int status,String provider,String duration){GameInput.name(name);if(type<0||type>=TYPES.length||status<0||status>=STATUS.length)throw new IllegalArgumentException("Tipo ou status inválido.");if(provider==null||provider.length()>80||duration==null||duration.length()>80)throw new IllegalArgumentException("Onde assistir e duração aceitam até 80 caracteres.");}
}

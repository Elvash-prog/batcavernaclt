package dev.gamersclt.batcaverna.nativeapp;
final class NativeBackend {
 static final String ORIGIN=BuildConfig.SUPABASE_URL+"/functions/v1/native-api";
 static String endpoint(String path){if(!path.startsWith("/api/")||path.contains(".."))throw new IllegalArgumentException("Rota inválida.");return ORIGIN+path;}
}

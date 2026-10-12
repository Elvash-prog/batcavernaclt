package dev.gamersclt.batcaverna.nativeapp;
import java.text.Normalizer;
import java.util.Locale;
/** Suppress generic duplicate private-message notices; retain sender-specific text. */
public final class NotificationPolicy {
 public static boolean shouldShow(String message){if(message==null)return false;String text=Normalizer.normalize(message,Normalizer.Form.NFD).replaceAll("\\p{M}+","").toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9 ]", " ").trim().replaceAll(" +", " ");if(text.isEmpty())return false;return !java.util.Arrays.asList("mensagem privada","nova mensagem privada","voce recebeu uma mensagem privada","voce tem uma nova mensagem privada","nova mensagem recebida","mensagem privada recebida").contains(text);}
}

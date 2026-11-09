package dev.gamersclt.batcaverna.nativeapp;

import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

/** One writer owns the updater's shared temporary files at a time. */
final class UpdateDownloadState {
 private final AtomicBoolean running = new AtomicBoolean();
 boolean begin() { return running.compareAndSet(false, true); }
 void finish() { running.set(false); }
 boolean isRunning() { return running.get(); }
 static int percent(long received, long total) {
  return total > 0 ? (int)Math.max(0, Math.min(100, received * 100.0 / total)) : -1;
 }
 static String text(long received, long total) {
  String bytes = String.format(Locale.forLanguageTag("pt-BR"), "%.1f MB", received / 1048576.0);
  return total > 0 ? percent(received, total) + "% · " + bytes + " de " +
   String.format(Locale.forLanguageTag("pt-BR"), "%.1f MB", total / 1048576.0) : bytes + " recebidos";
 }
}

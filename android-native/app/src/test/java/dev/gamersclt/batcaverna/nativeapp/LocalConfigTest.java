package dev.gamersclt.batcaverna.nativeapp;
import org.junit.Test;
import static org.junit.Assert.*;

/** Runs without Android networking: bootstrap works even if the website is down. */
public class LocalConfigTest {
 @Test public void configurationIsAvailableWithoutNetwork() {
  String[] config=SupabaseAuthClient.loadConfig();
  assertEquals("https://luoqlhgfmixvfqbfcdoc.supabase.co",config[0]);
  assertTrue(config[1].startsWith("sb_publishable_"));
  assertFalse(config[1].contains("sb_secret_"));
 }
 @Test public void callerCannotChangeAnotherClientsConfiguration() {
  String[] config=SupabaseAuthClient.loadConfig();
  config[0]="https://invalid.test";config[1]="";
  String[] next=SupabaseAuthClient.loadConfig();
  assertEquals(BuildConfig.SUPABASE_URL,next[0]);
  assertEquals(BuildConfig.SUPABASE_PUBLISHABLE_KEY,next[1]);
 }
}

package dev.gamersclt.batcaverna.nativeapp;
import org.junit.Test;
import static org.junit.Assert.*;
public class AuthCodeInputTest {
 @Test public void acceptsNumericCodeAndOriginalEmailLink(){
  AuthCodeInput otp=AuthCodeInput.parse(" 123456 ",true);assertFalse(otp.hash);assertEquals("recovery",otp.type);
  String link="https://luoqlhgfmixvfqbfcdoc.supabase.co/auth/v1/verify?token=012345678901234567890123456789&type=email&redirect_to=https%3A%2F%2Fexample.com";
  AuthCodeInput signup=AuthCodeInput.parse(link,false);assertTrue(signup.hash);assertEquals("email",signup.type);
  try{AuthCodeInput.parse(link,true);fail();}catch(IllegalArgumentException expected){}
 }
 @Test public void rejectsForeignHostWrongPurposeDuplicateTokenAndUsedSessionLinks(){
  String base="https://luoqlhgfmixvfqbfcdoc.supabase.co/auth/v1/verify?";
  String[] invalid={"https://evil.test/auth/v1/verify?token=01234567890123456789&type=recovery",base+"token=01234567890123456789&type=recovery&type=email",base+"token=01234567890123456789&token_hash=01234567890123456789&type=recovery",base+"token=short&type=recovery","https://example.com/#access_token=secret","12345"};
  for(String value:invalid)try{AuthCodeInput.parse(value,true);fail(value);}catch(IllegalArgumentException expected){}
 }
}

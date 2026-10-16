package dev.gamersclt.batcaverna.nativeapp;
public class EmailChangePolicyTest {
 public static void main(String[] args){
  for(String email:new String[]{"old@example.com","new@example.com"})if(!EmailChangePolicy.allowed(email,"123456","old@example.com","new@example.com"))throw new AssertionError();
  if(EmailChangePolicy.allowed("other@example.com","123456","old@example.com","new@example.com"))throw new AssertionError();
  if(EmailChangePolicy.allowed("new@example.com","123456","old@example.com",""))throw new AssertionError();
  if(EmailChangePolicy.allowed("new@example.com","https://evil.test","old@example.com","new@example.com"))throw new AssertionError();
 }
}

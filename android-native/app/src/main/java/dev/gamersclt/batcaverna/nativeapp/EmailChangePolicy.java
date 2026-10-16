package dev.gamersclt.batcaverna.nativeapp;
/** A code can only target an address of the signed-in account's pending change. */
final class EmailChangePolicy {
 static boolean allowed(String email,String code,String current,String pending){
  return email!=null&&code!=null&&pending!=null&&!pending.isEmpty()&&code.matches("[0-9]{6,10}")&&(email.equalsIgnoreCase(current)||email.equalsIgnoreCase(pending));
 }
}

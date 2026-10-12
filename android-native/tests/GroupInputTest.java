package dev.gamersclt.batcaverna.nativeapp;
public final class GroupInputTest {
 private static int checks;
 private static void rejects(Runnable input){checks++;try{input.run();throw new AssertionError("Accepted invalid input");}catch(IllegalArgumentException expected){}}
 private static void same(String a,String b){checks++;if(!a.equals(b))throw new AssertionError(a+" != "+b);}
 public static void main(String[] args){same("Grupo CLT",GroupInput.name(" Grupo CLT "));same("ab",GroupInput.name("ab"));same("🙌 Amigos",GroupInput.name("🙌 Amigos"));rejects(()->GroupInput.name(null));rejects(()->GroupInput.name("a"));rejects(()->GroupInput.name("abc\ndef"));rejects(()->GroupInput.name("ab\u0000cd"));rejects(()->GroupInput.name(new String(new char[61]).replace('\0','a')));same("Olá!",GroupInput.message(" Olá! "));same("> Resposta\nOlá",GroupInput.message("> Resposta\nOlá"));rejects(()->GroupInput.message(null));rejects(()->GroupInput.message("  "));rejects(()->GroupInput.message(new String(new char[4001]).replace('\0','a')));System.out.println("GroupInput: "+checks+" checks");}
}

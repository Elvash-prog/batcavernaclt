package dev.gamersclt.batcaverna.nativeapp;
public final class BatchNamesTest {
 static int checks;static void eq(Object got,Object expected){if(!got.equals(expected))throw new AssertionError(got+" != "+expected);checks++;}
 static void bad(String input){try{BatchNames.parse(input);throw new AssertionError("Lista inválida aceita");}catch(IllegalArgumentException expected){checks++;}}
 public static void main(String[] args){eq(BatchNames.parse("Hades\nCeleste\nElden Ring").size(),3);eq(BatchNames.parse(" Hades \r\nHADES;Celeste\n").size(),2);eq(BatchNames.parse("Zelda, Tears of the Kingdom\nHades").get(0),"Zelda, Tears of the Kingdom");eq(BatchNames.normalized("Pokémon  RED"),"pokemon red");eq(BatchNames.parse("Pokémon\npokemon").size(),1);eq(BatchNames.parse("Hades II\nHades").size(),2);bad("");bad("  ; \n");bad(null);bad("hentai");bad(new String(new char[161]).replace('\0','a'));StringBuilder names=new StringBuilder();for(int i=0;i<50;i++)names.append("Game ").append(i).append('\n');eq(BatchNames.parse(names.toString()).size(),50);bad(names.append("Extra Game").toString());eq(BatchNames.parse("Hades;Celeste").size(),2);System.out.println("BatchNames: "+checks+" checks");}
}

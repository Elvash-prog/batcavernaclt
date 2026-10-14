package dev.gamersclt.batcaverna.nativeapp;
public final class CatalogDraftInputTest {
 static int checks;
 static void ok(String y,String start,String finish){CatalogDraftInput.validate("Resident Evil 2",y,"Terror, Ação",start,finish,"");checks++;}
 static void bad(String y,String start,String finish){try{CatalogDraftInput.validate("Resident Evil 2",y,"Terror",start,finish,"");throw new AssertionError("Cadastro inválido aceito");}catch(IllegalArgumentException expected){checks++;}}
 public static void main(String[] args){ok("2019","","");ok("","2024-02-29","2024-03-01");ok("2026","2026-10-09","2026-10-09");ok("2000","2000-02-29","");bad("19","","");bad("null","","");bad("2019","2025-02-29","");bad("2019","2026-04-31","");bad("2019","2026-13-01","");bad("2019","2026-00-01","");bad("2019","2026-01-00","");bad("2019","09/10/2026","");bad("2019","2026-10-09","2026-10-08");bad("2019","2026-1-01","");bad("2019","2026-10-09extra","");try{CatalogDraftInput.validate("Game","2026",new String(new char[501]).replace('\0','a'),"","","");throw new AssertionError("Gênero longo aceito");}catch(IllegalArgumentException expected){checks++;}System.out.println("CatalogDraftInput: "+checks+" checks");}
}

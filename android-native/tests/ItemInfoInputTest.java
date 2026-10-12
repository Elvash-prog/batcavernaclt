package dev.gamersclt.batcaverna.nativeapp;
public final class ItemInfoInputTest {
 static int checks;static void valid(String year,String percent,String price){ItemInfoInput.validate("Ghostwire: Tokyo","PC","Steam",year,"Alta","20 horas",percent,"Ação, Terror",price);checks++;}static void invalid(String year,String percent,String price){try{valid(year,percent,price);throw new AssertionError("Entrada inválida aceita");}catch(IllegalArgumentException expected){checks++;}}
 public static void main(String[] args){valid("2022","100","39,90");valid("","","");valid("1999","0","0");invalid("22","10","10");invalid("202A","10","10");invalid("2022","100.1","10");invalid("2022","-1","10");invalid("2022","NaN","10");invalid("2022","Infinity","10");invalid("2022","10","-1");invalid("2022","10","1000001");invalid("2022","10","NaN");System.out.println("ItemInfoInput: "+checks+" checks");}
}

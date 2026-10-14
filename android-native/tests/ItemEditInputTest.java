import dev.gamersclt.batcaverna.nativeapp.ItemEditInput;
public class ItemEditInputTest {
 private static int checks;
 private static void check(boolean ok){checks++;if(!ok)throw new AssertionError("Check "+checks);}
 private static void invalid(String id,String status,String rating,Double hours,String review){try{ItemEditInput.validate(id,status,rating,hours,review);throw new AssertionError("Accepted invalid edit");}catch(IllegalArgumentException expected){checks++;}}
 public static void main(String[] args){
  check(ItemEditInput.validId("1"));check(ItemEditInput.validId("1234567890123456789"));check(ItemEditInput.validId("12345678-1234-1234-abcd-123456789abc"));
  for(String id:new String[]{null,"0","-1","01","1&user_id=eq.other","1,2","12345678901234567890"})check(!ItemEditInput.validId(id));
  ItemEditInput.validate("1","Custom status","",null,"");checks++;
  ItemEditInput.validate("1","x".repeat(80),"x".repeat(80),100000d,"x".repeat(4000));checks++;
  invalid("0","Status","",0d,"");invalid("1"," ","",0d,"");invalid("1","x".repeat(81),"",0d,"");invalid("1","Status",null,0d,"");invalid("1","Status","x".repeat(81),0d,"");
  for(double h:new double[]{-1,100001,Double.NaN,Double.POSITIVE_INFINITY})invalid("1","Status","",h,"");
  invalid("1","Status","",0d,null);invalid("1","Status","",0d,"x".repeat(4001));
  String[] base={"A","B"};String[] custom=ItemEditInput.preserve(base,"Legacy");check(custom.length==3&&custom[2].equals("Legacy"));
  String[] copied=ItemEditInput.preserve(base,"A");copied[0]="Changed";check(base[0].equals("A")&&copied.length==2);
  check(ItemEditInput.preserve(base,null).length==2);
  System.out.println("ItemEditInput: "+checks+" checks passed");
 }
}

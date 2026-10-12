import dev.gamersclt.batcaverna.nativeapp.LibraryCount;
public class LibraryCountTest {
 public static void main(String[] args)throws Exception{
  if(LibraryCount.parse("0-0/208")!=208)throw new AssertionError("Full count");
  if(LibraryCount.parse("*/0")!=0)throw new AssertionError("Empty count");
  if(LibraryCount.parse("0-0/ 12 ")!=12)throw new AssertionError("Whitespace");
  for(String invalid:new String[]{null,"0-0/*","0-0/-1","invalid","0-0/999999999999"}){try{LibraryCount.parse(invalid);throw new AssertionError("Accepted invalid count");}catch(java.io.IOException expected){}}
  System.out.println("LibraryCount: 8 checks passed");
 }
}

import dev.gamersclt.batcaverna.nativeapp.ProfileInput;
public class ProfileInputTest {
 public static void main(String[] args){for(String s:ProfileInput.STATUS)ProfileInput.validate("Jonas","Bio",s);String[][] invalid={{"","","online"},{null,"","online"},{"x","","admin"},{"x",null,"online"},{"x","b".repeat(281),"online"},{"n".repeat(41),"","online"}};for(String[] c:invalid){try{ProfileInput.validate(c[0],c[1],c[2]);throw new AssertionError();}catch(IllegalArgumentException expected){}}System.out.println("ProfileInput: 11 checks passed");}
}

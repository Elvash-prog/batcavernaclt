import dev.gamersclt.batcaverna.nativeapp.AuthInput;
public class AuthInputTest {
 static int count;
 static void check(boolean value){count++;if(!value)throw new AssertionError("check "+count);}
 public static void main(String[] args){
  check(AuthInput.login("Elvash","password").isEmpty());
  check(!AuthInput.login(" ","x").isEmpty());
  check(!AuthInput.login(null,"x").isEmpty());
  check(!AuthInput.login("Jonas",null).isEmpty());
  check(!AuthInput.login("Jonas","").isEmpty());
  check(AuthInput.registration("Jonas","jo_nas-1.2","user@example.com","abcdefghijkl","abcdefghijkl").isEmpty());
  check(!AuthInput.registration(" ","Jonas","user@example.com","abcdefghijkl","abcdefghijkl").isEmpty());
  check(!AuthInput.registration("x".repeat(41),"Jonas","user@example.com","abcdefghijkl","abcdefghijkl").isEmpty());
  check(!AuthInput.registration("Jonas","x".repeat(25),"user@example.com","abcdefghijkl","abcdefghijkl").isEmpty());
  check(!AuthInput.registration("Jonas","jo nas","user@example.com","abcdefghijkl","abcdefghijkl").isEmpty());
  check(!AuthInput.registration("Jonas","Jonas","not-an-email","abcdefghijkl","abcdefghijkl").isEmpty());
  check(!AuthInput.registration("Jonas","Jonas","user@example.com","abcdefghijk","abcdefghijk").isEmpty());
  check(!AuthInput.registration("Jonas","Jonas","user@example.com","abcdefghijkl","differentpass").isEmpty());
  System.out.println("AuthInput: "+count+" checks passed");
 }
}

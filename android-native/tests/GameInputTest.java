import dev.gamersclt.batcaverna.nativeapp.GameInput;
public class GameInputTest {
 public static void main(String[] args){
  if(!GameInput.name(" Hades ").equals("Hades"))throw new AssertionError();
  for(String name:new String[]{"",null,"   ","Hentai test"}){try{GameInput.name(name);throw new AssertionError();}catch(IllegalArgumentException expected){}}
  if(GameInput.hours("12,5")!=12.5||GameInput.hours("0")!=0)throw new AssertionError();
  for(String h:new String[]{"-1","NaN","Infinity","100001","abc",""}){try{GameInput.hours(h);throw new AssertionError();}catch(IllegalArgumentException expected){}}
  System.out.println("GameInput: 13 checks passed");
 }
}

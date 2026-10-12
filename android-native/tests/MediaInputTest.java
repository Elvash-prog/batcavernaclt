import dev.gamersclt.batcaverna.nativeapp.MediaInput;
public class MediaInputTest {
 public static void main(String[] args){for(int type=0;type<3;type++)MediaInput.validate("Título",type,0,"","");for(int[] invalid:new int[][]{{-1,0},{3,0},{0,-1},{0,MediaInput.STATUS.length}}){try{MediaInput.validate("Título",invalid[0],invalid[1],"","");throw new AssertionError();}catch(IllegalArgumentException expected){}}try{MediaInput.validate("Título",0,0,"x".repeat(81),"");throw new AssertionError();}catch(IllegalArgumentException expected){}try{MediaInput.validate("Título",0,0,"",null);throw new AssertionError();}catch(IllegalArgumentException expected){}System.out.println("MediaInput: 9 checks passed");}
}

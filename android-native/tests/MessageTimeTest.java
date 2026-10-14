import dev.gamersclt.batcaverna.nativeapp.MessageTime;
import java.util.TimeZone;
public class MessageTimeTest {
 public static void main(String[] args){TimeZone.setDefault(TimeZone.getTimeZone("UTC"));if(!MessageTime.time("2026-10-08T19:15:00Z").equals("19:15"))throw new AssertionError();if(!MessageTime.time("2026-10-08T19:15:00.123456+00:00").equals("19:15"))throw new AssertionError();if(!MessageTime.day("2026-10-08T19:15:00Z").equals("08/10/2026"))throw new AssertionError();for(String invalid:new String[]{null,"invalid","2026-02-30T19:15:00Z"})if(!MessageTime.time(invalid).equals("—"))throw new AssertionError();TimeZone.setDefault(TimeZone.getTimeZone("America/Sao_Paulo"));if(!MessageTime.time("2026-10-08T19:15:00Z").equals("16:15"))throw new AssertionError();System.out.println("MessageTime: 7 checks passed");}
}

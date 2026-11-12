package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;import okhttp3.*;import okio.ByteString;import org.json.*;import org.junit.Test;import org.junit.runner.RunWith;import org.robolectric.*;import org.robolectric.annotation.Config;import java.lang.reflect.*;import java.util.*;import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class) @Config(sdk=35,manifest=Config.NONE)
public class PresenceTransportTest {
 static class Socket implements WebSocket {
  final List<String> frames=new ArrayList<>();boolean cancelled;boolean accept=true;
  public Request request(){return new Request.Builder().url("wss://example.invalid").build();}public long queueSize(){return 0;}
  public boolean send(String text){frames.add(text);return accept;}public boolean send(ByteString bytes){return false;}
  public boolean close(int code,String reason){return true;}public void cancel(){cancelled=true;}
 }
 private void set(Object o,String name,Object value)throws Exception{Field f=o.getClass().getDeclaredField(name);f.setAccessible(true);f.set(o,value);}
 private Object get(Object o,String name)throws Exception{Field f=o.getClass().getDeclaredField(name);f.setAccessible(true);return f.get(o);}
 private void publish(NativePresence p,String status,String game)throws Exception{Method m=NativePresence.class.getDeclaredMethod("publish",JSONObject.class,JSONObject.class,int.class);m.setAccessible(true);m.invoke(p,new JSONObject().put("nome","Tester").put("status_personalizado",status),new JSONObject().put("nome",game),0);}
 private NativePresence live(long[] now,Socket socket)throws Exception{Context c=RuntimeEnvironment.getApplication();SessionPreferences.get(c).edit().putString("user_id","owner").apply();NativePresence p=new NativePresence(c,()->now[0]);set(p,"active",true);set(p,"joined",true);set(p,"user","owner");set(p,"joinRef","1");set(p,"socket",socket);return p;}
 @Test public void steadyProfileDoesNotTrackAtEveryRefreshAndUsesJoinReference()throws Exception{
  long[] now={0};Socket socket=new Socket();NativePresence p=live(now,socket);
  for(long t:new long[]{0,1,5000,10000,30000,59999,60000}){now[0]=t;publish(p,"online","Control");}
  assertEquals(2,socket.frames.size());for(String text:socket.frames){JSONObject frame=new JSONObject(text);assertEquals("1",frame.getString("join_ref"));assertEquals("presence",frame.getString("event"));assertEquals("track",frame.getJSONObject("payload").getString("event"));}
 }
 @Test public void hideIsImmediateEvenDuringThrottleAndNeverLoops()throws Exception{
  long[] now={0};Socket socket=new Socket();NativePresence p=live(now,socket);publish(p,"online","Control");now[0]=1;publish(p,"invisivel","");publish(p,"invisivel","");assertEquals(2,socket.frames.size());JSONObject push=new JSONObject(socket.frames.get(1)).getJSONObject("payload");assertEquals("untrack",push.getString("event"));assertEquals(0,push.getJSONObject("payload").length());now[0]=2;publish(p,"online","Other");assertEquals(2,socket.frames.size());
 }
 @Test public void rateErrorClearsPeersAndRequiresLongerCooldown()throws Exception{
  long[] now={1000};Socket socket=new Socket();NativePresence p=live(now,socket);Method receive=NativePresence.class.getDeclaredMethod("receive",String.class);receive.setAccessible(true);
  receive.invoke(p,new JSONObject().put("topic","realtime:platinados-presenca").put("event","presence_state").put("payload",new JSONObject("{\"friend\":{\"metas\":[{\"phx_ref\":\"1\",\"status\":\"online\"}]}}" )).toString());
  JSONObject[] observed={null};p.listen((state,connected)->observed[0]=state);
  receive.invoke(p,new JSONObject().put("topic","realtime:platinados-presenca").put("event","system").put("payload",new JSONObject().put("status","error").put("message","Client presence rate limit exceeded")).toString());
  assertEquals(false,get(p,"joined"));assertNull(get(p,"socket"));assertTrue(socket.cancelled);assertEquals(0,observed[0].length());assertTrue((Long)get(p,"rateUntil")>=61000);p.refresh();assertEquals(0,socket.frames.size());
 }
 @Test public void lateAccountCallbackCannotPublishAnotherPersonsPresence()throws Exception{
  long[] now={0};Socket socket=new Socket();NativePresence p=live(now,socket);SessionPreferences.get(RuntimeEnvironment.getApplication()).edit().putString("user_id","other").apply();publish(p,"online","Private");assertEquals(0,socket.frames.size());
 }
 @Test public void failedSocketWriteDoesNotKeepOldPresenceAlive()throws Exception{
  long[] now={0};Socket socket=new Socket();socket.accept=false;NativePresence p=live(now,socket);publish(p,"online","Control");assertFalse((Boolean)get(p,"joined"));assertNull(get(p,"socket"));assertTrue(socket.cancelled);
 }
}

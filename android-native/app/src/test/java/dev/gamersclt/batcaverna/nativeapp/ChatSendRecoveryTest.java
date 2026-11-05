package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;import java.net.*;import java.io.*;import java.nio.charset.StandardCharsets;import java.lang.reflect.*;import java.util.concurrent.atomic.*;import org.json.*;import org.junit.Test;import org.junit.runner.RunWith;import org.robolectric.*;import org.robolectric.annotation.Config;import static org.junit.Assert.*;
/** Exercise the actual repository HTTP sequence, including a saved request with a lost acknowledgement. */
@RunWith(RobolectricTestRunner.class) @Config(sdk=35,manifest=Config.NONE)
public class ChatSendRecoveryTest {
 @Test public void retryAfterLostAcknowledgementDoesNotPostTwice()throws Exception{for(boolean group:new boolean[]{false,true})recover(group,true);}
 @Test public void retryAfterRejectionCanSendTheSameIdentity()throws Exception{recover(false,false);}
 private void recover(boolean group,boolean savedBeforeFailure)throws Exception{
  Context context=RuntimeEnvironment.getApplication();android.content.SharedPreferences prefs=SessionPreferences.get(context);Field keyField=SessionPreferences.class.getDeclaredField("key");keyField.setAccessible(true);javax.crypto.KeyGenerator generator=javax.crypto.KeyGenerator.getInstance("AES");generator.init(256);keyField.set(prefs,generator.generateKey());SessionPreferences.get(context).edit().putString("access_token","test-token").apply();AccountRepository repository=new AccountRepository(context);
  String id="ed4eccee-6438-4456-aed0-17a76b25cc27",user="129cbf30-7775-4b0a-8565-4d5158efaf79",target="329cbf30-7775-4b0a-8565-4d5158efaf79",table=group?"clt_chat_group_messages":"clt_chat_messages",key=group?"group_id":"destinatario_id";
  AtomicReference<String> saved=new AtomicReference<>();AtomicInteger posts=new AtomicInteger();AtomicBoolean failRead=new AtomicBoolean(false),running=new AtomicBoolean(true);
  try(ServerSocket server=new ServerSocket(0,20,InetAddress.getLoopbackAddress())){
   server.setSoTimeout(300);Thread worker=new Thread(()->{while(running.get()){try(Socket socket=server.accept()){
    InputStream in=socket.getInputStream();StringBuilder header=new StringBuilder();int c;while((c=in.read())!=-1){header.append((char)c);if(header.toString().endsWith("\r\n\r\n"))break;}String headers=header.toString();boolean post=headers.startsWith("POST ");int length=0;for(String line:headers.split("\r\n"))if(line.toLowerCase().startsWith("content-length:"))length=Integer.parseInt(line.substring(15).trim());byte[] body=new byte[length];int offset=0;while(offset<length){int n=in.read(body,offset,length-offset);if(n<0)break;offset+=n;}
    int status=200;String response;
    if(post){int count=posts.incrementAndGet();if(count==1){if(savedBeforeFailure){saved.set(new String(body,StandardCharsets.UTF_8));failRead.set(true);}status=503;response="{}";}else{saved.set(new String(body,StandardCharsets.UTF_8));response="["+saved.get()+"]";}}
    else if(failRead.getAndSet(false)){status=503;response="{}";}else response=saved.get()==null?"[]":"["+saved.get()+"]";
    byte[] bytes=response.getBytes(StandardCharsets.UTF_8);OutputStream out=socket.getOutputStream();out.write(("HTTP/1.1 "+status+" "+(status==200?"OK":"Unavailable")+"\r\nContent-Type: application/json\r\nConnection: close\r\nContent-Length: "+bytes.length+"\r\n\r\n").getBytes(StandardCharsets.US_ASCII));out.write(bytes);out.flush();
   }catch(SocketTimeoutException ignored){}catch(IOException error){if(running.get())throw new RuntimeException(error);}}});worker.setDaemon(true);worker.start();
   Method send=AccountRepository.class.getDeclaredMethod("sendOnce",String.class,String.class,String.class,String.class,String.class,String.class,String.class,String[].class);send.setAccessible(true);String[] config={"http://127.0.0.1:"+server.getLocalPort(),"test-key"};
   try{send.invoke(repository,table,key,target,user,"Olá",id,"test-token",config);fail("A primeira resposta deve falhar");}catch(InvocationTargetException expected){assertTrue(expected.getCause() instanceof IOException);}
   JSONArray result=(JSONArray)send.invoke(repository,table,key,target,user,"Olá",id,"test-token",config);assertEquals(id,result.getJSONObject(0).getString("id"));assertEquals(target,result.getJSONObject(0).getString(key));assertEquals(savedBeforeFailure?1:2,posts.get());assertNotNull(saved.get());running.set(false);worker.join(1000);
  }finally{running.set(false);SessionPreferences.get(context).edit().remove("access_token").apply();}
 }
}

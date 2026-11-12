package dev.gamersclt.batcaverna.nativeapp;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;

public final class PasswordSafetyTest {
 static void require(boolean ok){if(!ok)throw new AssertionError("Password screening assertion failed");}
 public static void main(String[] args)throws Exception{
  String hash=PasswordSafety.digest("password"),suffix=hash.substring(5);
  require(hash.equals("5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8"));
  require(!PasswordSafety.digest(" password ").equals(hash));
  require(!PasswordSafety.digest("Password").equals(hash));
  String other="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  require(PasswordSafety.compromised(suffix+":42\r\n"+other+":0\r\n",suffix));
  require(!PasswordSafety.compromised(suffix+":0\r\n"+other+":1\r\n",suffix));
  for(String body:new String[]{"","<html>error</html>",suffix+":0",suffix+":-1",suffix+":1\ninvalid",suffix+":1\n\n"}){
   try{PasswordSafety.compromised(body,suffix);throw new AssertionError("Invalid response accepted");}catch(PasswordSafety.Failure expected){require(expected.getMessage().equals(PasswordSafety.UNAVAILABLE));}
  }
  for(int status:new int[]{200,302,429,500}){
   for(boolean leaked:new boolean[]{true,false}){
    try(ServerSocket server=new ServerSocket(0,1,InetAddress.getByName("127.0.0.1"))){
     server.setSoTimeout(5000);ExecutorService executor=Executors.newSingleThreadExecutor();
     try{
      Future<String> raw=executor.submit(()->{try(Socket socket=server.accept()){
       socket.setSoTimeout(5000);BufferedReader in=new BufferedReader(new InputStreamReader(socket.getInputStream(),StandardCharsets.UTF_8));StringBuilder request=new StringBuilder();String line;
       while((line=in.readLine())!=null&&!line.isEmpty())request.append(line).append('\n');
       String body=(leaked?suffix:other)+":3\r\n";
       socket.getOutputStream().write(("HTTP/1.1 "+status+" Test\r\nContent-Length: "+body.length()+"\r\nConnection: close\r\n\r\n"+body).getBytes(StandardCharsets.US_ASCII));return request.toString().toLowerCase(java.util.Locale.ROOT);
      }});
      String error="";try{PasswordSafety.checkAt("password","http://127.0.0.1:"+server.getLocalPort()+"/range/");}catch(PasswordSafety.Failure e){error=e.getMessage();}
      require(error.equals(status!=200?PasswordSafety.UNAVAILABLE:leaked?PasswordSafety.BLOCKED:""));
      String request=raw.get(6,TimeUnit.SECONDS);require(request.startsWith("get /range/5baa6 http/1.1\n"));require(request.contains("add-padding: true\n"));
      for(String secret:new String[]{"password","1e4c9b93","authorization:","apikey:","cookie:"})require(!request.contains(secret));
     }finally{executor.shutdownNow();}
    }
   }
  }
  try(ServerSocket server=new ServerSocket(0)){int port=server.getLocalPort();server.close();try{PasswordSafety.checkAt("password","http://127.0.0.1:"+port+"/range/");throw new AssertionError("Offline check accepted");}catch(PasswordSafety.Failure expected){require(expected.getMessage().equals(PasswordSafety.UNAVAILABLE));}}
  System.out.println("Password screening: range-only privacy, padding, exact match, case/space preservation, invalid responses, HTTP failures and offline handling passed.");
 }
}

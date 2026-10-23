package dev.gamersclt.batcaverna.nativeapp;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;

public final class AuthRevocationTest {
    public static void main(String[] args)throws Exception {
        for(String scope:new String[]{"local","others","global"}) {
            for(int status:new int[]{204,401,403,429,500,302}) {
                try(ServerSocket server=new ServerSocket(0,1,InetAddress.getByName("127.0.0.1"))) {
                    server.setSoTimeout(5000);
                    ExecutorService executor=Executors.newSingleThreadExecutor();
                    try {
                        Future<String> request=executor.submit(()->{
                            try(Socket socket=server.accept()) {
                                socket.setSoTimeout(5000);
                                BufferedReader in=new BufferedReader(new InputStreamReader(socket.getInputStream(),StandardCharsets.UTF_8));
                                StringBuilder raw=new StringBuilder();String line;
                                while((line=in.readLine())!=null&&!line.isEmpty())raw.append(line).append('\n');
                                socket.getOutputStream().write(("HTTP/1.1 "+status+" Test\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").getBytes(StandardCharsets.US_ASCII));
                                return raw.toString().toLowerCase(java.util.Locale.ROOT);
                            }
                        });
                        boolean ok=true;
                        try{AuthRevocation.revoke("http://127.0.0.1:"+server.getLocalPort(),"public-test-key","test-jwt",scope);}catch(IOException e){ok=false;}
                        if(ok!=(status==204))throw new AssertionError("Unexpected result for HTTP "+status);
                        String raw=request.get(6,TimeUnit.SECONDS);
                        if(!raw.startsWith("post /auth/v1/logout?scope="+scope+" ")||!raw.contains("authorization: bearer test-jwt\n")||!raw.contains("apikey: public-test-key\n"))throw new AssertionError("Missing authenticated POST or scope");
                    }finally{executor.shutdownNow();}
                }
            }
        }
        try{AuthRevocation.revoke("http://127.0.0.1:1","key","token","invalid");throw new AssertionError("Invalid scope accepted");}catch(IOException expected){}
        try(ServerSocket closed=new ServerSocket(0)){
            int port=closed.getLocalPort();closed.close();
            try{AuthRevocation.revoke("http://127.0.0.1:"+port,"key","token","local");throw new AssertionError("Offline sign-out reported success");}catch(IOException expected){}
        }
        System.out.println("Auth revocation: scope, authentication, failures and redirect rejection passed");
    }
}

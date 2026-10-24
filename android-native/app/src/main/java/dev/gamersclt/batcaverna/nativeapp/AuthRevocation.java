package dev.gamersclt.batcaverna.nativeapp;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;

/** Revoke server refresh tokens before reporting a successful sign-out. */
final class AuthRevocation {
    static void revoke(String base,String key,String token,String scope)throws IOException {
        if(!scope.equals("local")&&!scope.equals("others")&&!scope.equals("global"))throw new IOException("Escopo de sessão inválido.");
        HttpURLConnection connection=(HttpURLConnection)new URL(base+"/auth/v1/logout?scope="+scope).openConnection();
        try {
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(12000);connection.setReadTimeout(12000);
            connection.setRequestMethod("POST");connection.setDoOutput(true);
            connection.setRequestProperty("apikey",key);
            connection.setRequestProperty("Authorization","Bearer "+token);
            connection.setRequestProperty("Content-Type","application/json");
            try(java.io.OutputStream out=connection.getOutputStream()){out.write(new byte[]{'{','}'});}
            int status=connection.getResponseCode();
            if(status<200||status>=300)throw new IOException("O servidor não confirmou o encerramento da sessão. Verifique a conexão e tente novamente.");
        }finally{connection.disconnect();}
    }
}

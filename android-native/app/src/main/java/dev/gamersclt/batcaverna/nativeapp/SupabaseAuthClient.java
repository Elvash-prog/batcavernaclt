package dev.gamersclt.batcaverna.nativeapp;

import android.os.Handler;
import android.os.Looper;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;

/** Dependency-free Auth client. The public application key is supplied at build time. */
public final class SupabaseAuthClient {
    public interface Callback { void done(boolean ok, String message); }
    public void recover(String email,Callback callback){java.util.concurrent.ExecutorService executor=Executors.newSingleThreadExecutor();executor.execute(()->{boolean success=false;String message="Não foi possível enviar. Tente novamente mais tarde.";try{String[] config=loadConfig();HttpURLConnection c=(HttpURLConnection)new URL(config[0]+"/auth/v1/recover?redirect_to="+URLEncoder.encode("https://batcavernaclt.gamersclt.workers.dev/","UTF-8")).openConnection();try{c.setInstanceFollowRedirects(false);c.setRequestMethod("POST");c.setDoOutput(true);c.setConnectTimeout(12000);c.setReadTimeout(12000);c.setRequestProperty("apikey",config[1]);c.setRequestProperty("Content-Type","application/json");try(OutputStream out=c.getOutputStream()){out.write(new JSONObject().put("email",email).toString().getBytes(StandardCharsets.UTF_8));}success=c.getResponseCode()>=200&&c.getResponseCode()<300;if(success)message="Se o e-mail estiver cadastrado, você receberá um link para recuperar sua senha.";}finally{c.disconnect();}}catch(Exception ignored){}boolean ok=success;String result=message;new Handler(Looper.getMainLooper()).post(()->callback.done(ok,result));executor.shutdown();});}
    public void signIn(String username,String password,Callback callback){signIn(username,password,true,callback);}
    public void signIn(String username,String password,boolean remember,Callback callback){
        java.util.concurrent.ExecutorService executor=Executors.newSingleThreadExecutor();
        executor.execute(() -> {
            boolean ok=false; String message="Não foi possível entrar.";
            try{
                URL u=new URL("https://batcavernaclt.gamersclt.workers.dev/api/account/login");
                HttpURLConnection c=(HttpURLConnection)u.openConnection(); c.setInstanceFollowRedirects(false); c.setRequestMethod("POST"); c.setDoOutput(true); c.setConnectTimeout(12000); c.setReadTimeout(12000);
                c.setRequestProperty("Content-Type","application/json");
                try{
                byte[] body=new JSONObject().put("username",username).put("password",password).toString().getBytes(StandardCharsets.UTF_8); try(OutputStream out=c.getOutputStream()){out.write(body);}
                int code=c.getResponseCode(); InputStream in=code<400?c.getInputStream():c.getErrorStream(); String response=read(in);
                if(code>=200&&code<300){ JSONObject auth=new JSONObject(response); saveSession(auth,remember); ok=true; message="Sessão iniciada."; }
                else { try{ JSONObject json=new JSONObject(response); message=json.optString("error",json.optString("error_description",json.optString("msg",message))); }catch(Exception ignored){} }
                }finally{c.disconnect();}
            }catch(Exception e){ message="Sem conexão. Tente novamente."; }
            boolean result=ok; String finalMessage=message; new Handler(Looper.getMainLooper()).post(() -> callback.done(result,finalMessage));
            executor.shutdown();
        });
    }
    static boolean sessionInProcess;
    private static void saveSession(JSONObject auth,boolean remember)throws Exception{
        String token=auth.optString("access_token","");JSONObject user=auth.optJSONObject("user");
        // The site's login endpoint may return tokens only. Read the verified user from Auth.
        if(user==null&&!token.isEmpty()){
            String[] config=loadConfig();HttpURLConnection c=(HttpURLConnection)new URL(config[0]+"/auth/v1/user").openConnection();
            try{c.setInstanceFollowRedirects(false);c.setConnectTimeout(12000);c.setReadTimeout(12000);c.setRequestProperty("apikey",config[1]);c.setRequestProperty("Authorization","Bearer "+token);if(c.getResponseCode()!=200)throw new IOException("Sessão inválida");user=new JSONObject(read(c.getInputStream()));}finally{c.disconnect();}
        }
        String userId=user==null?"":user.optString("id","");if(token.isEmpty()||!userId.matches("[0-9a-fA-F-]{36}"))throw new IOException("Sessão inválida");
        android.content.Context app=AppContextHolder.context;if(app==null)throw new IOException("Sessão indisponível");
        app.getSharedPreferences("batcaverna",0).edit().putString("access_token",token).putString("refresh_token",auth.optString("refresh_token","")).putString("user_email",user.optString("email","")).putString("user_id",userId).putLong("expires_at",System.currentTimeMillis()+auth.optLong("expires_in",3600)*1000).putBoolean("demo_session",false).putBoolean("authenticated",true).putBoolean("remember_session",remember).apply();sessionInProcess=true;
    }
    public void signUp(String name,String username,String email,String password,Callback callback){
        java.util.concurrent.ExecutorService executor=Executors.newSingleThreadExecutor();executor.execute(()->{
            boolean success=false;String message="Não foi possível criar o perfil. Tente novamente.";
            try{String[] config=loadConfig();HttpURLConnection c=(HttpURLConnection)new URL(config[0]+"/auth/v1/signup?redirect_to="+URLEncoder.encode("https://batcavernaclt.gamersclt.workers.dev/","UTF-8")).openConnection();
                try{c.setInstanceFollowRedirects(false);c.setRequestMethod("POST");c.setDoOutput(true);c.setConnectTimeout(12000);c.setReadTimeout(12000);c.setRequestProperty("apikey",config[1]);c.setRequestProperty("Content-Type","application/json");
                    JSONObject body=new JSONObject().put("email",email).put("password",password).put("data",new JSONObject().put("username",username).put("nome",name));
                    try(OutputStream out=c.getOutputStream()){out.write(body.toString().getBytes(StandardCharsets.UTF_8));}int code=c.getResponseCode();String response=read(code<400?c.getInputStream():c.getErrorStream());JSONObject auth=new JSONObject(response);
                    if(code>=200&&code<300){if(!auth.optString("access_token","").isEmpty()){saveSession(auth,true);success=true;message="Perfil criado.";}else message="Confira seu e-mail para confirmar o cadastro e depois entre.";}
                    else message=auth.optString("msg",auth.optString("error_description",message));
                }finally{c.disconnect();}
            }catch(Exception ignored){message="Não foi possível criar o perfil. Verifique a conexão e tente novamente.";}
            boolean ok=success;String result=message;new Handler(Looper.getMainLooper()).post(()->callback.done(ok,result));executor.shutdown();
        });
    }
    interface Darkness {void accept(int dim);}
    void loginBackground(android.widget.ImageView image,Darkness darkness){
        AccountImageLoader.load(image,"https://batcavernaclt.gamersclt.workers.dev/fundo.jpg");
        java.util.concurrent.ExecutorService executor=Executors.newSingleThreadExecutor();executor.execute(()->{
            try{String[] config=loadConfig();HttpURLConnection c=(HttpURLConnection)new URL(config[0]+"/rest/v1/configuracoes_site?id=eq.global&select=fundo_login").openConnection();
                try{c.setInstanceFollowRedirects(false);c.setConnectTimeout(10000);c.setReadTimeout(10000);c.setRequestProperty("apikey",config[1]);if(c.getResponseCode()==200){org.json.JSONArray rows=new org.json.JSONArray(read(c.getInputStream()));JSONObject f=rows.length()==0?null:rows.optJSONObject(0).optJSONObject("fundo_login");if(f!=null){String source=f.optString("url","");if(!source.isEmpty()){if(!source.startsWith("https://"))source=new URL(new URL("https://batcavernaclt.gamersclt.workers.dev/"),source).toString();String url=source;int dim=Math.max(0,Math.min(90,f.optInt("escuro",40)));new Handler(Looper.getMainLooper()).post(()->{AccountImageLoader.load(image,url);darkness.accept(dim);});}}}
                }finally{c.disconnect();}
            }catch(Exception ignored){}finally{executor.shutdown();}
        });
    }
    /** Local bootstrap: no request to the website is needed to reach Auth or REST. */
    static String[] loadConfig() {
        return new String[]{BuildConfig.SUPABASE_URL, BuildConfig.SUPABASE_PUBLISHABLE_KEY};
    }
    private static String read(InputStream in)throws IOException{
        if(in==null)return "";try(InputStream source=in;ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[4096];int n;while((n=source.read(b))!=-1){if(out.size()+n>524288)throw new IOException("Resposta muito grande");out.write(b,0,n);}return new String(out.toByteArray(),StandardCharsets.UTF_8);}
    }
}

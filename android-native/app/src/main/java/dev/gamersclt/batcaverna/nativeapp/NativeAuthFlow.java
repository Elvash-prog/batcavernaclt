package dev.gamersclt.batcaverna.nativeapp;
import android.os.Handler;
import android.os.Looper;
import org.json.JSONObject;
import okhttp3.*;
import java.util.concurrent.TimeUnit;
/** Email proof stays transient and never becomes the normal app session. */
final class NativeAuthFlow {
 private static final OkHttpClient HTTP=new OkHttpClient.Builder().connectTimeout(15,TimeUnit.SECONDS).readTimeout(25,TimeUnit.SECONDS).followRedirects(false).build();
 static void resend(String email,SupabaseAuthClient.Callback cb){run(email,"",false,null,true,cb);}
 static void finish(String email,String proof,boolean recovery,String password,SupabaseAuthClient.Callback cb){run(email,proof,recovery,password,false,cb);}
 static JSONObject request(String path,String method,JSONObject body,String token)throws Exception{
  String[] cfg=SupabaseAuthClient.loadConfig();Request.Builder b=new Request.Builder().url(cfg[0]+"/auth/v1/"+path).header("apikey",cfg[1]);if(token!=null)b.header("Authorization","Bearer "+token);
  b.method(method,"GET".equals(method)?null:RequestBody.create(body.toString(),MediaType.get("application/json")));
  try(Response response=HTTP.newCall(b.build()).execute()){
   if(!response.isSuccessful())throw new Exception(response.code()==429?"Aguarde antes de tentar novamente.":"Não foi possível concluir. Confira o código e solicite outro se ele expirou ou já foi utilizado.");
   String text=response.body()==null?"":response.body().string();return text.isEmpty()?new JSONObject():new JSONObject(text);
  }
 }
 private static void run(String email,String proof,boolean recovery,String password,boolean resend,SupabaseAuthClient.Callback cb){
  new Thread(()->{boolean ok=false;String message;String token=null;
   try{String address=email.trim().toLowerCase(java.util.Locale.ROOT);if(address.length()>254||!address.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))throw new Exception("Informe um e-mail válido.");
    if(resend){request("resend","POST",new JSONObject().put("type","signup").put("email",address),null);message="Se houver confirmação pendente, um novo e-mail será enviado.";}
    else{
     if(recovery&&(password==null||password.length()<12||password.length()>256))throw new Exception("Use uma senha de 12 a 256 caracteres.");
     AuthCodeInput input=AuthCodeInput.parse(proof,recovery);JSONObject payload=new JSONObject().put("type",input.type);if(input.hash)payload.put("token_hash",input.token);else payload.put("email",address).put("token",input.token);
     JSONObject session=request("verify","POST",payload,null);token=session.optString("access_token","");JSONObject user=session.optJSONObject("user");
     if(token.isEmpty()||user==null||!address.equalsIgnoreCase(user.optString("email")))throw new Exception("Este código ou link não pertence ao e-mail informado. Solicite outro se necessário.");
     if(recovery)request("user","PUT",new JSONObject().put("password",password),token);
     message=recovery?"Senha atualizada. Entre com sua nova senha.":"E-mail confirmado. Você já pode entrar.";
    }ok=true;
   }catch(Exception e){message=e.getMessage();if(message==null||message.length()>250)message="Não foi possível concluir. Tente novamente ou solicite outro e-mail.";}
   finally{if(token!=null&&!token.isEmpty())try{request("logout?scope=local","POST",new JSONObject(),token);}catch(Exception ignored){}}
   boolean result=ok;String text=message;new Handler(Looper.getMainLooper()).post(()->cb.done(result,text));
  },"native-email-verification").start();
 }
}

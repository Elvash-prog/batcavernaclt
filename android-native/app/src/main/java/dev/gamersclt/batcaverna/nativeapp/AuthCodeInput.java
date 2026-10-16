package dev.gamersclt.batcaverna.nativeapp;
import java.net.URI;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Map;
/** Parses credentials locally. Never fetches a pasted URL. */
final class AuthCodeInput {
 final String token,type; final boolean hash;
 private AuthCodeInput(String token,String type,boolean hash){this.token=token;this.type=type;this.hash=hash;}
 static AuthCodeInput parse(String value,boolean recovery){
  if(value!=null&&value.length()>4096)throw new IllegalArgumentException("O código ou link é muito longo.");
  String raw=value==null?"":value.trim();String expected=recovery?"recovery":"email";
  if(raw.matches("[0-9]{6,10}"))return new AuthCodeInput(raw,expected,false);
  try{
   URI u=URI.create(raw);
   if(!"https".equals(u.getScheme())||!"luoqlhgfmixvfqbfcdoc.supabase.co".equals(u.getHost())||u.getPort()!=-1||u.getUserInfo()!=null||u.getFragment()!=null||!"/auth/v1/verify".equals(u.getRawPath()))throw new Exception();
   Map<String,String> params=new HashMap<>();for(String pair:u.getRawQuery().split("&")){String[] parts=pair.split("=",2);String key=URLDecoder.decode(parts[0],"UTF-8"),v=parts.length==2?URLDecoder.decode(parts[1],"UTF-8"):"";if(params.put(key,v)!=null)throw new Exception();}
   String type=params.get("type"),token=params.get("token_hash");if(token==null)token=params.get("token");
   if(params.containsKey("token_hash")&&params.containsKey("token"))throw new Exception();
   if(recovery?!"recovery".equals(type):!("signup".equals(type)||"email".equals(type)))throw new Exception();
   if(token==null||!token.matches("[A-Za-z0-9_-]{20,256}"))throw new Exception();
   return new AuthCodeInput(token,type,true);
  }catch(Exception e){throw new IllegalArgumentException("Informe o código ou copie o link original do e-mail, sem abri-lo.");}
 }
}

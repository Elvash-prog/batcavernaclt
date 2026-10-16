package dev.gamersclt.batcaverna.nativeapp;
import java.net.URI;
final class UpdatePolicy {
 static void validateUrl(String value){
  URI uri=URI.create(value);
  if(!"https".equals(uri.getScheme())||!"github.com".equals(uri.getHost())||uri.getUserInfo()!=null||uri.getPort()!=-1||uri.getRawQuery()!=null||uri.getRawFragment()!=null||!uri.getRawPath().startsWith("/Elvash-prog/batcavernaclt/releases/download/android-v")||uri.getRawPath().contains("..")||uri.getRawPath().contains("%"))throw new IllegalArgumentException("Endereço de atualização inválido.");
 }
}

package dev.gamersclt.batcaverna.nativeapp;

final class AccountMediaSource {
 static String normalize(String value,String base){
  if(value==null)return "";String source=value.trim();if(source.isEmpty()||source.equals("null"))return "";
  if(source.startsWith("https://")||source.startsWith("http://"))return source;
  if(source.startsWith("/storage/v1/object/"))return base+source;
  if(source.startsWith("storage/v1/object/"))return base+"/"+source;
  if(source.contains("..")||source.matches(".*[:?#\\\\].*")||source.startsWith("/"))return "";
  for(String bucket:new String[]{"avatars","feed-media","chat-media","group-avatars","group-chat-media"})if(source.startsWith(bucket+"/"))return base+"/storage/v1/object/authenticated/"+source;
  if(source.matches("[0-9a-fA-F-]{36}/[a-zA-Z0-9._/-]+"))return base+"/storage/v1/object/authenticated/avatars/"+source;
  return "";
 }
}

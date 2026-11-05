package dev.gamersclt.batcaverna.nativeapp;
/** An explicit retry retains its identity; edits or another conversation start a new send. */
final class ChatSendAttempt {
 private String owner="",target="",text="",attachment="",id="";
 String begin(String user,String thread,String message){return begin(user,thread,message,"");}
 String begin(String user,String thread,String message,String image){if(id.isEmpty()||!owner.equals(user)||!target.equals(thread)||!text.equals(message)||!attachment.equals(image)){owner=user;target=thread;text=message;attachment=image;id=java.util.UUID.randomUUID().toString();}return id;}
 void clear(){id="";}
}

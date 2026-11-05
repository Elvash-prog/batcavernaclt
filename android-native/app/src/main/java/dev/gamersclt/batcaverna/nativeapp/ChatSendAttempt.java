package dev.gamersclt.batcaverna.nativeapp;
/** An explicit retry retains its identity; edits or another conversation start a new send. */
final class ChatSendAttempt {
 private String owner="",target="",text="",id="";
 String begin(String user,String thread,String message){if(id.isEmpty()||!owner.equals(user)||!target.equals(thread)||!text.equals(message)){owner=user;target=thread;text=message;id=java.util.UUID.randomUUID().toString();}return id;}
 void clear(){id="";}
}

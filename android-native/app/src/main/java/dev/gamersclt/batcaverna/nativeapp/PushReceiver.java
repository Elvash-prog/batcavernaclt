package dev.gamersclt.batcaverna.nativeapp;
import com.google.firebase.messaging.*;
/** Data messages only: notifications are gated by the active account and opt-in. */
public final class PushReceiver extends FirebaseMessagingService {
 @Override public void onMessageReceived(RemoteMessage message){String user=SessionPreferences.get(this).getString("user_id","");if(user.isEmpty()||!user.equals(message.getData().get("user_id")))return;String id=message.getData().get("id"),body=message.getData().get("message");if(id!=null&&body!=null)NativeAlerts.show(this,id,body);}
 @Override public void onNewToken(String token){SessionPreferences.get(this).edit().putString("fcm_token",token).apply();PushSetup.register(this);}
}

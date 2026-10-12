package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
final class PushSetup {
 static void register(Context c){if(FirebaseApp.getApps(c).isEmpty())return;android.content.SharedPreferences prefs=c.getSharedPreferences("batcaverna",0);if(!prefs.getBoolean("native_alerts",false)||!prefs.getBoolean("authenticated",false))return;String user=prefs.getString("user_id","");FirebaseMessaging.getInstance().getToken().addOnSuccessListener(token->{if(!user.equals(prefs.getString("user_id",""))||!prefs.getBoolean("native_alerts",false))return;new AccountRepository(c).pushToken(token,(r,e)->{if(!user.equals(prefs.getString("user_id","")))return;prefs.edit().putBoolean("fcm_registered",e==null).putString("push_status",e==null?"Dispositivo registrado no servidor":"Firebase configurado; cadastro no servidor pendente: "+e).apply();if(e==null)prefs.edit().putString("fcm_token",token).apply();});});}
 static void revoke(Context c){if(!FirebaseApp.getApps(c).isEmpty())FirebaseMessaging.getInstance().deleteToken();}
}

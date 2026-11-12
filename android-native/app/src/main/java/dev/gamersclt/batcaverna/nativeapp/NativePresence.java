package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.os.*;
import okhttp3.*;
import org.json.*;
import java.util.*;
/** Foreground presence with bounded publishing, separate heartbeats and retry cooldowns. */
final class NativePresence {
 interface Clock {long now();}
 interface Listener {void changed(JSONObject state,boolean connected);}
 private final Context context;
 private final Handler main=new Handler(Looper.getMainLooper());
 private final OkHttpClient client=new OkHttpClient.Builder().build();
 private final Set<Listener> listeners=new HashSet<>();
 private final Map<String,JSONObject> peers=new HashMap<>();
 private final Clock clock;
 private PresenceSendPolicy publisher=new PresenceSendPolicy();
 private WebSocket socket;private String token="",user="",joinRef="";
 private boolean active,joined,tracking,pending;
 private int epoch,ref,trackEpoch;
 private long lastFrame,retry=2000,rateUntil,lastSample=-1,joinedAt;
 private static final String TOPIC="realtime:platinados-presenca";
 NativePresence(Context c){this(c,android.os.SystemClock::elapsedRealtime);}
 NativePresence(Context c,Clock time){context=c.getApplicationContext();clock=time;}
 void listen(Listener l){listeners.add(l);l.changed(snapshot(),joined);}
 void remove(Listener l){listeners.remove(l);}
 private JSONObject snapshot(){JSONObject value=new JSONObject();for(Map.Entry<String,JSONObject> e:peers.entrySet())try{value.put(e.getKey(),e.getValue());}catch(JSONException ignored){}return value;}
 private void emit(){JSONObject s=snapshot();for(Listener l:new ArrayList<>(listeners))l.changed(s,joined);}
 void foreground(boolean value){
  active=value;
  if(value){if(socket==null)connect();}
  else{epoch++;trackEpoch++;main.removeCallbacksAndMessages(null);if(socket!=null)socket.cancel();socket=null;joined=false;tracking=false;pending=false;peers.clear();emit();}
 }
 private final Runnable reconnect=this::connect;
 private void connect(){
  if(!active||socket!=null)return;
  main.removeCallbacks(reconnect);
  long cooldown=rateUntil-clock.now();if(cooldown>0){main.postDelayed(reconnect,cooldown);return;}
  peers.clear();joined=false;tracking=false;pending=false;publisher=new PresenceSendPolicy();lastSample=-1;emit();
  int ticket=++epoch;
  new Thread(()->{try{
   String auth=AuthSession.token(context),uid=SessionPreferences.get(context).getString("user_id","");
   String[] cfg=SupabaseAuthClient.loadConfig();
   String url=cfg[0].replace("https://","wss://")+"/realtime/v1/websocket?apikey="+java.net.URLEncoder.encode(cfg[1],"UTF-8")+"&vsn=1.0.0";
   main.post(()->{if(!active||ticket!=epoch)return;token=auth;user=uid;
    socket=client.newWebSocket(new Request.Builder().url(url).build(),new WebSocketListener(){
     public void onOpen(WebSocket ws,Response response){main.post(()->{if(ticket!=epoch)return;lastFrame=clock.now();try{
      main.postDelayed(()->{if(ticket==epoch&&!joined)lost(ticket);},15000);
      if(!send("phx_join",new JSONObject().put("access_token",token).put("config",new JSONObject().put("presence",new JSONObject().put("key",user).put("enabled",true)).put("broadcast",new JSONObject().put("ack",false).put("self",false)).put("private",false))))lost(ticket);
     }catch(JSONException e){lost(ticket);}});}
     public void onMessage(WebSocket ws,String message){main.post(()->{if(ticket==epoch)receive(message);});}
     public void onFailure(WebSocket ws,Throwable t,Response response){main.post(()->lost(ticket));}
     public void onClosed(WebSocket ws,int code,String reason){main.post(()->lost(ticket));}
    });
   });
  }catch(Exception e){main.post(()->lost(ticket));}},"presence-connect").start();
 }
 private void lost(int ticket){
  if(ticket!=epoch)return;
  long now=clock.now();if(joined&&now-joinedAt>=120000)retry=2000;
  epoch++;trackEpoch++;main.removeCallbacks(heartbeat);main.removeCallbacks(presenceRefresh);main.removeCallbacks(reconnect);
  if(socket!=null)socket.cancel();socket=null;joined=false;tracking=false;pending=false;peers.clear();emit();
  if(active){main.postDelayed(reconnect,Math.max(retry,rateUntil-now));retry=Math.min(30000,retry*2);}
 }
 private boolean send(String event,JSONObject payload){
  if(socket==null)return false;
  try{String id=String.valueOf(++ref);if(event.equals("phx_join"))joinRef=id;
   return socket.send(new JSONObject().put("topic",TOPIC).put("event",event).put("payload",payload).put("ref",id).put("join_ref",joinRef).toString());
  }catch(JSONException e){return false;}
 }
 private final Runnable heartbeat=new Runnable(){public void run(){
  if(!active||socket==null)return;
  if(clock.now()-lastFrame>60000){lost(epoch);return;}
  if(!token.equals(SessionPreferences.get(context).getString("access_token",""))||SessionPreferences.get(context).getLong("expires_at",0)<=System.currentTimeMillis()){lost(epoch);return;}
  try{if(!socket.send(new JSONObject().put("topic","phoenix").put("event","heartbeat").put("payload",new JSONObject()).put("ref",String.valueOf(++ref)).toString())){lost(epoch);return;}}catch(JSONException e){lost(epoch);return;}
  main.postDelayed(this,20000);
 }};
 private final Runnable presenceRefresh=new Runnable(){public void run(){if(!active||!joined)return;track();main.postDelayed(this,30000);}};
 private void receive(String text){
  if(text.length()>1048576)return;lastFrame=clock.now();
  try{JSONObject frame=new JSONObject(text);if(!TOPIC.equals(frame.optString("topic")))return;
   String event=frame.optString("event");JSONObject payload=frame.optJSONObject("payload");if(payload==null)return;
   boolean error=event.equals("system")&&payload.optString("status").equals("error")||event.equals("phx_reply")&&payload.optString("status").equals("error");
   if(error){if(PresenceSendPolicy.rateLimited(payload.toString()))rateUntil=Math.max(rateUntil,clock.now()+PresenceSendPolicy.RATE_COOLDOWN);lost(epoch);return;}
   if(event.equals("phx_reply")&&!joinRef.isEmpty()&&frame.optString("ref").equals(joinRef)&&payload.optString("status").equals("ok")&&!joined){
    joined=true;joinedAt=clock.now();main.removeCallbacks(heartbeat);main.postDelayed(heartbeat,20000);main.removeCallbacks(presenceRefresh);presenceRefresh.run();emit();
   }else if(event.equals("presence_state")){peers.clear();merge(payload,false);emit();}
   else if(event.equals("presence_diff")){JSONObject leaves=payload.optJSONObject("leaves"),joins=payload.optJSONObject("joins");if(leaves!=null)merge(leaves,true);if(joins!=null)merge(joins,false);emit();}
   else if(event.equals("phx_error")||event.equals("phx_close")){lost(epoch);}
  }catch(JSONException ignored){}
 }
 private void merge(JSONObject change,boolean remove)throws JSONException{
  Iterator<String> ids=change.keys();while(ids.hasNext()){String id=ids.next();JSONObject entry=change.optJSONObject(id);if(entry==null)continue;JSONArray previous=peers.containsKey(id)?peers.get(id).optJSONArray("metas"):null;JSONArray next=PeerActivity.merge(previous,entry.optJSONArray("metas"),remove);if(next.length()==0)peers.remove(id);else peers.put(id,new JSONObject().put("metas",next));}
 }
 void refresh(){if(active&&joined){main.removeCallbacks(presenceRefresh);long delay=lastSample<0?0:Math.max(0,5000-(clock.now()-lastSample));main.postDelayed(presenceRefresh,delay);}}
 private boolean validTrack(int ticket){return ticket==trackEpoch&&active&&joined&&socket!=null&&user.equals(SessionPreferences.get(context).getString("user_id",""));}
 private void publish(JSONObject profile,JSONObject game,int ticket){
  if(!validTrack(ticket))return;String status=PresencePolicy.status(profile.optString("status_personalizado","online"));
  try{boolean visible=PresencePolicy.visible(status);String name=game==null?"":game.optString("nome",game.optString("name",""));
   JSONObject data=new JSONObject().put("nome",profile.optString("nome")).put("slug",profile.optString("slug")).put("avatar",profile.optString("avatar_url")).put("status",status).put("jogo",name).put("jogo_fonte",PresencePolicy.gameSource(name)).put("device","android").put("activity_known",true).put("activity_shared",true);
   String event=publisher.next(data.toString(),visible,clock.now());if(event.isEmpty())return;
   if(visible)data.put("online_at",System.currentTimeMillis());else data=new JSONObject();
   if(!send("presence",new JSONObject().put("type","presence").put("event",event).put("payload",data)))lost(epoch);
  }catch(JSONException ignored){}
 }
 private void finishTrack(int ticket){if(ticket!=trackEpoch)return;tracking=false;if(pending){pending=false;refresh();}}
 private void track(){
  if(tracking){pending=true;return;}tracking=true;lastSample=clock.now();final int ticket=++trackEpoch;
  new AccountRepository(context).load(true,0,(rows,error)->{
   if(!validTrack(ticket))return;
   if(error!=null||rows==null||rows.length()==0){try{publish(new JSONObject().put("status_personalizado","invisivel"),null,ticket);}catch(JSONException ignored){}finishTrack(ticket);return;}
   JSONObject profile=rows.optJSONObject(0);if(profile==null){finishTrack(ticket);return;}
   if(!PresencePolicy.visible(profile.optString("status_personalizado","online"))){publish(profile,null,ticket);finishTrack(ticket);return;}
   new AccountRepository(context).currentSteam((games,steamError)->{publish(profile,steamError==null&&games!=null&&games.length()>0?games.optJSONObject(0):null,ticket);finishTrack(ticket);});
  });
 }
}

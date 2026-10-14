package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import android.widget.*;
final class ChatHubView extends LinearLayout {
 private final FriendsDataView conversations;private final GroupsView groups;private final FrameLayout stage;private boolean group,active;private final Button privateTab,groupTab;private final TextView liveState;
 ChatHubView(Context c){super(c);setOrientation(VERTICAL);LinearLayout tabs=new LinearLayout(c);tabs.setPadding(dp(16),dp(4),dp(16),0);privateTab=button("Conversas");groupTab=button("Grupos");tabs.addView(privateTab,new LayoutParams(0,dp(44),1));tabs.addView(groupTab,new LayoutParams(0,dp(44),1));addView(tabs);liveState=NativeSheet.text(c,"◌ Atualização automática",10,0xffe5b675);liveState.setPadding(dp(18),0,dp(18),dp(3));addView(liveState);stage=new FrameLayout(c);addView(stage,new LayoutParams(-1,0,1));conversations=new FriendsDataView(c,true);groups=new GroupsView(c);Runnable style=()->{AppStyle.button(privateTab,!group);AppStyle.button(groupTab,group);};privateTab.setOnClickListener(v->{switchTo(false);style.run();});groupTab.setOnClickListener(v->{switchTo(true);style.run();});switchTo(false);style.run();}
 void openNotification(boolean isGroup,String id){switchTo(isGroup);AppStyle.button(privateTab,!isGroup);AppStyle.button(groupTab,isGroup);if(id==null||id.isEmpty())return;if(isGroup)groups.openNotification(id);else conversations.openNotification(id);}
 private void switchTo(boolean value){conversations.setForeground(false);groups.setForeground(false);group=value;stage.removeAllViews();stage.addView(group?groups:conversations);setForeground(active);}
 void realtimeConnection(boolean ready){liveState.setText(ready?"● Ao vivo":"◌ Atualização automática");liveState.setTextColor(ready?0xff7ce2b0:0xffe5b675);conversations.realtimeConnection(ready);groups.realtimeConnection(ready);}
 void realtimeEvent(String table,String type,String id){conversations.realtimeEvent(table,type,id);groups.realtimeEvent(table,type,id);}
 void unread(org.json.JSONObject counts){org.json.JSONObject one=counts.optJSONObject("private"),two=counts.optJSONObject("groups");int p=total(one),g=total(two);privateTab.setText("Conversas"+(p>0?" • "+p:""));groupTab.setText("Grupos"+(g>0?" • "+g:""));conversations.unread(one);groups.unread(two);}
 private int total(org.json.JSONObject map){int total=0;if(map!=null){java.util.Iterator<String> keys=map.keys();while(keys.hasNext())total+=map.optInt(keys.next());}return total;}
 void setForeground(boolean value){active=value;conversations.setForeground(value&&!group);groups.setForeground(value&&group);}
 boolean back(){return group?groups.back():conversations.back();}
 private Button button(String text){Button b=new Button(getContext());b.setText(text);AppStyle.button(b,false);return b;}
 private int dp(int n){return NativeSheet.dp(getContext(),n);}
}

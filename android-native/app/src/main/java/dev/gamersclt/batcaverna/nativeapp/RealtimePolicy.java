package dev.gamersclt.batcaverna.nativeapp;
import java.util.*;
/** Acknowledged subscription IDs gate events; socket-open is not database-ready. */
final class RealtimePolicy {
 static final String[] TABLES={"clt_chat_messages","clt_chat_reactions","clt_chat_group_messages","clt_chat_group_reactions","clt_chat_group_members","clt_chat_group_reads","clt_chat_group_invites","notificacoes"};
 private final Map<String,Long> subscriptions=new HashMap<>();
 void joined(String table,long id){if(Arrays.asList(TABLES).contains(table)&&id>=0)subscriptions.put(table,id);}
 boolean accepts(String table,long id){return subscriptions.containsKey(table)&&subscriptions.get(table)==id;}
 boolean ready(){return subscriptions.size()==TABLES.length;}
 void failed(String table){subscriptions.remove(table);}
 void clear(){subscriptions.clear();}
 static long retry(int failures){return Math.min(30000L,2000L*(1L<<Math.min(4,Math.max(0,failures))));}
}

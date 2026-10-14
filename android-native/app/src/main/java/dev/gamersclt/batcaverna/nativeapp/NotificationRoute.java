package dev.gamersclt.batcaverna.nativeapp;
import java.util.Locale;
public final class NotificationRoute {
 public static boolean opensComments(String type){return "social_comment".equalsIgnoreCase(type)||"social_reply".equalsIgnoreCase(type);}
 public static String destination(String type){if(type==null)return "inbox";switch(type.toLowerCase(Locale.ROOT)){
 case "friend_recommendation":return "recommendation";
 case "chat_message":return "chat";
 case "chat_group_message":return "group";
 case "convite":return "friends";
 case "amizade_aceita":return "friendProfile";
 case "group_invite":case "chat_group_invite":case "convite_grupo":return "groups";
 case "social_post":case "social_like":case "social_comment":case "social_reply":return "post";
 case "conquista":return "achievements";
 case "nivel":case "level":return "profile";
 case "missao":case "missao_concluida":return "missions";
 default:return "inbox";}}
}

package dev.gamersclt.batcaverna.nativeapp;

import org.json.JSONObject;

// Jogos fora da Steam chegam do catálogo sem App ID (null, vazio ou 0): o título é salvo sem ele.
final class SteamAppId {
 private SteamAppId(){}
 static void normalize(JSONObject draft){
  Object raw=draft.opt("steam_appid");
  String id=raw==null||raw==JSONObject.NULL?"":String.valueOf(raw).trim();
  if(id.isEmpty()||!id.matches("[1-9][0-9]{0,9}")||Long.parseLong(id)>4294967295L)draft.remove("steam_appid");
 }
}

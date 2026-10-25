package dev.gamersclt.batcaverna.nativeapp;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import java.util.Map;
import java.util.List;
import static org.junit.Assert.*;

public class RetroLibraryPolicyTest {
 private JSONObject game(int id,String name,int total,int earned)throws Exception{
  return new JSONObject().put("gameId",id).put("nome",name).put("total",total).put("desbloqueadas",earned);
 }
 @Test public void groupsKeepManualStatusAndProviderProgress()throws Exception{
  JSONArray games=new JSONArray().put(game(1,"Black",10,3)).put(game(2,"Sonic",10,10)).put(game(3,"Mario",10,0));
  JSONObject statuses=new JSONObject().put("1","paused");
  Map<String,List<JSONObject>> groups=RetroLibraryPolicy.groups(games,statuses,"");
  assertEquals(1,groups.get("paused").size());assertEquals(1,groups.get("platinum").size());assertEquals(1,groups.get("backlog").size());assertEquals(0,groups.get("progress").size());
  assertEquals("progress",groups.keySet().iterator().next());
 }
 @Test public void searchIgnoresCaseAndSurroundingSpaces()throws Exception{
  JSONArray games=new JSONArray().put(game(1,"Black",10,3)).put(game(2,"Sonic",10,0));
  Map<String,List<JSONObject>> groups=RetroLibraryPolicy.groups(games,null,"  bLaCk  ");
  assertEquals(1,groups.get("progress").size());assertTrue(groups.get("backlog").isEmpty());
 }
 @Test public void handlesEmptyCollectionsAndMalformedEntries()throws Exception{
  assertEquals(6,RetroLibraryPolicy.groups(null,null,null).size());
  JSONArray games=new JSONArray().put(JSONObject.NULL).put("not a game").put(game(1,"Black",0,0));
  assertEquals(1,RetroLibraryPolicy.groups(games,null,"").get("backlog").size());
 }
 @Test public void paginationDoesNotTruncateCollectionOrCounts()throws Exception{
  JSONArray games=new JSONArray();for(int i=0;i<40;i++)games.put(game(i,"Jogo "+i,10,1));
  List<JSONObject> group=RetroLibraryPolicy.groups(games,null,"").get("progress");
  assertEquals(40,group.size());assertEquals(6,RetroLibraryPolicy.visibleCount(group.size(),0));assertEquals(18,RetroLibraryPolicy.visibleCount(group.size(),18));assertEquals(40,RetroLibraryPolicy.visibleCount(group.size(),54));assertEquals(0,RetroLibraryPolicy.visibleCount(0,6));assertEquals(40,games.length());
 }
}

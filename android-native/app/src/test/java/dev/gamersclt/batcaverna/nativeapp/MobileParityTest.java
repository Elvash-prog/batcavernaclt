package dev.gamersclt.batcaverna.nativeapp;
import org.junit.Test;
import static org.junit.Assert.*;
import org.json.*;
import java.util.*;

public class MobileParityTest {
 @Test public void searchRejectsStaleAccountsAndSyntax(){
  assertEquals("João",FriendSearchInput.term(" @João "));assertEquals("foo id eq",FriendSearchInput.filter("foo),id.eq.*"));
  assertTrue(FriendSearchInput.current(2,2,"one","one",true));assertFalse(FriendSearchInput.current(1,2,"one","one",true));assertFalse(FriendSearchInput.current(2,2,"one","two",true));assertFalse(FriendSearchInput.current(2,2,"one","one",false));
 }
 @Test public void recommendationsUseOnlyTitleMetadata()throws Exception{
  for(String type:new String[]{"Jogo","🎬 Filme","📺 Série","🍥 Anime"}){JSONObject source=new JSONObject().put("id","sender-item").put("user_id","sender").put("nome","Título").put("categoria",type.equals("Jogo")?"jogos":"filmes").put("tipo",type).put("capa","https://image.tmdb.org/cover.jpg").put("horas",999).put("preco",100).put("review","segredo").put("status","concluido");JSONObject clean=RecommendationInput.draft(source);assertEquals(4,clean.length());assertFalse(clean.has("id"));assertFalse(clean.has("user_id"));assertFalse(clean.has("review"));assertFalse(clean.has("preco"));assertFalse(clean.has("status"));assertEquals(type.contains("Anime")?2:type.contains("Série")?1:0,RecommendationInput.type(clean));JSONObject payload=RecommendationInput.payload(source,"friend-id","Veja este");assertEquals("sender-item",payload.getString("item_id"));assertEquals("Título",payload.getString("item_name"));assertEquals(source.getString("categoria"),payload.getString("item_category"));assertEquals("friend-id",payload.getString("friend_id"));assertFalse(payload.has("review"));}
 }
 @Test public void resolvedRecommendationsAreNotActionable()throws Exception{
  assertTrue(RecommendationInput.pending(new JSONObject()));
  assertTrue(RecommendationInput.pending(new JSONObject().put("estado","pendente")));
  assertTrue(RecommendationInput.pending(new JSONObject().put("estado","enviada")));
  assertFalse(RecommendationInput.pending(new JSONObject().put("estado","interesse")));
  assertFalse(RecommendationInput.pending(new JSONObject().put("estado","dispensada")));
 }
 @Test public void diagnosticsHideCredentialsAndLimitLongValues(){
  assertEquals("conta [email]",NativeDiagnostics.clean("conta pessoa@exemplo.com",100));
  assertEquals("[dado-protegido]",NativeDiagnostics.clean("eyJabc.def.ghi",100));
  assertTrue(NativeDiagnostics.clean(String.join("",java.util.Collections.nCopies(250,"x")),300).contains("dado-protegido"));
 }
 @Test public void statisticsCountCompleteLibraryAndDates()throws Exception{
  Calendar clock=Calendar.getInstance(TimeZone.getTimeZone("America/Sao_Paulo"));clock.clear();clock.set(2026,Calendar.OCTOBER,12,12,0);JSONArray items=new JSONArray();
  for(int i=0;i<1201;i++)items.put(new JSONObject().put("categoria","jogos").put("status","🏆 Platinado").put("horas",1).put("data","2026-10-02"));
  items.put(new JSONObject().put("categoria","filmes").put("tipo","🍥 Anime").put("status","⭐ Favorito").put("data","2026-02-30"));
  items.put(new JSONObject().put("categoria","filmes").put("tipo","📺 Série").put("status","👀 Assistindo"));
  items.put(new JSONObject().put("categoria","filmes").put("tipo","🎬 Filme").put("status","✅ Assistido").put("data","2026-09-01"));
  JSONObject stats=NativeStatistics.calculate(items,clock.getTimeInMillis());assertEquals(1204,stats.getInt("total"));assertEquals(1203,stats.getInt("concluidos"));assertEquals(1201,stats.getInt("jogos"));assertEquals(1,stats.getInt("sem_data"));assertEquals(1201,stats.getDouble("horas"),.01);assertEquals(12,stats.getJSONArray("months").length());assertEquals("2025-11",stats.getJSONArray("months").getJSONObject(0).getString("mes"));assertEquals(1201,stats.getJSONArray("months").getJSONObject(11).getInt("jogos"));assertEquals(1,stats.getJSONArray("months").getJSONObject(10).getInt("midias"));
 }
 @Test public void avatarPathsAreNormalizedWithoutTraversal(){assertTrue(AccountMediaSource.normalize("avatars/user/photo.jpg","https://example.test").contains("/authenticated/avatars/"));assertEquals("",AccountMediaSource.normalize("../private.jpg","https://example.test"));}
}

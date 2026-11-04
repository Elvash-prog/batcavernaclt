package dev.gamersclt.batcaverna.nativeapp;
import org.json.*;
import org.junit.Test;
import static org.junit.Assert.*;
import java.nio.file.*;
import java.util.*;
public class LibraryQueryTest {
 private JSONArray fixture()throws Exception{return new JSONArray(new String(Files.readAllBytes(Paths.get(System.getProperty("library.fixture"))),java.nio.charset.StandardCharsets.UTF_8));}
 private List<JSONObject> rows(JSONArray source)throws Exception{List<JSONObject> rows=new ArrayList<>();for(int i=0;i<source.length();i++)rows.add(source.getJSONObject(i));return rows;}
 @Test public void wordsAndFiltersMatchTheSharedDesktopFixture()throws Exception{JSONArray data=fixture();List<String> ids=new ArrayList<>();for(JSONObject row:rows(data))if(LibraryQuery.matches(row,"ecarlate POKEMON","acao","PC"))ids.add(row.getString("id"));assertEquals(Arrays.asList("1"),ids);assertTrue(LibraryQuery.matches(data.getJSONObject(3),"serie","Ação","Prime Video"));assertFalse(LibraryQuery.matches(data.getJSONObject(4),"","RPG",""));}
 @Test public void ordersMatchDesktopIncludingRatingLabelsAndMilliseconds()throws Exception{JSONArray data=fixture();String before=data.toString();String[] orders={"rating","hours","recent","name"};String[][] expected={{"1","3","4","2","5"},{"3","2","1","5","4"},{"4","2","1","3","5"},{"5","2","1","4","3"}};for(int i=0;i<orders.length;i++){List<JSONObject> rows=rows(data);Collections.sort(rows,LibraryQuery.comparator(orders[i]));List<String> ids=new ArrayList<>();for(JSONObject row:rows)ids.add(row.getString("id"));assertEquals(orders[i],Arrays.asList(expected[i]),ids);}assertEquals(before,data.toString());}
 @Test public void choicesSplitMultiplePlatformsAndKeepAnActiveMissingFilter()throws Exception{assertEquals(Arrays.asList("Netflix","PC","Prime Video","Switch"),LibraryQuery.choices(fixture(),false,""));assertTrue(LibraryQuery.choices(fixture(),true,"Estratégia").contains("Estratégia"));assertEquals(7,LibraryQuery.rating("⭐⭐⭐½ Bom"),0);assertEquals(9,LibraryQuery.rating("4,5/5"),0);}
}

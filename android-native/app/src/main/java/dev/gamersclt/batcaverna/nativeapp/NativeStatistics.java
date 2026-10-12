package dev.gamersclt.batcaverna.nativeapp;
import org.json.*;
import java.util.*;
import java.text.*;

final class NativeStatistics {
 static JSONObject calculate(JSONArray items,long now)throws JSONException{
  TimeZone zone=TimeZone.getTimeZone("America/Sao_Paulo");Calendar first=Calendar.getInstance(zone);first.setTimeInMillis(now);first.set(Calendar.DAY_OF_MONTH,1);first.add(Calendar.MONTH,-11);
  SimpleDateFormat key=new SimpleDateFormat("yyyy-MM",Locale.ROOT);key.setTimeZone(zone);
  JSONArray months=new JSONArray();Map<String,JSONObject> byMonth=new LinkedHashMap<>();
  for(int i=0;i<12;i++){String month=key.format(first.getTime());JSONObject row=new JSONObject().put("mes",month).put("jogos",0).put("midias",0);months.put(row);byMonth.put(month,row);first.add(Calendar.MONTH,1);}
  int games=0,films=0,series=0,anime=0,finished=0,noDate=0;double hours=0;
  for(int i=0;i<items.length();i++){JSONObject item=items.optJSONObject(i);if(item==null)continue;boolean game="jogos".equals(item.optString("categoria"));if(game){games++;double n=item.optDouble("horas",0);if(!Double.isNaN(n)&&!Double.isInfinite(n)&&n>0)hours+=n;}else{String type=LibraryCategory.classify(item.optString("tipo"));if(type.equals("anime"))anime++;else if(type.equals("serie"))series++;else films++;}
   if(!LibraryStatus.finished(item.optString("status"),!game))continue;finished++;String date=item.optString("data","");boolean valid=false;
   if(date.matches("[12][0-9]{3}-[0-9]{2}-[0-9]{2}")){SimpleDateFormat parser=new SimpleDateFormat("yyyy-MM-dd",Locale.ROOT);parser.setLenient(false);parser.setTimeZone(zone);try{valid=parser.parse(date)!=null;}catch(ParseException ignored){}}
   if(!valid){noDate++;continue;}JSONObject bucket=byMonth.get(date.substring(0,7));if(bucket!=null){String field=game?"jogos":"midias";bucket.put(field,bucket.optInt(field)+1);}
  }
  return new JSONObject().put("total",games+films+series+anime).put("jogos",games).put("filmes",films).put("series",series).put("animes",anime).put("concluidos",finished).put("horas",hours).put("sem_data",noDate).put("months",months).put("_local",true);
 }
}

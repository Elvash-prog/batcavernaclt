package dev.gamersclt.batcaverna.nativeapp;
import org.json.*;
import java.util.*;
/** Recorded totals and month keys; absent history stays absent. */
final class StatisticsData {
 final int total,finished,undated;final double hours;final int[] categories;final List<Month> months;
 StatisticsData(JSONObject p){total=count(p.opt("total"));finished=count(p.opt("concluidos"));undated=count(p.opt("sem_data"));hours=number(p.opt("horas"));categories=new int[]{count(p.opt("jogos")),count(p.opt("filmes")),count(p.opt("series")),count(p.opt("animes"))};TreeMap<String,Month> map=new TreeMap<>();JSONArray rows=p.optJSONArray("months");for(int i=0;rows!=null&&i<rows.length();i++){JSONObject row=rows.optJSONObject(i);if(row==null)continue;String key=row.optString("mes");if(key.matches("[1-9][0-9]{3}-(0[1-9]|1[0-2])"))map.put(key,new Month(key,count(row.opt("jogos")),count(row.opt("midias"))));}months=Collections.unmodifiableList(new ArrayList<>(map.values()));}
 List<Month> period(int span){return months.subList(Math.max(0,months.size()-(span==6?6:12)),months.size());}
 int completion(){return total==0?-1:(int)Math.min(100,Math.round(finished*100d/total));}
 static double number(Object value){try{double n=value instanceof Number?((Number)value).doubleValue():Double.parseDouble(String.valueOf(value));return !Double.isNaN(n)&&!Double.isInfinite(n)&&n>0?n:0;}catch(Exception ignored){return 0;}}
 private static int count(Object value){return (int)Math.min(Integer.MAX_VALUE,Math.floor(number(value)));}
 static String integer(long value){return java.text.NumberFormat.getIntegerInstance(new Locale("pt","BR")).format(value);}
 static String hours(double value){java.text.NumberFormat f=java.text.NumberFormat.getNumberInstance(new Locale("pt","BR"));f.setMaximumFractionDigits(1);return f.format(value)+"h";}
 static final class Month {
  final String key;final int games,media;
  Month(String key,int games,int media){this.key=key;this.games=games;this.media=media;}
  long total(){return (long)games+media;}
  String shortLabel(){return key.substring(5)+"/"+key.substring(2,4);}
  String label(){String[] names={"janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"};return names[Integer.parseInt(key.substring(5))-1]+" de "+key.substring(0,4);}
  String detail(){return integer(games)+(games==1?" jogo · ":" jogos · ")+integer(media)+(media==1?" mídia · ":" mídias · ")+integer(total())+" no total";}
 }
}

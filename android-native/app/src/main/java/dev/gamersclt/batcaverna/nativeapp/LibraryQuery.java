package dev.gamersclt.batcaverna.nativeapp;
import org.json.*;
import java.text.*;
import java.util.*;
/** Lookup-only normalization; persisted titles and user ratings are not rewritten. */
final class LibraryQuery {
 private static final java.util.regex.Pattern ACCENTS=java.util.regex.Pattern.compile("[\\u0300-\\u036f]"),SPACES=java.util.regex.Pattern.compile("\\s+"),NUMBER=java.util.regex.Pattern.compile("[-+]?\\d+(?:[.,]\\d+)?"),FRACTION=java.util.regex.Pattern.compile("\\.(\\d+)(?=Z|[+-])");
 static String clean(Object value){return value==null||value==JSONObject.NULL||"null".equals(String.valueOf(value))?"":String.valueOf(value).trim();}
 static String fold(Object value){return SPACES.matcher(ACCENTS.matcher(Normalizer.normalize(clean(value),Normalizer.Form.NFD)).replaceAll("").toLowerCase(new Locale("pt","BR"))).replaceAll(" ");}
 static List<String> tags(Object value){List<String> out=new ArrayList<>();if(value instanceof JSONArray){JSONArray array=(JSONArray)value;for(int i=0;i<array.length();i++){String tag=clean(array.opt(i));if(!tag.isEmpty())out.add(tag);}}else for(String part:clean(value).split("[•,|]")){String tag=clean(part);if(!tag.isEmpty())out.add(tag);}return out;}
 static List<String> platforms(JSONObject row){if(!row.optString("categoria").isEmpty()&&!row.optString("categoria").equals("jogos"))return tags(row.opt("onde"));String value=clean(row.opt("plataforma"));return tags(value.isEmpty()?row.opt("onde"):value);}
 private static final Map<JSONObject,SearchEntry> SEARCH=new WeakHashMap<>();
 private static final Map<JSONObject,SortEntry> SORT=new WeakHashMap<>();
 private static final Collator NAMES=Collator.getInstance(new Locale("pt","BR"));
 private static Filter lastFilter;
 private static List<String> folded(List<String> source){List<String> out=new ArrayList<>();for(String value:source)out.add(fold(value));return out;}
 private static final class SearchEntry {
  final String title,genres,platform,where,category,name;private List<String> genreKeys,platformKeys;
  SearchEntry(JSONObject row){title=row.optString("nome");genres=clean(row.opt("generos"));platform=clean(row.opt("plataforma"));where=clean(row.opt("onde"));category=row.optString("categoria");name=fold(title);}
  synchronized boolean hasGenre(JSONObject row,String key){if(genreKeys==null)genreKeys=folded(tags(row.opt("generos")));return genreKeys.contains(key);}
  synchronized boolean hasPlatform(JSONObject row,String key){if(platformKeys==null)platformKeys=folded(platforms(row));return platformKeys.contains(key);}
  boolean current(JSONObject row){return title.equals(row.optString("nome"))&&genres.equals(clean(row.opt("generos")))&&platform.equals(clean(row.opt("plataforma")))&&where.equals(clean(row.opt("onde")))&&category.equals(row.optString("categoria"));}
 }
 private static synchronized SearchEntry searchEntry(JSONObject row){SearchEntry value=SEARCH.get(row);if(value==null||!value.current(row)){value=new SearchEntry(row);SEARCH.put(row,value);}return value;}
 static final class Filter {
  final String query,genre,platform;private final String[] words;private final String genreKey,platformKey;
  Filter(String query,String genre,String platform){this.query=query;this.genre=genre;this.platform=platform;String folded=fold(query);words=folded.isEmpty()?new String[0]:folded.split(" ");genreKey=fold(genre);platformKey=fold(platform);}
  boolean matches(JSONObject row){if(words.length==0&&genreKey.isEmpty()&&platformKey.isEmpty())return true;SearchEntry value=searchEntry(row);for(String word:words)if(!value.name.contains(word))return false;return (genreKey.isEmpty()||value.hasGenre(row,genreKey))&&(platformKey.isEmpty()||value.hasPlatform(row,platformKey));}
 }
 static synchronized Filter filter(String query,String genre,String platform){query=clean(query);genre=clean(genre);platform=clean(platform);if(lastFilter==null||!lastFilter.query.equals(query)||!lastFilter.genre.equals(genre)||!lastFilter.platform.equals(platform))lastFilter=new Filter(query,genre,platform);return lastFilter;}
 static boolean matches(String title,String query){Filter lookup=filter(query,"","");if(lookup.words.length==0)return true;String name=fold(title);for(String word:lookup.words)if(!name.contains(word))return false;return true;}
 static boolean matches(JSONObject row,String query,String genre,String platform){return filter(query,genre,platform).matches(row);}
 static double numeric(Object value){if(value instanceof Number){double n=((Number)value).doubleValue();return Double.isNaN(n)||Double.isInfinite(n)?0:n;}java.util.regex.Matcher match=NUMBER.matcher(clean(value));if(!match.find())return 0;try{return Double.parseDouble(match.group().replace(',','.'));}catch(NumberFormatException e){return 0;}}
 static double rating(Object value){String s=fold(value);if(s.isEmpty()||s.contains("sem avaliacao")||s.contains("a considerar"))return -1;String[] labels={"goty","lenda","obra-prima","obra prima","excelente","muito bom","bom","ok","fraco","ruim"};double[] ranks={11,11,10,10,9,8,7,6,4,2};for(int i=0;i<labels.length;i++)if(s.contains(labels[i]))return ranks[i];int stars=0;for(int i=0;i<s.length();i++)if(s.charAt(i)=='⭐')stars++;if(stars>0)return stars*2+(s.contains("½")?1:0);return s.matches(".*\\d.*")?numeric(s)*(s.matches(".*?/\\s*5\\b.*")?2:1):-1;}
 static List<String> choices(JSONArray rows,boolean genres,String selected){Map<String,String> values=new LinkedHashMap<>();for(int i=0;i<rows.length();i++){JSONObject row=rows.optJSONObject(i);if(row==null)continue;for(String value:genres?tags(row.opt("generos")):platforms(row))values.put(fold(value),value);}if(!selected.isEmpty())values.put(fold(selected),selected);List<String> out=new ArrayList<>(values.values());Collections.sort(out,Collator.getInstance(new Locale("pt","BR")));return out;}
 private static long epoch(String value){long seconds=MessageTime.epoch(value);java.util.regex.Matcher m=FRACTION.matcher(value);if(seconds!=0&&m.find()){String digits=(m.group(1)+"000").substring(0,3);return seconds+Integer.parseInt(digits);}return seconds;}
 private static final class SortEntry {
  final String name,id,note,hours,updated;final Object rawHours;final CollationKey title;Double ratingValue,hourValue;Long timestamp;
  SortEntry(JSONObject row){name=row.optString("nome");id=row.optString("id");note=clean(row.opt("nota"));rawHours=row.opt("horas");hours=clean(rawHours);updated=row.optString("updated_at");title=NAMES.getCollationKey(name);}
  boolean current(JSONObject row){return name.equals(row.optString("nome"))&&id.equals(row.optString("id"))&&note.equals(clean(row.opt("nota")))&&(rawHours instanceof Number)==(row.opt("horas") instanceof Number)&&hours.equals(clean(row.opt("horas")))&&updated.equals(row.optString("updated_at"));}
  synchronized double value(String order){if(order.equals("name"))return 0;if(order.equals("rating")){if(ratingValue==null)ratingValue=rating(note);return ratingValue;}if(order.equals("hours")){if(hourValue==null)hourValue=Math.max(0,numeric(rawHours));return hourValue;}if(timestamp==null)timestamp=epoch(updated);return timestamp;}
 }
 private static synchronized SortEntry sortEntry(JSONObject row){SortEntry value=SORT.get(row);if(value==null||!value.current(row)){value=new SortEntry(row);SORT.put(row,value);}return value;}
 static Comparator<JSONObject> comparator(String order){Map<JSONObject,SortEntry> values=new IdentityHashMap<>();return (a,b)->{SortEntry x=values.get(a),y=values.get(b);if(x==null){x=sortEntry(a);values.put(a,x);}if(y==null){y=sortEntry(b);values.put(b,y);}int result=Double.compare(y.value(order),x.value(order));if(result!=0)return result;result=x.title.compareTo(y.title);return result!=0?result:x.id.compareTo(y.id);};}
}

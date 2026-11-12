import dev.gamersclt.batcaverna.nativeapp.CoverPolicy;
public class CoverPolicyTest {
 public static void main(String[] args){
  for(String url:new String[]{"https://shared.fastly.steamstatic.com/a.jpg","https://image.tmdb.org/t/p/w500/a.jpg","https://images.igdb.com/igdb/image/upload/t_cover_big/a.jpg","https://s4.anilist.co/a.jpg"})if(!CoverPolicy.publicUrl(url))throw new AssertionError(url);
  for(String url:new String[]{"https://batcavernaclt.gamersclt.workers.dev/fundo.jpg","https://batcavernaclt.gamersclt.workers.dev/api/account/login","https://batcavernaclt.gamersclt.workers.dev.evil.test/fundo.jpg","http://batcavernaclt.gamersclt.workers.dev/fundo.jpg","file:///tmp/a.jpg","https://unknown.test/a.jpg",null})if(CoverPolicy.publicUrl(url))throw new AssertionError(url);
  if(CoverPolicy.candidates("", "570").length!=6)throw new AssertionError();
  if(CoverPolicy.candidates("https://images.igdb.com/igdb/image/upload/t_cover_big/a.jpg", "570").length!=1)throw new AssertionError();
  if(CoverPolicy.candidates(null,"../5").length!=0)throw new AssertionError();
  if(!CoverPolicy.candidates("https://images.igdb.com/igdb/image/upload/t_cover_big/a b.jpg","")[0].contains("%20"))throw new AssertionError();
  if(!CoverPolicy.candidates("http://images.igdb.com/igdb/image/upload/t_cover_big/a.jpg","")[0].startsWith("https://"))throw new AssertionError();
  if(CoverPolicy.publicUrl(CoverPolicy.candidates("http://evil.test/a.jpg","")[0]))throw new AssertionError();
  for(String candidate:CoverPolicy.candidates("","570"))if(!CoverPolicy.publicUrl(candidate))throw new AssertionError(candidate);
  for(String source:new String[]{"https://images.igdb.com/igdb/image/upload/t_cover_big/a.jpg","https://cdn2.steamgriddb.com/grid/b.png","https://example.test/custom.jpg"}){String[] selected=CoverPolicy.candidates(source,"570");if(selected.length!=1||!selected[0].equals(source))throw new AssertionError("Saved cover was replaced");}
  System.out.println("CoverPolicy: 29 checks passed");
 }
}

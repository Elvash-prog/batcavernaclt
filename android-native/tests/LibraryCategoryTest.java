import dev.gamersclt.batcaverna.nativeapp.LibraryCategory;
public class LibraryCategoryTest {
 public static void main(String[] args){
  String[][] cases={{null,"filme"},{"","filme"},{"🎬 Filme","filme"},{"🎨 Animação","filme"},{"📺 Série","serie"},{"SERIE","serie"},{"SÉRIE","serie"},{"🍥 Anime","anime"},{"Anime Série","anime"},{"🍥","anime"},{"📺","serie"}};
  for(String[] c:cases)if(!LibraryCategory.classify(c[0]).equals(c[1]))throw new AssertionError(c[0]);
  if(!LibraryCategory.filter(0).isEmpty())throw new AssertionError();
  if(!LibraryCategory.filter(1).contains("tipo.is.null"))throw new AssertionError();
  if(!LibraryCategory.filter(2).contains("tipo.not.ilike.*anime*"))throw new AssertionError();
  if(!LibraryCategory.filter(3).startsWith("or="))throw new AssertionError();
  try{LibraryCategory.filter(4);throw new AssertionError();}catch(IllegalArgumentException expected){}
  System.out.println("LibraryCategory: 16 checks passed");
 }
}

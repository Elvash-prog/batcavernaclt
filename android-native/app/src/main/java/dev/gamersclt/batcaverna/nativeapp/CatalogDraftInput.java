package dev.gamersclt.batcaverna.nativeapp;
import java.text.SimpleDateFormat;
import java.text.ParsePosition;
import java.util.Locale;
public final class CatalogDraftInput {
 public static void validate(String name,String year,String genres,String start,String finish,String review){
  GameInput.name(name);if(!year.isEmpty()&&!year.matches("[12][0-9]{3}"))throw new IllegalArgumentException("Informe um ano com quatro dígitos.");
  if(genres.length()>500||review.length()>4000)throw new IllegalArgumentException("Gêneros ou avaliação excedem o limite.");
  date(start);date(finish);if(!start.isEmpty()&&!finish.isEmpty()&&start.compareTo(finish)>0)throw new IllegalArgumentException("A conclusão deve ser depois do início.");
 }
 public static void date(String value){if(value.isEmpty())return;SimpleDateFormat f=new SimpleDateFormat("yyyy-MM-dd",Locale.ROOT);f.setLenient(false);ParsePosition p=new ParsePosition(0);if(!value.matches("[12][0-9]{3}-[0-9]{2}-[0-9]{2}")||f.parse(value,p)==null||p.getIndex()!=value.length())throw new IllegalArgumentException("Use uma data válida no formato AAAA-MM-DD.");}
}

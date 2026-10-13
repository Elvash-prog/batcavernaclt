package dev.gamersclt.batcaverna.nativeapp;
import java.text.*;
import java.util.*;
public final class MessageTime {
 private static Date parse(String iso){if(iso==null)return null;try{String s=iso.replaceAll("\\.\\d+(?=Z|[+-])","");s=s.replaceAll("Z$","+0000").replaceAll("([+-][0-9]{2}):([0-9]{2})$","$1$2");SimpleDateFormat parser=new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssZ",Locale.ROOT);parser.setLenient(false);ParsePosition p=new ParsePosition(0);Date d=parser.parse(s,p);return p.getIndex()==s.length()?d:null;}catch(Exception e){return null;}}
 public static String time(String iso){Date d=parse(iso);return d==null?"—":new SimpleDateFormat("HH:mm",Locale.getDefault()).format(d);}
 public static long epoch(String iso){Date d=parse(iso);return d==null?0:d.getTime();}
 public static String day(String iso){Date d=parse(iso);return d==null?"Mensagens":new SimpleDateFormat("dd/MM/yyyy",Locale.getDefault()).format(d);}
}

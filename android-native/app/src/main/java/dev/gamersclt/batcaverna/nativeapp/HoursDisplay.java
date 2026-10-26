package dev.gamersclt.batcaverna.nativeapp;
import java.text.NumberFormat;
import java.util.Locale;
/** The database stores decimal hours, never a locale-formatted thousands string. */
final class HoursDisplay {
 static boolean hasTime(Object value){try{double hours=Double.parseDouble(String.valueOf(value).trim().replace(',','.'));return Double.isFinite(hours)&&hours>0;}catch(NumberFormatException error){return false;}}
 static String detailed(Object value){
  if(value==null)return "Sem tempo registrado";
  try{double hours=Double.parseDouble(value.toString().trim().replace(',','.'));if(!Double.isFinite(hours)||hours<0||hours>Long.MAX_VALUE/60d)return "Sem tempo registrado";if(hours>0&&hours*60<1)return "Menos de 1 min";long minutes=Math.round(hours*60),h=minutes/60,m=minutes%60;return h>0?NumberFormat.getIntegerInstance(new Locale("pt","BR")).format(h)+" h"+(m>0?" "+m+" min":""):m+" min";}catch(NumberFormatException error){return "Sem tempo registrado";}
 }
 static String format(Object value){
  if(value==null)return "—";
  try{double hours=Double.parseDouble(value.toString().trim().replace(',','.'));
   if(!Double.isFinite(hours)||hours<0)return "—";
   NumberFormat format=NumberFormat.getNumberInstance(new Locale("pt","BR"));format.setMinimumFractionDigits(1);format.setMaximumFractionDigits(1);return format.format(hours)+" h";
  }catch(NumberFormatException error){return "—";}
 }
}

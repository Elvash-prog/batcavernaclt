package dev.gamersclt.batcaverna.nativeapp;
import java.text.NumberFormat;
import java.util.Locale;
/** The database stores decimal hours, never a locale-formatted thousands string. */
final class HoursDisplay {
 static String format(Object value){
  if(value==null)return "—";
  try{double hours=Double.parseDouble(value.toString().trim().replace(',','.'));
   if(!Double.isFinite(hours)||hours<0)return "—";
   NumberFormat format=NumberFormat.getNumberInstance(new Locale("pt","BR"));format.setMinimumFractionDigits(1);format.setMaximumFractionDigits(1);return format.format(hours)+" h";
  }catch(NumberFormatException error){return "—";}
 }
}

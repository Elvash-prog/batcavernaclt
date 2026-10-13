package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import org.json.JSONObject;
final class AddMediaDialog {
 AddMediaDialog(Context c,int type,Runnable saved){this(c,type,null,saved);}
 AddMediaDialog(Context c,int type,JSONObject selected,Runnable saved){new CatalogAddDialog(c,true,type,selected,saved);}
}

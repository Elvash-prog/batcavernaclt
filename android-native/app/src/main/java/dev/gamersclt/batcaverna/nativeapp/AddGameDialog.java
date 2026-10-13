package dev.gamersclt.batcaverna.nativeapp;
import android.content.Context;
import org.json.JSONObject;
final class AddGameDialog {
 AddGameDialog(Context c,Runnable saved){this(c,null,saved);}
 AddGameDialog(Context c,JSONObject selected,Runnable saved){new CatalogAddDialog(c,false,0,selected,saved);}
}

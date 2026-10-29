package dev.gamersclt.batcaverna.nativeapp;
import org.json.JSONObject;
/** The API includes an empty erro field in successful catalogue replies. */
final class BrightResponsePolicy {
 static boolean failed(int status,JSONObject reply){return status!=200||!reply.isNull("erro")&&!reply.optString("erro","").trim().isEmpty();}
}

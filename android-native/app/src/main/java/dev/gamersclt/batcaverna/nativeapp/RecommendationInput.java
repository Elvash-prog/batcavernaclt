package dev.gamersclt.batcaverna.nativeapp;
import org.json.*;

final class RecommendationInput {
 static JSONObject draft(JSONObject title)throws JSONException{
  // Copy public title metadata only; never inherit another person's item ID or private fields.
  JSONObject clean=new JSONObject().put("nome",GameInput.name(title.optString("nome"))).put("capa",title.optString("capa","")).put("categoria",title.optString("categoria")).put("tipo",title.optString("tipo",""));
  return clean;
 }
 static JSONObject payload(JSONObject title,String friend,String message)throws JSONException{
  return new JSONObject()
   .put("item_id",title.optString("id"))
   .put("item_name",GameInput.name(title.optString("nome")))
   .put("item_category",title.optString("categoria"))
   .put("friend_id",friend)
   .put("mensagem",message==null?"":message);
 }
 static boolean pending(JSONObject recommendation){
  String state=recommendation.optString("estado","").trim().toLowerCase(java.util.Locale.ROOT);
  return state.isEmpty()||state.equals("pendente")||state.equals("enviada");
 }
 static int type(JSONObject title){String kind=LibraryCategory.classify(title.optString("tipo"));return kind.equals("anime")?2:kind.equals("serie")?1:0;}
}

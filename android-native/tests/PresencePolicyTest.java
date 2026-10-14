package dev.gamersclt.batcaverna.nativeapp;

public final class PresencePolicyTest {
 public static void main(String[] args){
  if(PresencePolicy.visible("invisivel"))throw new AssertionError("Modo invisível não pode ser publicado.");
  for(String status:new String[]{"online","jogando","ausente","dnd"})if(!PresencePolicy.visible(status))throw new AssertionError(status);
  if(!"online".equals(PresencePolicy.status("valor-invalido")))throw new AssertionError("Status inválido sem fallback.");
  if(!"steam".equals(PresencePolicy.gameSource("Hades"))||!"".equals(PresencePolicy.gameSource("")))throw new AssertionError("Origem do jogo incorreta.");
  System.out.println("PresencePolicy: 7 checks passed");
 }
}

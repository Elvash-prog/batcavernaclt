package dev.gamersclt.batcaverna.nativeapp;

import java.util.Arrays;

/** Shared rules for publishing account presence without leaking invisible sessions. */
final class PresencePolicy {
 private static final java.util.List<String> STATUSES=Arrays.asList("online","jogando","ausente","dnd","invisivel");
 static String status(String value){return STATUSES.contains(value)?value:"online";}
 static boolean visible(String value){return !"invisivel".equals(status(value));}
 static String gameSource(String game){return game==null||game.trim().isEmpty()?"":"steam";}
}

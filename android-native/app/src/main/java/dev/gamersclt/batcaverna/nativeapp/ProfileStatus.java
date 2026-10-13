package dev.gamersclt.batcaverna.nativeapp;
final class ProfileStatus {
 static final String[] LABELS={"🟢 Online","🎮 Jogando","🟡 Ausente","🔴 Não incomodar","⚫ Invisível"};
 static final int[] COLORS={0xff6cdda2,0xff82bfff,0xffffc46b,0xffff8999,0xffa49cad};
 static int index(String value){for(int i=0;i<ProfileInput.STATUS.length;i++)if(ProfileInput.STATUS[i].equals(value))return i;return 0;}
}

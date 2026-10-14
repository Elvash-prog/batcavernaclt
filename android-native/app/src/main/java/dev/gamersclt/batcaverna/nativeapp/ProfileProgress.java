package dev.gamersclt.batcaverna.nativeapp;
/** Same level curve and library XP breakdown used by the desktop profile. */
public final class ProfileProgress {
 public static int level(long xp){return (int)Math.floor(Math.sqrt(Math.max(0,xp)/100.0))+1;}
 public static long base(long xp){long n=level(xp)-1;return n*n*100;}
 public static long next(long xp){long n=level(xp);return n*n*100;}
 public static int percentage(long xp){return (int)Math.min(100,Math.max(0,(Math.max(0,xp)-base(xp))*100/(next(xp)-base(xp))));}
 public static int bonus(int games,int finished,int platinum,double hours){int n=0;if(games>=1)n+=25;if(games>=10)n+=50;if(games>=25)n+=100;if(finished>=5)n+=75;if(finished>=10)n+=150;if(platinum>=5)n+=150;if(hours>=100)n+=100;return n;}
 public static String title(int n){return n>=30?"Lenda Suprema":n>=20?"Mestre CLT":n>=15?"Veterano de Elite":n>=10?"Veterano CLT":n>=7?"CLT Experiente":n>=4?"CLT Dedicado":n>=2?"CLT Iniciante":"Novato CLT";}
}

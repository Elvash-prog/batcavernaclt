import dev.gamersclt.batcaverna.nativeapp.ProfileProgress;
public final class ProfileProgressTest {
 public static void main(String[] args){check(ProfileProgress.level(-10)==1);check(ProfileProgress.level(0)==1);check(ProfileProgress.level(99)==1);check(ProfileProgress.level(100)==2);check(ProfileProgress.level(8100)==10);check(ProfileProgress.base(8365)==8100);check(ProfileProgress.next(8365)==10000);check(ProfileProgress.percentage(8365)==13);check(ProfileProgress.bonus(92,44,24,2140)==650);check(ProfileProgress.bonus(0,0,0,0)==0);check(ProfileProgress.title(10).equals("Veterano CLT"));System.out.println("ProfileProgress: 11 checks passed");}
 private static void check(boolean condition){if(!condition)throw new AssertionError();}
}

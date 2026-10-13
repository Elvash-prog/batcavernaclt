package dev.gamersclt.batcaverna.nativeapp;
public final class ResponsivePolicyTest {
 static int checks;static void eq(int actual,int expected){if(actual!=expected)throw new AssertionError(actual+" != "+expected);checks++;}
 public static void main(String[] args){eq(ResponsivePolicy.columns(268,1),1);eq(ResponsivePolicy.columns(308,1),2);eq(ResponsivePolicy.columns(548,1),3);eq(ResponsivePolicy.columns(900,1),4);eq(ResponsivePolicy.columns(308,1.4f),1);eq(ResponsivePolicy.columns(548,1.4f),2);eq(ResponsivePolicy.columns(0,2),1);eq(ResponsivePolicy.columns(1200,2),4);eq(ResponsivePolicy.controlHeight(1),50);eq(ResponsivePolicy.controlHeight(2),72);eq(ResponsivePolicy.navHeight(1),52);eq(ResponsivePolicy.navHeight(2),68);System.out.println("ResponsivePolicy: "+checks+" checks");}
}

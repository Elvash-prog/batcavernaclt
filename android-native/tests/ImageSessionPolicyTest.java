package dev.gamersclt.batcaverna.nativeapp;
public final class ImageSessionPolicyTest {
 static int checks;static void eq(boolean actual,boolean expected){if(actual!=expected)throw new AssertionError();checks++;}
 public static void main(String[] args){eq(ImageSessionPolicy.accepts("A","A",false,"old","new"),true);eq(ImageSessionPolicy.accepts("A","B",false,"old","new"),false);eq(ImageSessionPolicy.accepts("A","",false,"old",""),false);eq(ImageSessionPolicy.accepts("","",false,"",""),true);eq(ImageSessionPolicy.accepts("A","A",true,"old","new"),false);eq(ImageSessionPolicy.accepts("A","A",true,"same","same"),true);eq(ImageSessionPolicy.accepts("","",true,"same","same"),false);eq(ImageSessionPolicy.accepts("A","A",true,"",""),false);System.out.println("ImageSessionPolicy: "+checks+" checks");}
}

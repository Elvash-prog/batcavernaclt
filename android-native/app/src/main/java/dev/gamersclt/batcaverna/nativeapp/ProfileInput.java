package dev.gamersclt.batcaverna.nativeapp;
public final class ProfileInput {
 public static final String[] STATUS={"online","jogando","ausente","dnd","invisivel"};
 public static void validate(String name,String bio,String status){if(name==null||name.trim().isEmpty()||name.trim().length()>40)throw new IllegalArgumentException("Informe um nome de até 40 caracteres.");if(bio==null||bio.length()>280)throw new IllegalArgumentException("A bio pode ter até 280 caracteres.");if(!java.util.Arrays.asList(STATUS).contains(status))throw new IllegalArgumentException("Status inválido.");}
}

package dev.gamersclt.batcaverna.nativeapp;
import java.io.IOException;
/** Never mistake the returned page size for the account's total. */
public final class LibraryCount {
 public static int parse(String range)throws IOException{
  if(range==null||range.lastIndexOf('/')<0)throw new IOException("O servidor não informou a contagem.");
  try{int count=Integer.parseInt(range.substring(range.lastIndexOf('/')+1).trim());if(count<0)throw new NumberFormatException();return count;}catch(NumberFormatException e){throw new IOException("Contagem indisponível. Atualize o resumo.");}
 }
}

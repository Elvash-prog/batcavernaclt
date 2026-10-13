package dev.gamersclt.batcaverna.nativeapp;
import java.util.*;
import java.text.Normalizer;
public final class BatchNames {
 public static String normalized(String value){return Normalizer.normalize(value.trim(),Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT).replaceAll("\\s+"," ");}
 public static List<String> parse(String text){List<String> names=new ArrayList<>();Set<String> seen=new HashSet<>();if(text==null||text.length()>12000)throw new IllegalArgumentException("A lista é muito longa.");for(String line:text.split("[\\r\\n;]+")){if(line.trim().isEmpty())continue;String name=GameInput.name(line);if(seen.add(normalized(name)))names.add(name);if(names.size()>50)throw new IllegalArgumentException("Use até 50 títulos por lista.");}if(names.isEmpty())throw new IllegalArgumentException("Digite ao menos um título, um por linha.");return names;}
}

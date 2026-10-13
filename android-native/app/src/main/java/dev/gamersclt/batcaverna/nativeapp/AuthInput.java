package dev.gamersclt.batcaverna.nativeapp;
public final class AuthInput {
 private AuthInput(){}
 public static String login(String username,String password){if(username==null||username.trim().isEmpty()||password==null||password.isEmpty())return "Informe usuário e senha.";return "";}
 public static String registration(String name,String username,String email,String password,String confirmation){
  if(name==null||name.trim().isEmpty()||name.trim().length()>40)return "Informe um nome de perfil de até 40 caracteres.";
  if(username==null||!username.matches("[A-Za-z0-9_.-]{1,24}"))return "O usuário pode ter até 24 letras, números, pontos, hífens ou sublinhados.";
  if(email==null||email.trim().length()>254||!email.trim().matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))return "Informe um e-mail válido.";
  if(password==null||password.length()<12)return "Use pelo menos 12 caracteres na senha.";
  if(!password.equals(confirmation))return "As senhas não conferem.";
  return "";
 }
}

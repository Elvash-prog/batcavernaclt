package dev.gamersclt.batcaverna.nativeapp;

public final class ApiErrorPolicyTest {
    public static void main(String[] args) {
        String[] hostile={null,"", "SELECT password FROM auth.users", "/srv/main.rs:99", "secret-token", "<script>alert(1)</script>", "23514: private_table"};
        for(String code:hostile)for(int status:new int[]{400,401,403,404,409,413,422,429,500,503}){
            String result=ApiErrorPolicy.message(code,status);
            for(String forbidden:new String[]{"SELECT","password","auth.users","/srv","secret-token","<script>","private_table"}){
                if(result.contains(forbidden))throw new AssertionError("Internal error leaked");
            }
            if(result.isEmpty())throw new AssertionError("Empty error");
        }
        if(!ApiErrorPolicy.message("email_not_confirmed",400).equals("Confirme seu e-mail antes de entrar."))throw new AssertionError("Email confirmation feedback lost");
        if(!ApiErrorPolicy.message("23514",400).equals("Confira o formato e os limites dos dados informados."))throw new AssertionError("Validation feedback lost");
        if(!ApiErrorPolicy.message("",429).contains("Aguarde"))throw new AssertionError("Rate limit feedback lost");
        System.out.println("Safe API errors: hostile codes, status mapping and useful feedback passed");
    }
}

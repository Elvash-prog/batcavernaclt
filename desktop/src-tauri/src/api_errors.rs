use serde_json::Value;

// Only local, reviewed text reaches the interface. Never forward provider messages.
pub fn message(body: &str, status: u16) -> String {
    let json=serde_json::from_str::<Value>(body).unwrap_or(Value::Null);
    let code=["code","error_code","error"].iter().find_map(|key|json.get(key).and_then(Value::as_str)).unwrap_or("");
    let text=match code {
        "invalid_credentials" | "invalid_grant" => "Usuário ou senha inválidos.",
        "email_not_confirmed" => "Confirme seu e-mail antes de entrar.",
        "weak_password" => "Use uma senha forte de pelo menos 12 caracteres.",
        "same_password" => "A nova senha precisa ser diferente da atual.",
        "user_already_exists" | "email_exists" => "Não foi possível criar a conta com esses dados.",
        "reauthentication_needed" | "reauthentication_not_valid" => "Confirme novamente sua identidade antes de continuar.",
        "otp_expired" => "O código expirou ou já foi utilizado. Solicite outro.",
        "over_request_rate_limit" | "over_email_send_rate_limit" => "Muitas tentativas. Aguarde antes de tentar novamente.",
        "23505" => "Este registro já existe. Atualize os dados antes de tentar novamente.",
        "23514" | "22001" | "22023" => "Confira o formato e os limites dos dados informados.",
        _ => match status {
            401 => "A autenticação não foi confirmada. Confira seus dados e entre novamente.",
            403 => "Sua conta não tem permissão para esta operação.",
            404 => "O recurso não está disponível. Atualize o aplicativo e tente novamente.",
            409 => "Os dados mudaram ou já existem. Atualize antes de tentar novamente.",
            413 => "O arquivo ou conteúdo ultrapassa o tamanho permitido.",
            429 => "Muitas tentativas. Aguarde antes de tentar novamente.",
            500..=599 => "O serviço está indisponível. Tente novamente mais tarde.",
            _ => "Não foi possível concluir a operação. Confira os dados e tente novamente.",
        }
    };
    text.into()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn hides_provider_and_database_details() {
        for body in [r#"{"message":"SELECT password FROM auth.users; /srv/app/main.rs:99","details":"private"}"#,
                     r#"{"code":"unknown","error_description":"secret-token","hint":"private-table"}"#,
                     "panic at /home/runner/private.sql", "<script>alert(1)</script>"] {
            for status in [400,401,403,404,409,413,422,429,500] {
                let out=message(body,status);
                for forbidden in ["SELECT","password","auth.users","/srv","secret-token","private-table","/home","<script>"] {assert!(!out.contains(forbidden));}
            }
        }
    }
    #[test]
    fn maps_codes_without_forwarding_message_text() {
        assert_eq!(message(r#"{"code":"email_not_confirmed","message":"secret"}"#,400),"Confirme seu e-mail antes de entrar.");
        assert_eq!(message(r#"{"code":"23514","message":"perfis_bio_check"}"#,400),"Confira o formato e os limites dos dados informados.");
        assert_eq!(message("not-json",429),"Muitas tentativas. Aguarde antes de tentar novamente.");
    }
}

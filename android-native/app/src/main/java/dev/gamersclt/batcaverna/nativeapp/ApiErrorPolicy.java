package dev.gamersclt.batcaverna.nativeapp;

/** Inputs are machine codes only. Provider messages are never user-facing. */
final class ApiErrorPolicy {
    static String message(String code,int status) {
        switch(code==null?"":code) {
            case "invalid_credentials":case "invalid_grant":return "Usuário ou senha inválidos.";
            case "email_not_confirmed":return "Confirme seu e-mail antes de entrar.";
            case "weak_password":return "Use uma senha forte de pelo menos 12 caracteres.";
            case "same_password":return "A nova senha precisa ser diferente da atual.";
            case "user_already_exists":case "email_exists":return "Não foi possível criar a conta com esses dados.";
            case "reauthentication_needed":case "reauthentication_not_valid":return "Confirme novamente sua identidade antes de continuar.";
            case "otp_expired":return "O código expirou ou já foi utilizado. Solicite outro.";
            case "over_request_rate_limit":case "over_email_send_rate_limit":return "Muitas tentativas. Aguarde antes de tentar novamente.";
            case "media_moderation_configuration":return "A análise de imagens precisa de um ajuste no serviço. Tente novamente mais tarde.";
            case "media_moderation_limit":return "O serviço de análise atingiu seu limite de uso. Tente enviar a imagem mais tarde.";
            case "media_moderation_unavailable":return "A análise da imagem não está disponível agora. Tente novamente mais tarde.";
            case "media_dimensions_exceeded":return "Reduza as dimensões da imagem: até 8192 pixels por lado e 32 megapixels.";
            case "media_unavailable":return "Não foi possível concluir o envio da imagem. Tente novamente mais tarde.";
            case "media_invalid_format":return "Escolha uma imagem JPG, PNG ou WebP válida.";
            case "media_content_blocked":return "Esta imagem está bloqueada. Escolha outra imagem.";
            case "media_too_large":return "A imagem ultrapassa o tamanho permitido.";
            case "media_not_allowed":return "Sua sessão ou permissão não permite enviar esta imagem. Entre novamente.";
            case "media_storage_unavailable":return "Não foi possível armazenar a imagem. Tente novamente mais tarde.";
            case "media_database_unavailable":return "Não foi possível confirmar o envio da imagem. Tente novamente mais tarde.";
            case "media_auth_unavailable":return "Não foi possível verificar sua sessão para enviar a imagem. Tente novamente.";
            case "23505":return "Este registro já existe. Atualize os dados antes de tentar novamente.";
            case "23514":case "22001":case "22023":return "Confira o formato e os limites dos dados informados.";
            default:
                switch(status) {
                    case 401:return "A autenticação não foi confirmada. Confira seus dados e entre novamente.";
                    case 403:return "Sua conta não tem permissão para esta operação.";
                    case 404:return "O recurso não está disponível. Atualize o aplicativo e tente novamente.";
                    case 409:return "Os dados mudaram ou já existem. Atualize antes de tentar novamente.";
                    case 413:return "O arquivo ou conteúdo ultrapassa o tamanho permitido.";
                    case 429:return "Muitas tentativas. Aguarde antes de tentar novamente.";
                    default:return status>=500&&status<=599?"O serviço está indisponível. Tente novamente mais tarde.":"Não foi possível concluir a operação. Confira os dados e tente novamente.";
                }
        }
    }
}

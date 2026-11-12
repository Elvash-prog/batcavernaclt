# Verificação de senhas vazadas — 2.1.3

Windows e Android consultam https://api.pwnedpasswords.com/range/ ao enviar uma senha nova no cadastro, alteração ou recuperação. A consulta é feita no código nativo, não no renderer nem durante a digitação. O login e a confirmação de e-mail sem senha nova não fazem consultas.

O SHA-1 dos bytes UTF-8 exatos da senha é calculado no dispositivo, sem aparar espaços, converter caixa ou normalizar Unicode. SHA-1 é utilizado somente para consultar a base; o Supabase continua responsável pelo armazenamento da senha. Só os cinco primeiros caracteres hexadecimais são enviados. Não enviamos e-mail, senha, hash completo, token de sessão ou chave do Supabase ao serviço. Não persistimos resultado, senha, prefixo ou hash em cache/diagnósticos. A conexão direta expõe IP e dados técnicos ao fornecedor; isso está descrito no aviso público de privacidade.

O GET usa um cliente independente, Add-Padding: true, HTTPS, timeouts, limite de resposta de 512 KiB e não segue redirecionamentos. Os sufixos são comparados localmente; contagens zero do padding não bloqueiam senhas. Respostas vazias, malformadas, grandes demais, rate limit, falha HTTP ou de rede exigem nova tentativa, sem aprovar a senha e sem enviar a alteração ao Auth. A mensagem de falha é fixa e não contém resposta/URL do fornecedor. O código de recuperação só é consumido depois da consulta.

Esta é uma proteção dos aplicativos atualizados. Não ativa leaked_password_protection do Supabase, não substitui as regras de senha do Auth e pode ser contornada por clientes antigos/modificados ou chamadas diretas à API. Não é possível rastrear automaticamente as senhas já cadastradas a partir do bcrypt salvo no Auth. Ausência na base não garante força nem ausência em vazamentos desconhecidos. MFA não faz parte desta alteração.

Testes de protocolo e transporte usam um servidor HTTP local com dados sintéticos: hash conhecido, preservação de espaço/caixa, comparação exata, padding zero, resposta inválida, privacidade do request, HTTP 302/429/500 e indisponibilidade. Rust integra cargo test; Java integra a suíte de políticas do CI. A recuperação é verificada antes de consumir a prova e mantém a revogação das sessões já existente.

Referências: https://haveibeenpwned.com/API/v3#PwnedPasswords e https://supabase.com/docs/guides/auth/password-security.

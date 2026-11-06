# Revisão de segurança — 6 de novembro de 2026

## Sessão temporária na troca de e-mail

O desktop reautentica com a senha atual antes de solicitar a troca de e-mail. Essa sessão adicional não era revogada explicitamente. A alteração envolve a operação em `with_temporary_session`: ao receber sucesso ou erro da operação, o cliente solicita logout com `scope=local` usando apenas o token temporário. A sessão normal não é substituída nem enviada a esse logout.

A revogação também é tentada se os identificadores das contas divergirem ou se a atualização retornar erro. Uma falha ao revogar não é apresentada como sucesso completo: o texto orienta conferir o resultado antes de repetir, pois a troca pode ter sido solicitada. A mensagem original é preservada quando a operação e a limpeza falham.

Os testes HTTP locais do módulo Rust cobrem resultado de sucesso/erro, respostas 204/500 da revogação, ordem da operação, uso exclusivo do token temporário e escopo local. Testes existentes cobrem logout rejeitado e indisponibilidade de rede. Não há testes enviando e-mails reais nem usando contas de produção.

Limites: o aplicativo não pode garantir essa limpeza se for encerrado abruptamente ou perder conexão. O Supabase revoga a sessão/renovação; um JWT já emitido pode continuar válido até expirar. Não se declara invalidação imediata de todos os tokens.

## Senhas vazadas

O projeto está no plano Free, confirmado pela ferramenta de organização. Segundo a [documentação atual do Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), a proteção nativa contra senhas vazadas exige Pro ou superior. O recurso permanece pendente no plano atual. Não foi acrescentada uma checagem apenas no cliente, pois ela poderia ser contornada por chamadas diretas ao Auth.

## Dependência Rust

A consulta OSV de `block-buffer` **0.10.4** retornou zero avisos em 6/11/2026. O registro [GHSA-qwgh-2vcv-g2f7](https://osv.dev/vulnerability/GHSA-qwgh-2vcv-g2f7), modificado em 30/10/2026, informa atualmente versões afetadas a partir de 0.11.0 e correção em 0.12.1. A exceção anterior tornou-se desnecessária e foi removida. Nenhuma versão da biblioteca foi substituída artificialmente fora da faixa de suas dependências. A auditoria completa deve continuar sendo executada sem exceções cadastradas; novos avisos podem surgir.

## Banco de produção — consultas somente de metadados e definições

- RLS habilitada nas 43 tabelas de `public`, nas duas de `clt_private` e nas dez de `storage` consultadas. Isso não substitui validar cada política de acesso.
- A view pública legível identificada, `perfis_publicos_clt`, usa `security_invoker=true` e `security_barrier=true`.
- Entre as funções `SECURITY DEFINER` públicas consultadas, a única executável por `anon` é `clt_launcher_public()`: retorna apenas o endereço do fundo de login e sua data de atualização. Esse acesso é intencional; a função de alteração verifica permissão administrativa.
- As 38 funções privilegiadas acessíveis a usuários autenticados têm `search_path` configurado. Foram examinadas definições de funções de perfil, biblioteca/listas, convites/grupos, progressão e notificações. Elas dependem de verificações de identidade, propriedade ou participação; não se revogaram indiscriminadamente permissões necessárias ao aplicativo. A inspeção não equivale a um teste exaustivo de todas as combinações de políticas e RPCs.
- `pg_net` está registrado em `public`, mas tem `extrelocatable=false`; suas funções consultadas ficam no esquema `net`. O aviso permanece. Mover por alteração direta de catálogos ou recriar a extensão em produção pode quebrar dependências e não é uma correção apropriada apenas para apagar o aviso.

Referências dos avisos: [funções privilegiadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [extensão em public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [RLS sem políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Esta revisão não altera credenciais, contas, plano contratado ou políticas de produção. A correção do cliente precisa integrar uma nova versão distribuída para alcançar os usuários.

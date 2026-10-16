# Backend dos aplicativos no Supabase

Windows 0.17.40 e Android 1.7.8 usam `/functions/v1/native-api` para catálogo RAWG/TMDB, ofertas Steam e upload/preparação/revisão de mídia. O APK usa `login-username` e inclui o fundo padrão de login no pacote. As demais funções existentes (bright-api, media-upload, android-push e send-push), Auth, REST/RPC, Realtime e Storage permanecem no mesmo projeto.

## Implantação

Função `native-api` publicada no projeto existente, isolada das funções atuais. A validação de JWT do gateway é desativada porque todas as rotas de negócio consultam Auth diretamente e aplicam o limite SQL compartilhado `clt_bright_api_limit`. Apenas `/health` é público e retorna indicadores de configuração, nunca os valores das chaves.

As regras de mídia preservam ownership, permissões de administradores de grupo, bloqueios, ACL de leitura, moderação, quarentena e bloqueio do arquivo antes da revisão do vídeo. URLs assinadas são entregues apenas após verificar autorização. Novos arquivos não são liberados sem moderação aprovada.

Não foram alteradas tabelas ou permissões. As funções SQL de limite, bloqueio de quarentena e ACL já existem e foram verificadas no projeto.

## Segredos pendentes

A consulta de health em 16/10/2026 confirmou Supabase e moderação configurados. RAWG_KEY e TMDB_KEY não estavam presentes. Cadastrar ambos em Edge Functions → Secrets no painel Supabase. Copiar os valores do administrador das integrações atuais; não inserir segredos no repositório, APK ou conversa. O código falha explicitamente com integração não configurada enquanto faltarem as chaves. Não existe fallback para o antigo host.

## Dependências externas

As APIs de jogos, filmes, Steam, RetroAchievements, AniList, moderação e Firebase continuam sendo serviços externos usados pelo produto. GitHub continua sendo repositório e canal de distribuição dos instaladores. A migração retira a hospedagem própria do Cloudflare, não esses fornecedores nem os CDNs de imagens de parceiros.

## Antes de desligar o Worker

1. Cadastrar RAWG_KEY e TMDB_KEY e confirmar os indicadores em `/health`.
2. Instalar as duas novas versões e testar login, renovação de sessão, busca, biblioteca, imagens de perfil/grupos/chat, publicação de fotos/vídeos, notificações, Steam e Retro.
3. Testar recuperação de senha por código ou cópia do link original. O Site URL do Auth ainda precisa ser revisto se o administrador quiser que links antigos abertos no navegador deixem de apontar ao site. Os apps novos verificam diretamente com Auth.
4. Configurar e-mails com código quando os clientes compatíveis estiverem distribuídos (ver `supabase/email-templates`).
5. Confirmar que não restam usuários em versões antigas. Elas dependem do Worker anterior.
6. Só então desativar o Worker pelo painel Cloudflare. Este patch não o exclui e mantém possibilidade de reversão durante a migração.

Testes: `node tests/native-api.mjs` usa o handler real com Auth/provedores simulados; `node tests/native-dependencies.mjs` impede endpoints Workers/Pages no código nativo. CI valida Android e Windows. Ausência de endpoints no código não comprova todas as integrações com uma conta real.

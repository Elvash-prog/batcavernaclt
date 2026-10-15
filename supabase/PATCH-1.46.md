# Patch 1.46 — RetroAchievements

Esta atualização adiciona a integração do desktop 0.17.16 com o RetroAchievements.

## Implantação

1. Execute `patch-1.46-retroachievements.sql` no SQL Editor do Supabase.
2. Adicione o segredo `RETROACHIEVEMENTS_KEY` à Edge Function `bright-api`.
3. Publique novamente `supabase/functions/bright-api/index.ts`.
4. Abra **Configurações → Integrações**, informe o usuário do RetroAchievements e salve.

A chave da API não deve ser incluída no aplicativo, no banco ou no repositório. O perfil guarda apenas o nome público validado e o ULID estável retornado pelo RetroAchievements.

## Dados sincronizados

- perfil, avatar e pontuação;
- progresso e jogos recentes;
- conquistas normais e Hardcore;
- console, capa e última atividade;
- importação manual para a biblioteca, com bloqueio de nomes duplicados.

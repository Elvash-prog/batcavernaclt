# BatCaverna CLT Windows 0.6.0

Aplicativo Tauri com interface própria e Supabase compartilhado com site e Android.

## Esta atualização

- Biblioteca em fileiras horizontais, cards maiores com imagem inteira, navegação por setas, filtros por status, gênero e plataforma.
- Temas prontos, cores livres, imagem de fundo e controles de largura, cards e escala por computador.
- Início com jogo em progresso, atividades, ranking, recomendações por catálogo e estatísticas expansíveis.
- Janela de detalhes antes da edição, campos adicionais, gêneros da RAWG/TMDB/AniList/Steam e consulta de conquistas Steam.
- Sininho no topo, mini central com destinos clicáveis, aceitar/recusar e limpar todas.
- Amigos integrados ao chat, perfis autorizados com biblioteca, nível/XP, 32 conquistas, destaques, estatísticas e missões somente do próprio usuário.
- Chat individual e grupos: respostas, edição/exclusão própria, reações compartilhadas, imagens e figurinhas da conta. Links privados resolvem os caminhos de mídia usados pelo site.
- Conexão WebSocket Supabase Realtime, heartbeat, renovação do token, reconexão e sincronização alternativa. Presença usa o mesmo canal do site; consultas Steam informam jogos visíveis.

## Ativar no Supabase

Execute `supabase/patch-1.44-desktop-0.6.sql` no SQL Editor do mesmo projeto. O patch mantém RLS, cria/reutiliza as tabelas de figurinhas e reações do patch 1.42, habilita as publicações de Realtime e oferece limpeza de notificações apenas da própria conta. Requer a configuração de segurança/moderação já existente no site (`clt_private.media_approved`).

Os uploads passam pelo endpoint moderado do Cloudflare já utilizado pelo site. As chaves de catálogo e moderação permanecem no servidor. O programa não leva service_role nem chaves privadas.

## Instalar e testar

Feche a versão anterior e execute o instalador. Confira login, dados já existentes, buscas, mídia privada, envio de figurinha, reação visível em outro cliente, resposta, edição/exclusão, notificações e perfil de amigo. Use duas contas amigas para confirmar o chat ao vivo.

`npm test` verifica lógica do cliente; `npm run test:ui` verifica fluxos e resoluções com respostas simuladas. GitHub Actions também compila/testa Rust e gera NSIS. Esses testes não substituem validação com sessão real no Supabase e APIs externas.

# Patch 1.41 — fotos do ranking, chat mobile e notificações

Fotos armazenadas no bucket privado eram autorizadas apenas ao dono e aos amigos. O ranking global contém pessoas que não são amigas; nesses casos, o navegador exibia imagens quebradas. No mobile, uma regra antiga limitava o balão a 82% da mensagem, enquanto a imagem usava um limite fixo de 220px e podia ultrapassar esse balão.

## Alterações

- O Worker autoriza a foto atual do perfil para outra conta autenticada somente quando o caminho pedido corresponde exatamente ao `avatar_url` desse dono. A checagem usa o cadastro no servidor e verifica bloqueios nos dois sentidos.
- A foto ainda precisa estar aprovada na moderação; conteúdo rejeitado ou falha da moderação não recebe uma URL para exibição. A resposta usa uma URL assinada por 300 segundos. Buckets e políticas SQL continuam privados.
- Fundos, fotos anteriores, anexos do feed/chat e fotos de grupos continuam usando as autorizações existentes. Não há autorização para visitantes.
- O navegador usa essa URL já autorizada quando o leitor do ranking não tem amizade com o dono. Os componentes de avatar mostram a inicial quando a imagem falha e restauram a foto quando ela carrega, sem texto de erro dentro do círculo.
- A foto do ranking usa o valor mais recente retornado pelo ranking. Fotos da biblioteca e fundos não recebem a exceção de acesso do avatar.
- O balão e sua imagem respeitam a largura disponível. A imagem mantém a proporção e limites de altura de 240px no mobile e 280px no desktop, sem zoom no hover.
- Notificações novas usam o logo já existente do site e um novo símbolo de morcego branco com fundo transparente, em URLs versionadas. O Service Worker v141 inclui esses arquivos públicos. Ícones do app/PWA não foram redesenhados.

## Validação

`node tests/avatar-access.mjs`: 11 testes offline de autenticação, foto atual, fotos antigas, fundos, demais buckets, bloqueios, falhas do banco/moderador e consumo da URL assinada pelo navegador.

`node tests/performance-client.mjs`: os 19 testes de desempenho e estabilidade continuam passando. Scripts JavaScript passaram na validação de sintaxe. Os PNGs foram conferidos visualmente; houve inspeção das capturas enviadas pelo usuário e revisão das regras CSS. Não houve execução visual em navegador/mobile real.

O deploy é automático pelo GitHub/Cloudflare. Não é necessário executar SQL nem alterar Secrets. Recarregar o site recebe o novo Service Worker; os novos ícones aparecem nas próximas notificações. Notificações já exibidas pelo Android podem manter seus ícones anteriores.

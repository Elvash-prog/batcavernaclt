# BatCaverna 1.1.0

Listas personalizadas, indicações de títulos entre amigos e preferências de notificações usam o mesmo RPC `clt_features` no site e no APK.

## Ativação

1. Execute `supabase/patch-1.1.0-listas-indicacoes.sql` inteiro no SQL Editor do Supabase. A transação pode ser executada novamente sem apagar dados.
2. Instale o APK 1.1.0 sobre a versão atual. Não desinstale o aplicativo.
3. Recarregue o site. Se estiver usando o PWA, feche e abra novamente após a atualização.

## Uso

- **Listas**: crie, renomeie, exclua, adicione ou remova títulos. São privadas inicialmente; o proprietário pode mostrar a lista aos amigos atuais, respeitando bloqueios.
- **Indicações**: escolha um título da sua biblioteca e um amigo; envie uma mensagem de até 240 caracteres. O destinatário pode marcar interesse, dispensar ou guardar o título em uma lista. A notificação abre a indicação exata. Até 50 envios por dia, sem repetir o mesmo título para o mesmo amigo no mesmo dia.
- **Preferências**: mensagens, social, amizades, indicações e progresso são salvos na conta. Valem para novas entradas na central e para o push existente que deriva dessas entradas. Não alteram notificações antigas ou o conteúdo das conversas/feed. A permissão do sistema para receber push continua sendo por aparelho.

As listas e indicações guardam apenas uma cópia do nome, categoria, tipo e capa do título. Não incluem preço, review ou anotações privadas. Remover uma lista não altera a biblioteca; títulos guardados permanecem na lista mesmo que o item original seja removido da biblioteca. Remover/bloquear uma amizade revoga a leitura das listas compartilhadas e indicações dessa amizade.

Limites: 100 listas por conta, 500 títulos por lista; a central mostra as 200 indicações mais recentes. Uma notificação com referência abre sua indicação mesmo fora dessas 200. Biblioteca e amigos usam paginação nas seleções; a busca de títulos mostra até 100 resultados por vez.

## Validação

Migração executada em PostgreSQL local via PGlite, com cenários de propriedade, amizade, bloqueio, preferências, reexecução e IDs de título numéricos/UUID. Fluxos do site verificados em DOM simulado. APK compilado e analisado pelo Android Lint, com teste de destinos de notificações. Sem validação em aparelho Android ou conta Supabase de produção nesta entrega.

Não precisa republicar a Edge Function de push: o filtro atua antes da inserção em `notificacoes`, e os webhooks existentes só recebem notificações permitidas. A migração deve ser aplicada antes de usar as novas funções.

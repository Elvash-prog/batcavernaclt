# Patch 1.40 — desempenho e estabilidade

A interface desktop reconstruía blocos a cada 1,2 segundo. A atualização de amigos limpava a lista antes da resposta e forçava consultas Steam mesmo sem alterações. Observadores de layout e mídia reprocessavam áreas grandes da página. Respostas atrasadas do polling da biblioteca podiam ser aplicadas após uma troca de perfil.

## Alterações

- Leituras simultâneas de biblioteca, amigos, notificações, atividade, ranking, feed e chamadas Steam compartilham somente a requisição em andamento. Não existe novo cache persistente de dados privados; o contexto inclui sessão, perfil e modo de edição.
- A atualização periódica desktop passa de 1,2 para 15 segundos, com atualização por eventos de presença/ranking. São 4 chamadas periódicas por minuto em vez de 50; isso não representa uma medição de FPS ou CPU total.
- Amigos permanecem visíveis durante consultas. A lista e os perfis são reconstruídos quando necessário, sem limpar buscas em andamento. Perfis de amigos recebem uma atualização de verificação a cada dois minutos.
- Amigos/convites têm verificação periódica de 30 segundos, preservando os eventos realtime. A consulta Steam dos amigos respeita 45 segundos de validade, pausa em abas ocultas e retoma ao voltar.
- Biblioteca, feed, fotos da barra lateral e mensagens preservam os elementos quando o HTML não muda. O cache de renderização reconhece uma substituição externa por um estado de carregamento.
- Polling da biblioteca não se sobrepõe e verifica a sessão/perfil antes de aplicar resultados. Mudanças reais de capas, horas e listas também atualizam a tela; mudanças isoladas do horário de atualização não reconstruem cards.
- Layout observa os estados dos modais, em vez de todas as classes de todos os elementos. Varreduras de mídias privadas processam somente raízes inseridas/alteradas, com lotes de até 100 raízes por frame. A liberação continua passando pelo servidor.
- Imagens do chat compartilham pedidos de assinatura e agrupam renders. Respostas são descartadas se a conversa ou sessão mudou. As reações das 300 mensagens usam uma leitura do metadado por render, em vez de uma por mensagem.
- Observadores de capas descartam cards removidos e não recarregam capas já observadas/carregadas. As chamadas Steam têm prazo de 45 segundos para não deixar uma requisição pendente indefinidamente.
- Service Worker v140 inclui o novo script público e mantém a exclusão de APIs e dados privados do cache.

## Validação

`node tests/performance-client.mjs`: 19 verificações offline com simulação de DOM, frames, sessão e rede. Incluem deduplicação de 200 chamadas, lote de 250 elementos, descartes após troca de perfil/conversa/logout, preservação de cards, retomada Steam e render de 300 mensagens com uma leitura de metadados.

Todos os 23 scripts inline e os scripts externos modificados passaram na verificação de sintaxe do Node. As proteções de autenticação, moderação e autorização do servidor não foram alteradas.

Não houve teste visual em navegador ou medição de FPS, memória/CPU no dispositivo real. Depois do deploy, conferir navegação Jogos → Perfil → Amigos → Chat, conversa de grupo após alternar a aba do navegador, envio/exclusão de mensagem e carregamento de imagens em desktop/mobile. Não é necessária migração SQL ou alteração de Secrets.

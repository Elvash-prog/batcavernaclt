# Presença online — 2.1.2

O erro `ClientPresenceRateLimitReached` encerra o canal quando um cliente excede a janela de operações de presença. A [documentação do Supabase](https://supabase.com/docs/guides/realtime/limits) estabelece cinco chamadas por cliente a cada 30 segundos, em todos os planos. O desktop anterior publicava a cada cinco segundos, excedendo essa janela mesmo sem mudança de status.

Os dois clientes agora comparam o conteúdo do estado, ignorando o horário na comparação. Um estado sem mudança é renovado a cada 60 segundos, dentro da tolerância de leitura de 90 segundos. Mudanças de estado são agrupadas, com pelo menos 10 segundos entre tracks, até três operações comuns por janela e uma vaga reservada para ocultar imediatamente a presença. A janela móvel conserva também a chamada no limite exato dos 30 segundos e aceita no máximo quatro operações, abaixo do limite do servidor.

O modo invisível só envia untrack se este cliente estiver publicado. Repetir o estado invisível não gera novas chamadas. Retornar ao modo visível respeita a janela pendente. Alterações de jogo/perfil mais recentes substituem as anteriores quando uma janela está ocupada.

Heartbeats Phoenix a cada 20 segundos mantêm o socket; não são chamadas de presença. O desktop descarta ticks perdidos ao retomar depois de uma suspensão e espera a confirmação do canal antes de publicar. O horário de presença enviado é atualizado pela conexão; a amostra de atividade do renderer é validada antes disso e o jogo é apagado após 45 segundos sem nova amostra.

Erros normais de transporte usam reconexão gradual. Uma mensagem de limite de presença exige ao menos 60 segundos antes de reconectar; falhas curtas repetidas não reiniciam a espera mínima. O Android conserva essa pausa ao alternar entre primeiro plano e segundo plano, cancela resultados antigos e agrupa consultas de presença em andamento. Os dois clientes limpam o estado recebido ao desconectar. O desktop conserva a busca periódica de mensagens/notificações durante a recuperação da conexão.

Não há alteração de plano, quotas, autenticação, RLS, política de senhas ou funções de produção. Clientes já instalados precisam atualizar; registros antigos e clientes de versões anteriores podem continuar aparecendo nos logs.

Testes: janela móvel sob alternância rápida, agrupamento do estado mais recente, renovação sem mudanças, invisibilidade, suspensão, cooldown e transporte Android falso com troca de conta e escrita recusada; frontend verifica que a perda da conexão deixa de mostrar um jogo antigo. Os testes Rust integram cargo test e têm uma verificação isolada no CI.

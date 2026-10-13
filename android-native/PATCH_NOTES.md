# BatCaverna Android 1.3.3 — 13/10/2026

- Remove imediatamente da caixa de entrada toda indicação aceita, guardada ou dispensada.
- Impede que uma indicação já resolvida volte a mostrar as ações ao atualizar ou reabrir o aplicativo.
- Inclui a migração idempotente `backend/BatCaverna-1.3.3-Indicacoes-Resolvidas.sql` para bloquear respostas duplicadas também no servidor.

- Reconfirma o jogo, filme, série ou anime na biblioteca antes de abrir a escolha de amigo.
- Envia nome e categoria junto do identificador, permitindo recuperação segura quando o ID local estiver desatualizado.
- Mantém a indicação pendente até o destinatário confirmar o cadastro na própria biblioteca.

- Corrige o envio de indicações quando `notificacoes.referencia_id` usa o tipo UUID no Supabase.
- Adiciona a migração curta `backend/BatCaverna-1.3.1-Correcao-Indicacoes.sql`, que preserva todos os dados existentes.
- Substitui a mensagem técnica do PostgreSQL por uma orientação clara quando a migração ainda não foi aplicada.

- Amigos e conversas: pesquisar pessoas por nome, @usuário ou código e enviar convites. A pesquisa consulta o diretório público autorizado, sem abrir dados privados de quem ainda não é amigo.
- Convites recebidos: aceitar ou recusar no próprio aplicativo; aceitar atualiza a lista de amigos.
- Pesquisa: estados de carregamento, nenhum resultado e erro com nova tentativa. Respostas de buscas antigas ou de outra sessão são descartadas. O botão fica bloqueado durante o envio do convite.
- Indicações: **Aceitar e adicionar** abre o formulário normal para revisar o título. Só marca interesse depois de confirmar o título na sua biblioteca. Cancelar ou falhar no envio mantém a indicação pendente. Não copia dados privados nem o ID do item de quem indicou.
- Estatísticas: calcula a biblioteca completa da própria conta quando a função `clt_journey` ainda não está instalada. Outros erros de acesso ou conexão não são ocultados.
- Fotos: aceita caminhos relativos dos arquivos de perfil e mantém a imagem padrão quando o carregamento falha.
- Mantém biblioteca em grade, categorias/status separados, chat nativo e notificações Android existentes. A implantação do backend de push continua necessária para alertas com o app fechado.

Progresso de episódios continua exigindo a migração `backend/BatCaverna-1.2.0-Supabase.sql`. A alteração do APK não instala funções no Supabase.

Aplicativo Android nativo separado da TWA. Pacote da prévia preservado: `dev.gamersclt.batcaverna.nativeapp.preview`; versão 1.3.3, código 42. A chave privada de assinatura é mantida fora do repositório.

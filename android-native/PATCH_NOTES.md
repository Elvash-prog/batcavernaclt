# Android 1.7.25

Meu Retrô agora tem aba própria, filtros e resumo da coleção. Capas horizontais/verticais são configuradas localmente, com proporção corrigida e preenchimento dos cards. Horas usam uma casa decimal em português. Capa e descrição podem ser recuperadas pela Steam quando a consulta inicial falha, sempre confirmando o título. Busca, cache e exibição progressiva reduzem reconstruções e consultas repetidas.

# BatCaverna Android 1.7.0 — 14/10/2026

- O perfil e o ranking passam a usar XP permanente: remover um título não desconta pontos já conquistados.
- Missões diárias e semanais são garantidas para todas as contas e variam entre adicionar, finalizar, assistir episódios, avaliar e registrar horas.
- Cada missão mostra objetivo, progresso e recompensa em XP; o período vem do servidor para evitar sumiços por diferença de fuso horário.
- A aba grátis combina Epic com jogos e DLCs da Steam em 100% de desconto, com bloqueio de conteúdo adulto.
- Requer a migração `supabase/patch-1.47-progressao-missoes.sql` para ativar a nova progressão e as novas missões.

Aplicativo Android nativo separado da TWA. Pacote da prévia preservado: `dev.gamersclt.batcaverna.nativeapp.preview`; versão 1.7.0, código 47. A chave privada de assinatura é mantida fora do repositório.

## Histórico 1.6.0

- Renomeia a aba inferior **Chat** para **Amigos**, preservando conversas, grupos, contadores e o restante do fluxo atual.
- Adiciona seis temas nativos: Caverna, Oceano, Esmeralda, Rubi, Âmbar e Aurora.
- Aplica o tema escolhido ao fundo, barra inferior, seleção de abas, botões, campos, janelas e barras do sistema.
- Trocar o tema em **Configurações → Aparência** atualiza a interface imediatamente e mantém a escolha neste aparelho.

Aplicativo Android nativo separado da TWA. Pacote da prévia preservado: `dev.gamersclt.batcaverna.nativeapp.preview`; versão 1.6.0, código 46. A chave privada de assinatura é mantida fora do repositório.

## Histórico 1.5.1

- Remove o cartão **Novidades** da tela inicial.
- Mantém o último estado conhecido dos amigos durante reconexões rápidas, evitando que a lista pisque como indisponível.

Aplicativo Android nativo separado da TWA. Pacote da prévia preservado: `dev.gamersclt.batcaverna.nativeapp.preview`; versão 1.5.1, código 45. A chave privada de assinatura é mantida fora do repositório.

## Histórico 1.5.0

- Presença da conta passa a atualizar automaticamente a cada minuto enquanto o aplicativo está em primeiro plano.
- O jogo atual da Steam é publicado no mesmo canal compartilhado pelo desktop e aparece para os amigos sem depender de uma nova abertura da tela.
- O modo **Invisível** agora remove a conta do canal de presença em vez de publicar metadados invisíveis.
- Respostas atrasadas de perfil ou Steam são descartadas depois de sair, trocar de conta, desconectar ou iniciar uma atualização mais recente.
- Mantém o WebSocket autenticado para chat, reações, grupos, leituras, convites e notificações, com consultas autorizadas de reconciliação.

## Histórico 1.4.0

- Adiciona em Configurações a área **Diagnóstico**, com tamanho do histórico técnico, compartilhamento do relatório e limpeza dos registros.
- Registra inicialização, falhas inesperadas e erros genéricos da API sem salvar mensagens, biblioteca, senhas, e-mails, tokens ou o conteúdo das requisições.
- Limita e gira automaticamente o arquivo local para impedir crescimento contínuo.

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

Aplicativo Android nativo separado da TWA. Pacote da prévia preservado: `dev.gamersclt.batcaverna.nativeapp.preview`; versão 1.4.0, código 43. A chave privada de assinatura é mantida fora do repositório.

# Windows 0.17.48 / Android 1.7.15

O diagnóstico de 18/10 mostrou consultas de notificações sobrepostas durante falhas de rede e resolução ambígua de títulos Steam. A consulta de notificações passa a usar uma operação em andamento por vez e espera progressiva de até 60 segundos. Consultas Steam de leitura têm uma nova tentativa limitada; a indisponibilidade dos jogos recentes não elimina a biblioteca completa.

## Catálogo e indicações

IGDB prioriza o nome completo e aliases, filtra resultados sem os termos pesquisados e confere o ID nos detalhes. Mild Sexual Themes deixou de excluir jogos comuns como Horizon Zero Dawn; pornografia, Adults Only e conteúdo sexual explícito continuam bloqueados. O probe público executa uma busca fixa por Horizon Zero Dawn e informa somente um booleano.

A seleção para enviar indicações tem categorias Jogo, Filme, Série e Anime e busca por título no Windows e Android. Não permite enviar uma seleção vazia.

## Progresso

Os clientes percorrem lotes de até cinco títulos Steam por minuto. O backend obtém a Steam vinculada à conta autenticada e atualiza exclusivamente os itens Steam salvos dessa conta, pelo App ID. Horas usam o maior total conhecido e conquistas usam o percentual confirmado; progresso privado ou desconhecido não vira zero. Nota, status e comentários são preservados. Os dados dependem da visibilidade e atualização da Steam.

No Windows, jogos de outras lojas detectados pelo executável registram horas enquanto o BatCaverna está aberto. É possível desativar esse registro em Configurações. Uma tabela com RLS e função SECURITY INVOKER registra intervalos cumulativos de forma idempotente e evita contar duas instâncias simultaneamente. Não registra caminhos, títulos de janelas nem histórico de processos. Conquistas de executáveis sem API não são inferidas: dependem de Steam/RetroAchievements ou integração específica.

## Site de apresentação

O site público apresenta o projeto e oferece os instaladores Windows e Android. O Worker serve apenas a página de apresentação e seus assets explicitamente permitidos. Configuração, APIs, service worker e scripts do antigo aplicativo web retornam HTTP 410. A página não faz chamadas ao Supabase e não oferece login. Sua implantação na hospedagem deve ser feita separadamente da publicação dos aplicativos.

As funções native-api e bright-api rejeitam requisições com Origin de navegador e continuam exigindo usuário autenticado para negócios. Essa restrição de origem retira o cliente web oficial; não é atestação criptográfica de cliente. O banco mantém suas regras de acesso.

Desktop e APK usam Supabase; confirmação e recuperação continuam no fluxo de códigos dos aplicativos. A alteração do site não apaga contas nem coleções.

## Validação

Testes de busca/IDs, filtragem de conteúdo, autenticação, origem, sincronização Steam e isolamento de conta. Testes SQL com rollback verificam duração, idempotência e duas sessões. Testes desktop cobrem recuo de notificações e filtros de indicação. CI valida interface, Rust, abertura real do Tauri, Java, Android Lint e builds.

# Escolha de capa fixa — 2.1.5

A URL persistida em itens.capa é a escolha definitiva do usuário, independentemente da origem: capa original do IGDB, SteamGridDB, imagem enviada ou URL personalizada permitida. Não é necessário adicionar flags, inferir a intenção pelo fornecedor ou migrar a biblioteca. A escolha existente passa a valer também após reiniciar o aplicativo e em outros dispositivos atualizados.

Windows: toda URL salva é considerada fixa. A primeira imagem do card ignora hints antigos quando há uma URL no título. A hidratação prioriza a URL salva; falhas tentam somente o mesmo arquivo e terminam em placeholder, sem consultar outra arte. O hero do início também usa a capa salva; URLs públicas personalizadas continuam carregando pelo navegador como nos cards. Mudar o formato muda o enquadramento, sem consultar ou escrever outra URL. Associar App ID não troca a capa. Respostas de catálogo atrasadas e cliques anteriores no seletor não substituem uma escolha manual mais recente.

Atualizar dados em lote deixa de alterar capas, inclusive de títulos sem capa. A busca explícita de capas ausentes atua apenas em títulos sem URL; o usuário pode escolher outra imagem no editor a qualquer momento. Selecionar um novo resultado no catálogo ou escolher outra imagem é uma ação explícita e continua disponível.

Android: o loader usa diretamente qualquer URL salva antes de ler preferências antigas ou consultar catálogos. As listas de candidatos contêm somente a URL escolhida quando ela existe, independentemente do App ID e da orientação. As alternativas automáticas continuam disponíveis para títulos sem capa. Tickets existentes impedem que callbacks de uma imagem anterior substituam uma carga mais recente.

O cache de pixels mantém a mesma imagem, sem decidir outra origem. URLs expiradas, removidas ou bloqueadas não são prometidas como eternamente disponíveis: o aplicativo preserva a escolha e indica indisponibilidade. Não ampliamos hosts permitidos, acesso à mídia privada, autenticação, uploads, RLS ou regras de senha.

Testes: três origens nos dois formatos, hints antigos ignorados no primeiro frame, falha sem consulta de arte, fonte do hero, atualização de dados sem alteração de capa e resposta de catálogo atrasada. Android testa o bypass do catálogo/hints e candidatos sem substitutas. A escolha continua persistida pelo fluxo de edição já existente.

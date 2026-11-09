# Feed dos amigos — 2.1.0

O feed de jogos substitui o bloco de atividades na tela inicial. No Windows, fica na barra lateral, inclusive quando compactada. No Android, fica no atalho Feed dos amigos.

A timeline mostra a própria atividade e a de amigos autorizados: mudanças de status e publicações manuais sobre um jogo da biblioteca (comecei, recomendo, zerei). Não há texto livre, upload de mídia ou publicações globais nesse recurso. Os posts antigos da comunidade permanecem preservados nas rotas de notificações existentes.

Os cartões têm autor, capa, atividade, data e curtidas. Capa e botão de detalhes abrem a consulta do título. Adicionar abre o cadastro na própria biblioteca, com revisão antes de salvar e verificação de duplicatas. Identificador do item de outra pessoa, horas, nota, preço, comentários pessoais e progresso nunca são copiados. O autor pode excluir suas publicações manuais.

## Banco e permissões

A migração `20261109154338_friends_game_feed.sql` adiciona curtidas com chave primária composta e RLS. A função `clt_game_feed` usa SECURITY INVOKER, exige autenticação e permanece sujeita às políticas existentes de atividades, itens, amizades e bloqueios. Nenhuma chave privilegiada é usada nos clientes.

A leitura retorna até 20 cartões por página, com cursor por data e identificador, mantendo a precisão de bigint. Curtidas usam o estado desejado, para que repetição de requisições não duplique a contagem. Publicações manuais têm repetição idempotente por 30 segundos e limite de 30 por hora no RPC. A API direta de atividades já existente conserva suas permissões anteriores; o limite do RPC não é uma quota global dessa tabela.

`tests/sql/game-feed.sql` deve ser executado em transação e seguido de ROLLBACK. O ensaio valida leitura por dono/amigo, rejeição de desconhecidos e bloqueados, curtida idempotente, autoria, remoção, cursor e ausência de dados privados no título. Usa uma amizade e um jogo existentes, sem criar contas nem enviar mensagens. Não execute sem transação.

Testes de modelo e interface cobrem descrições, cópia de metadados, curtidas, paginação, cadastro e navegação durante uma resposta atrasada. O Android também verifica descarte de resposta depois de troca de conta.

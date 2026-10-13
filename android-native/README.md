# BatCaverna Android 1.4.0

Atualização do aplicativo Android nativo, separado da TWA. [Notas da atualização](PATCH_NOTES.md).

Em **Perfil → Configurações → Diagnóstico**, agora é possível compartilhar ou limpar um relatório técnico local. Ele registra apenas etapas e tipos genéricos de falha, limita o tamanho e oculta possíveis credenciais, e-mails e tokens; mensagens e conteúdo da biblioteca não entram no arquivo.

Indicações aceitas, guardadas ou dispensadas agora somem da caixa de entrada. Para impedir também uma segunda resposta no servidor, execute `backend/BatCaverna-1.3.3-Indicacoes-Resolvidas.sql` no SQL Editor do Supabase.

Em Amigos ou Conversas, toque em **Adicionar amigo** para pesquisar por nome, @usuário ou código. **Convites recebidos** permite aceitar ou recusar solicitações.

Em Indicações, **Aceitar e adicionar** abre a revisão normal do título; o aceite só é registrado após a confirmação na biblioteca. As estatísticas têm cálculo alternativo da biblioteca da própria conta se `clt_journey` estiver ausente. Progresso de episódios ainda depende da migração abaixo.

Ao enviar uma indicação, o aplicativo reconfirma o título na biblioteca e envia nome e categoria como recuperação segura. Isso evita a mensagem incorreta de título ausente quando o identificador local ficou desatualizado.

Compilação: JDK 17, Android SDK 36, `bash gradlew :app:testDebugUnitTest :app:assembleDebug :app:lintDebug`. Os testes de 1.3.0 verificam busca, respostas atrasadas, mudança de conta, caminhos de imagens, privacidade dos títulos indicados e estatísticas com mais de 1.200 itens.

## Histórico 1.2.0

## Ativação

1. Execute `backend/BatCaverna-1.2.0-Supabase.sql` inteiro no SQL Editor do Supabase. É uma migração adicional à 1.1.0; pode ser reexecutada sem apagar dados.
2. Instale o APK 1.2.0 sobre o aplicativo atual, sem desinstalar.
3. Recarregue o site; no PWA, feche e abra após a atualização.

## Progresso de séries e animes

Abra os detalhes de uma série ou anime da sua biblioteca e toque em **Progresso de episódios**. Registre temporada, último episódio assistido e, opcionalmente, total de episódios da temporada. Episódio 0 significa que ainda não começou.

**Próximo episódio** avança uma unidade. **Próxima temporada** avança a temporada, zera o episódio e limpa o total anterior. Não há avanço automático entre temporadas. O status do título (Assistindo, Assistido etc.) continua sendo editado separadamente.

O progresso é privado e compartilhado entre site e APK. Revisões impedem que duas telas incrementem o mesmo estado ao mesmo tempo. Em caso de conflito ou resposta incerta, atualize antes de reenviar. Excluir um título da biblioteca também remove seu progresso. Filmes e jogos não recebem controles de episódios.

## Estatísticas pessoais

O atalho **Estatísticas** e as configurações da conta mostram a biblioteca completa: títulos por categoria, títulos concluídos, horas registradas em jogos e conclusões dos últimos 12 meses, usando a data de finalização informada.

Platinados e favoritos contam como concluídos. Títulos concluídos sem data entram nos totais, mas ficam fora do gráfico mensal. Os valores refletem a biblioteca atual, e não um histórico imutável de eventos; remover um título ou mudar seu status altera os totais. Não são estimadas horas por mês. A referência mensal usa o fuso de São Paulo.

## Rascunhos de publicações

O texto é salvo automaticamente neste aparelho, separado por conta, e recuperado ao reabrir o Social. **Limpar texto** descarta o texto do rascunho. Fotos e vídeos não são guardados e precisam ser selecionados novamente ao reabrir a tela.

Só uma publicação confirmada limpa seu rascunho; falhas preservam o texto. Um texto mais recente escrito durante o envio não é apagado pelo sucesso da publicação anterior. Rascunhos não são sincronizados entre aparelhos. Apagar os dados do aplicativo ou do navegador também apaga seus rascunhos.

## Verificação

Migração executada em PostgreSQL via PGlite com 66 verificações: acesso por conta, IDs numéricos/UUID, incrementos e conflitos, limites, reexecução, remoção de título e estatísticas com mais de 1.200 itens. Fluxos de progresso, estatísticas e publicação/résgate de rascunho verificados em DOM simulado, incluindo a função real de publicação do site. APK compilado e Android Lint sem erros. Assinatura mantida para atualização sobre a versão anterior.

Não houve validação em aparelho Android ou sessão Supabase de produção. A aplicação da migração no banco de produção continua sendo necessária.

Testes: `npm install --prefix tests` e, da raiz do repositório, `node tests/journey-database.mjs` / `node tests/journey-ui.mjs`.

---

# BatCaverna 1.1.0

Listas personalizadas, indicações de títulos entre amigos e preferências de notificações usam o mesmo RPC `clt_features` no site e no APK.

## Ativação

1. Execute `backend/BatCaverna-1.1.0-Supabase.sql` inteiro no SQL Editor do Supabase. A transação pode ser executada novamente sem apagar dados.
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

---

# BatCaverna 1.0.2 — avisos de novas publicações

- social_post abre o feed social. Se referencia_id existe, abre o post exato. Avisos antigos sem referência abrem as publicações do autor, preservando paginação e regras de acesso; não se tenta adivinhar qual post originou o aviso.
- Atualizar mantém a publicação ou o autor selecionado. Corrigido o carregamento inicial do feed que deixava Atualizar desabilitado após abrir uma notificação.
- Comentários abrem somente para social_comment/social_reply. Publicações novas e curtidas abrem o cartão sem janela automática de comentários.
- Versão 1.0.2, código 36, pacote e assinatura preservados. Compilação/lint e testes de roteamento; sem teste em aparelho ou conta autenticada. Não exige alteração no site, SQL ou push.

# BatCaverna 1.0.1 — notificações interativas

- Toque no cartão da central ou no alerta Android abre o destino, após consultar a notificação da conta atual.
- Mensagem privada abre a conversa do remetente; mensagem de grupo abre o grupo autorizado; convite abre Amigos ou Grupos; amizade aceita abre o perfil do amigo.
- Curtida abre a publicação. Comentários/respostas abrem a publicação e os comentários. Conquistas, níveis e missões abrem a seção do perfil.
- Cada alerta Android mantém seu próprio destino. Login pendente preserva a abertura; sair da conta limpa o destino. Avisos de outra conta, removidos ou sem acesso não abrem conteúdo privado.
- Versão 1.0.1, código 35, mesmo pacote e assinatura da 1.0.0. Nenhuma mudança no site ou no servidor de push.
- Validação: testes de roteamento, compilação e lint Android. Sem aparelho/emulador ou conta autenticada para testar toques e integrações ponta a ponta.

# BatCaverna 1.0.0 — Versão Definitiva

Versão 1.0.0, código Android 34. Semana prepara os três objetivos automaticamente antes de consultar: adicionar 3 jogos (80 XP), adicionar 3 filmes/séries (70 XP), adicionar 2 jogos (50 XP). O terceiro reutiliza o catálogo V2; no servidor legado usa adicionar 1 jogo (25 XP). Não reinicia missões existentes nem recompensas recebidas. O progresso e resgate continuam calculados pelo servidor compartilhado com o site.

Respostas de uma aba de missões anterior são descartadas ao alternar Hoje/Semana. Mesma assinatura e pacote da 0.33.0. Sem teste em aparelho ou conta autenticada.

# BatCaverna Native 0.33.0 — capa e acesso aos amigos

- Capa do perfil e sua sombra ocupam toda a altura do cabeçalho (220 dp), eliminando a faixa inferior causada pela imagem de 180 dp. Mantém posicionamento e zoom salvos no site.
- Na lista de amigos, nome, avatar e card abrem o perfil com suas bibliotecas. Removido o botão adicional. Na lista de conversas, o card continua abrindo o chat; nome/avatar abrem o perfil.
- Amigos online traduzem os status internos e usam sua cor: dnd aparece como 🔴 Não incomodar. Chaves salvas e presença continuam compatíveis com o site.

Validação: assembleDebug/lintDebug e verificações de lógica existentes. Mesmo pacote e assinatura para atualizar a instalação. Sem aparelho/emulador ou sessão autenticada para validar visualmente no celular. Nenhuma alteração no site, SQL ou Firebase.

# BatCaverna Native 0.32.0 — edição completa e perfis dos amigos

- Sair da conta removido do perfil e disponível em Configurações > Conta. Mantém revogação do push, limpeza da sessão e retorno ao login.
- Editor unificado para jogos e mídia: plataformas múltiplas, loja, prioridade, tipo, status, nota, gêneros e onde assistir com seletores. Mantém escolhas antigas que não pertencem às opções padrão; nomes equivalentes de plataformas/serviços são normalizados para evitar duplicação por emojis.
- Mídia permite alterar onde assistir, duração/temporadas/episódios, nome, tipo, ano, gêneros, datas, nota, anotações e capa. Jogos mantêm esses campos próprios e incluem horas, tempo estimado, conquistas e preço. Datas têm calendário e limpeza por toque longo.
- Trocar capa por URL de catálogo permitido ou por imagem do celular (JPG/PNG/WebP). Upload passa pelo mesmo endpoint moderado em bucket avatars, com path exclusivo do dono; não modifica a foto do perfil. A capa aprovada só é aplicada ao salvar o título. Cancelar a edição pode deixar uma imagem órfã no bucket; não há remoção automática de objetos por esta versão.
- Atualização em uma única operação PATCH do título com categoria, dono e updated_at esperados; validação dos campos, datas e capa. Imagens novas de outras contas, hosts arbitrários, caminhos com travessia e protocolos inseguros são rejeitados. Nenhuma flexibilização de RLS.
- Amigos: botão Ver perfil e bibliotecas; tocar na foto também abre. Conversas continuam compactas, sem botão adicional por linha.
- Janela do amigo com abas Perfil, Jogos, Filmes e Steam. Mostra capa/avatar/bio/status personalizado, totais, jogos e conquistas em destaque. Bibliotecas permitem busca, agrupamento por tipo/status, carregamento de mais títulos e detalhes apenas para consulta; Steam mostra os jogos e as horas retornados pela integração.
- Consultas revalidam amizade e chamam perfil_detalhes_autorizado, além de seguirem RLS. Nenhum preço privado, review privada, e-mail ou campo de conta é solicitado para o amigo. Não oferece edição/exclusão dos itens do amigo nem suas missões/ranking próprios.

Validação: 323 verificações de lógica, incluindo 10 de edição de capa/isolamento de dono. assembleDebug/lintDebug, mesmo pacote e assinatura da versão 0.31. Sem aparelho ou contas autenticadas para validar envio moderado, salvamento e acesso a perfil de amigo ponta a ponta. Testar: loja/plataformas/gêneros no jogo; onde assistir/tipo/duração no filme; trocar a capa pelo celular e salvar, depois conferir no site; alterar dois dispositivos para confirmar proteção por updated_at; abrir perfil de amigo e suas quatro abas; conferir negação após remover amizade/bloquear; sair em Configurações. Nenhuma alteração no site, SQL, Worker ou Firebase.

# BatCaverna Native 0.31.0 — listas por nomes, telas adaptáveis e capas

- Função separada “Adicionar vários por nomes” nas bibliotecas de jogos e filmes/séries/animes. Aceita até 50 nomes, um por linha ou separados por ponto e vírgula; elimina nomes repetidos sem separar títulos que contêm vírgulas.
- Busca todos os nomes sequencialmente, com progresso e miniaturas. Correspondências exatas (ignorando acentos/caixa/espaços repetidos) são selecionadas. Para resultados ambíguos, escolha no seletor; nomes não encontrados só são cadastrados manualmente se a pessoa selecionar essa opção.
- Após conferir os resultados e tocar “Adicionar N títulos”, completa os detalhes de cada título e grava a seleção automaticamente. Reutiliza padrões, validação, confirmação de inserções, verificação de duplicados e interrupção em falha da versão 0.30. Se um detalhe precisar de correção, abre a revisão antes de gravar. Cancelar a janela interrompe as próximas etapas; não desfaz gravações já confirmadas.
- Interfaces: grades de bibliotecas, recomendações e conquistas/destaques calculam 1 a 4 colunas a partir da largura real disponível e da fonte do sistema. Reorganizam sem buscar dados novamente; capas acompanham a largura do card. Títulos do cabeçalho não invadem o sino; navegação/atalhos e seletores ganham altura para fontes maiores; botões do perfil permitem altura natural.
- Janelas respeitam o tamanho atual da janela e as barras/recortes do sistema; largura limitada a 720 dp em telas grandes. Conteúdo continua rolável e o teclado usa ajuste de altura.
- Capas públicas continuam carregando ao renovar o token, mas resultados são descartados ao mudar/sair da conta. Imagens privadas continuam exigindo sessão válida e confirmação do token usado. Carregamentos anteriores do mesmo ImageView são invalidados, inclusive ao receber uma URL vazia.
- Download de imagens admite até 12 MiB com arquivo temporário no cache privado do app, removido ao finalizar; evita duas cópias grandes de bytes na memória. Bitmaps continuam reduzidos a até 1024 px por dimensão; cache de memória respeita o limite do processo (até 16 MiB). Retentativa única em falha de rede e seis alternativas Steam, com hosts/redirecionamentos validados. URLs HTTP de hosts públicos já permitidos são convertidas a HTTPS; novos hosts não são liberados.

Validação: 313 verificações de lógica, incluindo listas, limites, acentos, telas estreitas, fontes ampliadas e imagens durante renovação/troca de conta; assembleDebug/lintDebug. Mesma assinatura e pacote, versão 0.31.0/código 31. Sem aparelhos/emulador ou conta autenticada para verificar catálogo, salvamento e capas ponta a ponta. Testar no aparelho: colar Hades/Celeste/Elden Ring em linhas separadas; escolher resultados e adicionar; repetir para filmes; nomes ambíguos e indisponíveis; ampliar a fonte; abrir bibliotecas e perfil em telas estreitas/largas; repetir o carregamento de capas que falhava. Nenhuma mudança em SQL, site, Worker, Firebase ou publicação Realtime.

# BatCaverna Native 0.30.0 — catálogo completo e adição múltipla

- Jogos e filmes/séries/animes usam uma seleção com capas e até 20 títulos por lote. A seleção permanece ao buscar outro nome ou outro tipo de mídia. Revisão individual antes do salvamento; status padrão para novas seleções e ação para aplicar o status a todos os selecionados.
- Jogos: catálogo RAWG fornece capa, ano, gêneros, sinopse e playtime quando disponíveis. Playtime é uma estimativa do catálogo, não horas jogadas pelo usuário. A mesma função steamInfo do site tenta completar o identificador Steam, a loja e o preço, sem impedir o cadastro quando indisponível.
- Filmes/séries: detalhes TMDB fornecem ano, gêneros, sinopse, duração/temporadas/episódios; provedores brasileiros tentam completar onde assistir. Serviços também podem ser escolhidos manualmente em seleção múltipla. Recomendações agora preservam IDs para buscar detalhes ao adicionar.
- Revisão: status, nota, plataformas múltiplas, loja, prioridade, horas, estimativa, conquistas, preço, gêneros, ano, capa, início, conclusão e anotações para jogos; tipo da seleção, status, nota, provedores, duração, ano, gêneros, capa, datas e anotações para mídia. Datas usam calendário e podem ser limpas com toque longo.
- Padrões de jogos iguais ao site: PC, Steam, backlog, prioridade média e A considerar. Mídia começa em Para assistir e A considerar. Dados pessoais (datas, avaliação escrita, progresso de conquistas) não são inventados; campos ausentes no catálogo ficam editáveis.
- Salvamento sequencial com consultas de duplicados na conta/categoria/tipo; já existentes são ignorados. Confirma cada inserção; uma falha interrompe o lote e informa os confirmados. Não reenvia automaticamente uma inserção de resultado incerto. Fechar após salvamentos parciais atualiza a biblioteca.
- Dados vão para os mesmos campos de itens do site, com token da sessão e RLS existente. Nenhuma mudança no site, SQL, Firebase ou publicação Realtime.

Validação: 271 verificações de lógica, incluindo 16 para datas inválidas, anos, conclusão anterior ao início e limites. assembleDebug/lintDebug; mesma assinatura/pacote da versão 0.29. Sem aparelho ou conta autenticada para testar os catálogos e as gravações ponta a ponta. Conferir no aparelho: selecionar dois jogos, revisar e aplicar status, salvar; repetir com filme e série; comparar detalhes no site; verificar título duplicado e falha de conexão. Esta compilação não é rotulada como estável sem essa validação.

# BatCaverna Native 0.29.0 — mensagens e avisos em tempo real

- Conexão WebSocket autenticada Supabase/Phoenix 1.0.0, com canais independentes para mensagens, reações, grupos, leituras, convites e notificações. IDs confirmados nas respostas de assinatura validam os eventos; uma conexão TCP aberta não basta.
- Eventos invalidam a tela e consultam novamente os dados autorizados pela conta. O aplicativo não exibe texto/autores diretamente do evento de banco. Exclusões só removem de imediato IDs já carregados naquela conversa; os demais eventos geram consultas autorizadas.
- Atualização de conversas privadas/grupos sem trocar o destinatário, preservando rolagem e rascunho. Alterações e reações em histórico antigo carregado são buscadas individualmente; o lote mais recente é reconciliado junto, reduzindo consultas duplicadas.
- Central de notificações e contadores atualizados por eventos, com agrupamento em 120 ms. A central preserva posição e a quantidade de avisos carregados (até 1.000).
- Retentativas de conexão com espera progressiva de 2 a 30 s, heartbeat, renovação da sessão via reconexão, cancelamento no segundo plano/desanexação. Eventos/callbacks de sockets antigos são descartados.
- Indicador no Chat: "● Ao vivo" quando todas as assinaturas foram confirmadas; "◌ Atualização automática" durante a reconexão/consulta de reserva. Consultas de reconciliação ficam a cada 45 s conectado; em reserva, chat 8 s (com backoff em falhas), contadores/avisos 15 s.
- Firebase segue responsável pelo push com aplicativo fechado. O Realtime não cria um segundo alerta local.

Ativação no servidor: execute backend/Native-0.29-Realtime.sql no SQL Editor do mesmo projeto Supabase. O SQL é idempotente e só acrescenta tabelas existentes à publicação supabase_realtime; preserva RLS/grants/dados, não cria tabelas ausentes nem altera REPLICA IDENTITY. Verifique o resultado com as oito tabelas. Não foi executado remotamente por este projeto.

Validação: 255 verificações de lógica (incluindo 18 de assinatura/retentativa), assembleDebug e lintDebug. Sem duas sessões autenticadas/aparelho para validar entrega ponta a ponta; não rotulada estável. Testar: habilitar tabelas; instalar atualização; Chat mostra Ao vivo; receber texto/figurinha/reação e apagar/editar do site; contadores zeram ao ler; desligar e religar internet; alternar aplicativo e confirmar que não troca a conversa. Fora do aplicativo testar push Firebase.

Protocolo consultado: https://supabase.com/docs/guides/realtime/protocol e https://supabase.com/docs/guides/realtime/postgres-changes.
Versão 0.29.0, código 29; pacote e assinatura compatíveis com 0.28. Código do site/Worker/Firebase não foi alterado.

# BatCaverna Native 0.28.0 — capas e seções por status

- Jogando agora: a altura do card acompanha a proporção da imagem decodificada. A capa preenche a área sem faixas geradas pela altura fixa, preservando a imagem completa com FIT_CENTER.
- Seções da biblioteca: ícones, contadores em badges, gradiente e borda na cor do status. Zerados verde; Platinados ciano; Em progresso azul; Jogando agora laranja; Backlog roxo; Wishlist rosa; Pausados amarelo; Abandonados vermelho. O mesmo tratamento inclui status de filmes/séries sem modificar critérios ou itens.
- Versão 0.28.0, código 28. Mesmo pacote e assinatura da 0.27; instalação como atualização.

Validação: compilação assembleDebug e lintDebug. Esta mudança é visual; a lógica de status e sincronização permanece a anterior. Não houve validação em aparelho/emulador. Conferir no aparelho a proporção de capas horizontais/verticais e os cabeçalhos de biblioteca.

# BatCaverna Native 0.27.0 — bibliotecas, avisos e mensagens não lidas

- Central de avisos compacta: ícones vetoriais por categoria, cores, ações de ler/apagar com descrição acessível, controles gerais menores.
- Bibliotecas gamer e audiovisual: cartões de estatísticas com gradientes, cores e ícones. Ranking resumido aos três primeiros e posição/XP próprios; classificação completa em janela.
- Início sem a prateleira de filmes/séries. Jogando agora usa cartões horizontais e FIT_CENTER, mantendo a capa inteira.
- Perfil: seletor de status em botões coloridos, mantendo online/jogando/ausente/dnd/invisivel do site. Após salvar no mesmo campo do Supabase, a presença do aplicativo é republicada no canal compartilhado com o site.
- Removido o menu de três pontinhos do cabeçalho; as configurações continuam no perfil.
- Contadores no Chat da navegação inferior, abas Conversas/Grupos e linhas de conversas. Consultas no primeiro plano a cada 15 segundos. Leitura privada usa lida=true com limite no último horário efetivamente carregado; leitura de grupo usa clt_chat_group_reads. Não marca mensagens que chegarem após esse limite. O aplicativo conserva contadores quando a consulta falha, sem inventar zero.

Validação: assembleDebug/lintDebug aprovados, 237 verificações de lógica aprovadas. Assinatura/pacote compatíveis com a versão anterior. Sem teste visual em aparelho/emulador e sem sessão de duas contas para verificar leitura e presença integrada. Conferir: receber mensagem privada/grupo com app aberto, ver contadores, abrir a conversa e confirmar remoção do contador; mudar status e consultar no site; testar capas horizontais/verticais, ranking e avisos.

Versão 0.27.0, código 27. Não modifica o código do site, Worker, Firebase ou políticas SQL. Usa os campos de leitura que o site já utiliza.

# BatCaverna Native 0.26.0 — grupos e interface compacta

- Chat dividido em Conversas e Grupos, com linhas menores, pesquisa e atualização discreta.
- Grupos: criar com convites, aceitar/recusar, trocar nome/foto, ver participantes, convidar amigos, promover/rebaixar administradores, remover membros e sair. O criador não recebe controles de remoção/rebaixamento no cliente; o servidor continua validando permissões.
- Mensagens de grupo: texto, figurinhas da conta, responder, reagir, apagar mensagem própria e histórico paginado. Sincronização no primeiro plano preserva o grupo selecionado.
- Configurações de grupo com abas Grupo, Membros e Convites. Membros atuais e convites pendentes são excluídos do seletor de novos convidados.
- Início: capa/saudação compactas, nível e XP reais, resumos coloridos, presença, atividades em linhas com avatar e horário relativo, Steam e bibliotecas.
- Limpar atividades esconde o histórico já visto nesta instalação, separado por conta. Não apaga dados de amigos no servidor. Novas atividades continuam aparecendo.
- Conquistas: 32 ícones, cartões com bordas douradas quando desbloqueados e ícones no resumo de XP/destaques.

Integração: reutiliza tabelas/RPCs de grupos já usadas pelo site (criar_grupo_convites_clt, convidar_grupo_clt, listar_convites_grupo_clt, responder_convite_grupo_clt, definir_admin_grupo_clt, remover_membro_grupo_clt, sair_grupo_clt). O APK não altera SQL, políticas, site, Worker nem Firebase. Fotos/figurinhas passam pelo endpoint existente de moderação e usam buckets privados group-avatars/group-chat-media.

Validação: 226 verificações de lógica/validação aprovadas, assembleDebug e lintDebug aprovados. Sem aparelho/emulador ou sessão de duas contas disponível para validar visualmente e testar o fluxo integrado com RLS. Conferir no aparelho: criar grupo e aceitar convite em outra conta; enviar figurinha/reação/resposta; trocar foto; atualizar em segundo plano sem trocar conversa; sair e tentar acesso; limpar atividades e receber uma nova atividade.

Pacote e assinatura iguais à 0.25, permitindo instalação como atualização. Versão 0.26.0, código 26; não rotulada como estável antes da validação integrada no aparelho.

# BatCaverna Native 0.25.0 — chat, feed e destaques

## Mudanças da 0.25

- Chat: ações pelo toque prolongado em texto/imagem/balão, com responder, copiar, reagir e apagar a própria mensagem após confirmação. Removido o botão ⋯ permanente e o título “Anexo”; imagens sem texto têm balão transparente e reações compactas. Respostas usam quebra de linha real e trecho citado no balão. Remoção usa id + remetente da conta autenticada; atualizações do destinatário seguem o polling existente.
- Feed: imagens com altura proporcional e FIT_CENTER, sem recorte central, e toque para ampliar na janela nativa. O conteúdo textual vazio não reserva espaço. Menu ⋯ em posts próprios, com confirmação e DELETE limitado a id + user_id da sessão, usando a mesma tabela/regras do site. Arquivos armazenados não são removidos por este cliente.
- Destaques: duas abas Jogos/Conquistas, sem rolagem aninhada; busca, filtro dos selecionados, contador 8/4 e mais jogos em lotes de 24. Só conquistas desbloqueadas. Botão salvar e feedback fixos no rodapé; seleção bloqueada durante a gravação.
- Janelas nativas limitadas à altura disponível, com corpo rolável e cabeçalho/rodapé preservados, inclusive quando o teclado reduz a janela.
- Ícones desenhados para responder, copiar, enviar, figurinhas, imagem, curtida, comentário, lixeira e troféus; acentos coloridos na navegação e botões com gradiente/ripple.
- Verificação: 204 testes Java passaram; compilação Android concluída e lint sem erros. Não houve teste visual em emulador/aparelho nem autenticação com conta real nesta entrega.
- Não exige migração de SQL, Firebase ou publicação do site. Mesma assinatura/pacote da 0.24. Compilação e testes não substituem a validação visual no aparelho, nem comprovam exclusão com RLS em uma conta real.

# BatCaverna Native 0.24.0 — login por usuário

## Mudanças da 0.24

- Tela nativa de login/cadastro com o cartão, cores, textos e botão vermelho das referências do site. Fundo fixo obtido de /fundo.jpg e da configuração pública configuracoes_site.fundo_login; usa gradiente caso a rede/imagem esteja indisponível. O fundo não é embalado no APK.
- Login por usuário pela rota HTTPS /api/account/login do site, sem consultar nem expor e-mails dos outros perfis. Usuário confirmado pelo Supabase Auth antes de persistir sessão.
- Cadastro com nome, usuário, e-mail, senha de pelo menos 12 caracteres e confirmação, usando o trigger já existente do site. Se confirmação de e-mail estiver habilitada, pede confirmação; não simula sessão.
- Recuperação por e-mail em janela nativa. Permanecer logado pode ser desmarcado: a sessão deixa de ser restaurada ao iniciar um novo processo do app.
- Mesma assinatura e pacote da 0.23, com versão 0.24.0/código 24. Não modifica o site nem exige SQL ou Firebase novo.
- Verificação: 204 testes Java passaram, build Android concluído e lint com zero erros. Validar login, cadastro, fundo e teclado no celular; não houve teste visual ou autenticação com conta real nesta entrega.

# BatCaverna Native 0.23.0 — navegação e notificações

Aplicativo Android nativo separado do site, com as mesmas contas e dados Supabase. A 0.23 mantém o identificador .preview e a assinatura instalada para permitir atualização direta; o nome exibido passa a BatCaverna dos CLTs. Não exige novo cadastro Firebase. O usuário concluiu o servidor FCM e confirmou a entrega na 0.22. Esta atualização não altera site, SQL nem Edge Functions. Validar novas telas e avisos no aparelho antes de oficializar como estável.

## Mudanças da 0.23

- Início sem a faixa global de atalhos. Jogos mostra Steam, Grátis e Recomendados; Filmes mostra recomendados exclusivos de filmes/séries/animes; Chat mostra Amigos e Social. As subtelas mantêm o contexto da aba principal; Voltar retorna à aba correspondente.
- Sininho desenhado no topo e contador de não lidas; central com marcar todas como lidas, apagar uma ou todas, com confirmação nativa e consultas limitadas ao destinatário autenticado. Erros não fingem sucesso. Apagar remove avisos da conta compartilhada com o site.
- Notificações genéricas de mensagem privada suprimidas; textos que identificam o remetente preservados. Deduplicação por ID sincronizada entre FCM e polling. Não altera notificações emitidas por outro aplicativo/PWA instalado; se a duplicata vier do navegador, desativar o push daquela instalação.
- Grátis utiliza as mesmas fontes do site: bright-api op gratis (Epic atuais/futuras) e /api/steam-free (100% Steam). Ofertas vencidas removidas na atualização; atualização automática a cada cinco minutos enquanto a tela está visível; botão manual, falhas parciais por loja. Resgate abre somente URLs HTTPS das lojas Steam/Epic, sem credenciais. Não resgata automaticamente. Imagens Epic autorizadas nos hosts CDN conhecidos.
- Nome do app sem Prévia. Configuração Firebase existente mantida.
- Verificação: 187 checks Java; APK/lint. Sem emulador, inspeção visual no dispositivo ou consulta autenticada das ofertas nesta entrega.

## Recursos mantidos da 0.22

- Biblioteca própria inteira para contagens/resumos, em páginas de 250 e limite de 20.000; exibição em seções por status, com seis cartões iniciais e expansão de mais 12 por seção. Busca alcança os títulos carregados da biblioteca inteira.
- Jogos: Jogando agora (status explícito), Em progresso, Backlog, Zerados, Platinados, Wishlist, Biblioteca Steam, Pausados, Abandonados e Outros. Atividade atual da própria Steam aparece em um cartão separado, consultado ao abrir/atualizar Jogos.
- Filmes, séries e animes divididos por tipo e por Assistindo, Para assistir, Assistidos, Favoritos, Pausados, Abandonados e Outros. Favoritos também contam como concluídos no resumo.
- Ranking dos CLTs em Jogos, com nível/XP/posição próprios, cinco primeiras posições e janela para ranking completo. Avatares autorizados com inicial como fallback.
- Resumos reais de totais, finalizados, platinas e horas; estatísticas expansíveis por ano, últimos 12 meses, gêneros, plataformas/serviços e avaliações. Datas ausentes não entram nos gráficos temporais. Os gráficos são nativos em barras.
- Cartões de biblioteca mais próximos às referências: capa horizontal, título, plataforma/ano, horas, avaliação e preço próprio carregado exclusivamente por meus_privados. Falha no RPC privado é informada, sem tratar como preço zero.
- Amigos online com avatar circular ou inicial; Steam dos amigos com imagem horizontal e alternativas de capa pelo appid, em vez de somente a URL fornecida pelo servidor. URLs alternativas verificadas com um jogo público conhecido; ainda precisam ser testadas com o jogo da captura.
- Adicionar jogo com janela nativa, status em seletor escuro e várias plataformas por seleção; PC marcado por padrão. Filmes/séries/animes com status completos, seletor de serviço de streaming e campo para outro serviço.
- Firebase configurado no cliente usando o arquivo enviado para o pacote da prévia. O APK e o ZIP incluem essa configuração do aplicativo, não uma chave privada de servidor. Cadastro/estado do dispositivo visível em Notificações; supressão de alertas duplicados entre FCM e consulta local.
- Integração do servidor ainda pendente: aplicar a tabela opcional, configurar os segredos na Edge Function e criar o webhook. Nenhuma dessas ações foi publicada nesta etapa.

## Recursos mantidos da 0.21

- Configurações em Conta, Aparência, Notificações e Privacidade. Alteração de senha e e-mail usando Supabase Auth; confirmação de e-mail depende da configuração do servidor. Gerenciamento de bloqueios pelas regras existentes.
- Editar perfil em Informações, Aparência e Destaques. Nome, bio, status, títulos desbloqueados; trocar foto, capa e fundo. Foto com zoom de 25 a 250% aplicado à imagem enviada. Capa com prévia, posição horizontal/vertical e zoom persistidos no formato do site.
- Até oito jogos da própria biblioteca e quatro conquistas desbloqueadas em destaque; busca local com capas. Seleção de título usa o XP autorizado do ranking.
- Busca para adicionar jogos e filmes com capas nos resultados. Detalhes de jogos com imagem e cartões de informações; edição de nome, plataforma, loja, ano, prioridade, tempo estimado, porcentagem de conquistas, gêneros e preço privado, além de status, nota, horas e anotações. Alterações/exclusão preservam a verificação de versão do item.
- Início com contagens reais das bibliotecas, jogos em andamento, filmes/séries, alterações próprias, amigos online, atividades recentes dos amigos e amigos jogando Steam. Presença usa o mesmo canal Realtime do site, apenas enquanto o app está visível. Nome/avatar vêm do diretório autorizado dos amigos.
- Atividades dos amigos: até 12 eventos deduplicados dos últimos sete dias, posteriores ao início da amizade. Se o banco não registra essa data, usa a primeira observação local e começa vazio, sem expor o histórico antigo.
- Steam consultada a cada 45 segundos no Início para até 20 amigos, com quatro consultas paralelas. Depende de perfil Steam visível, permissão do backend e cache da API; não é instantâneo ao abrir um jogo. Falhas não são apresentadas como “nenhum jogo”. Consultas ficam em uma fila separada da navegação.
- Feed com texto e até quatro arquivos: imagens JPG/PNG/WebP até 10 MB de entrada, vídeos MP4/WebM até 200 MB cada. Imagens são reduzidas e enviadas para moderação; vídeos usam TUS em blocos de 6 MiB para a quarentena e só entram no post após confirmação da revisão existente. Reprodução de vídeos aprovados dentro do app por URL assinada. Compatibilidade de codec depende do aparelho.
- Central de notificações inclui mensagens e demais tipos registrados pelo backend. Alertas Android opcionais a cada 20 segundos com app visível; ativar começa a partir daquele momento, evitando disparar todo o histórico. O lote consultado contém até 20 notificações recentes. Recebimento com app fechado necessita ativar a integração do servidor descrita em backend/android-push/README.md.
- Renovação automática da sessão quando existe refresh token, sem restaurar uma conta que saiu. Sessões antigas sem refresh token precisam de um novo login.

Mantidos: bibliotecas em grade, recomendações diárias paginadas, chat com respostas e reações, coleção de figurinhas da conta, perfil com XP/conquistas e resgate das missões já preparadas pelo site. Grupos e preparação automática de missões ainda não foram implementados no app.

## Instalação

Pacote: `dev.gamersclt.batcaverna.nativeapp.preview`, nome **BatCaverna dos CLTs**, versão 0.29.0, código 29. Mesma chave debug da 0.20, permitindo atualizar essa prévia sem desinstalar. A assinatura mais antiga do aplicativo anterior não estava no projeto recuperado; por isso esta prévia continua separada dele. Alterações na conta e conteúdo sincronizado afetam os mesmos dados do site.

A chave de desenvolvimento da prévia foi guardada separadamente em BatCaverna-Native-Preview-Debug.keystore. Usa credenciais padrão de desenvolvimento e não é uma chave de produção. Não está neste ZIP; restaure a mesma chave debug antes de reconstruir atualizações compatíveis.

## Compilar

JDK 17 completo, Android SDK 36 e Build Tools 35.0.0. Defina JAVA_HOME e ANDROID_HOME.

    ./gradlew :app:assembleDebug :app:lintDebug

O `app/google-services.json` enviado está integrado para a prévia. O usuário configurou o envio pelo servidor e confirmou recebimento; o guia está em backend/android-push/README.md. Nenhuma chave administrativa ou conta de serviço é incluída no APK. A API usa a configuração pública do Worker e valida o projeto Supabase esperado.

## Validação

204 verificações Java passaram (inclui validação de login/cadastro): entrada de jogos/mídia/perfil, edição, limites numéricos, categorias, contagens, horários, curva de XP, política de capas, sincronização e limite temporal de atividades. Compilação e lint Android sem erros. A função de push passou na checagem estrita TypeScript; não foi executada nem publicada com credenciais reais.

Não houve teste visual em emulador/aparelho ou uso de conta real nesta sessão. Compilação não comprova integrações com Supabase, Steam ou moderação. Antes de marcar como estável, testar:

1. Atualizar a prévia 0.20 ou 0.21, entrar, alternar abas, usar voltar e teclado.
2. Buscar jogo com capa, adicionar, abrir detalhes, editar cada campo e reabrir; verificar preço/anotações apenas na própria conta.
3. Editar perfil, foto/zoom, capa/posição, fundo, título e destaques; verificar no site e em outro dispositivo.
4. Duas contas amigas: entrar/sair do app, observar presença e novas atividades sem histórico anterior à amizade; abrir um jogo Steam com presença pública e aguardar atualização.
5. Publicar imagem permitida e vídeo MP4/WebM, confirmar moderação, reabrir feed e reproduzir. Rejeições não devem virar publicações.
6. Receber mensagens e outra atividade, ativar/desativar alertas Android. Para testar com app fechado, primeiro concluir a configuração Firebase/servidor no guia de push.
7. Alterar senha/e-mail, confirmar pelos canais configurados e renovar uma sessão; conferir chat, reações e figurinhas existentes.

A integração de push preparada é opcional e requer revisão/aplicação da tabela nova, publicação da Edge Function e webhook. Não foi aplicada automaticamente, não inclui segredos e não oferece fila persistente de repetição de entrega.

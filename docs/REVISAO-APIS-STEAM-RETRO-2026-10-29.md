# Revisão técnica — Steam e RetroAchievements

Data: 29/10/2026. Código analisado: `7436bffdbc6c25493800ecb59fc738c7933ba85b`.

Referências: respostas de RAAdmin e Steam Support fornecidas pelo responsável nesta conversa; [termos da Steam Web API](https://steamcommunity.com/dev/apiterms), consultados nesta revisão.

Escopo: código do backend Supabase, desktop, Android, referências do iOS, caches e aviso de privacidade. Os testes usam provedores simulados. Não houve alteração das funções publicadas, dos aplicativos ou dos dados de usuários. As configurações efetivas de regiões, backups, limites do provedor e consumo em produção não foram verificadas.

## Resultado

A integração RetroAchievements analisada usa endpoints de metadados e progresso e transforma as respostas em campos de apresentação. Não foi identificado consumo de endpoints de patches/lógica de emulação ou persistência dessa lógica nos caminhos analisados.

A integração Steam de biblioteca, presença e conquistas usa a Web API oficial. Entretanto, jogos grátis usam scraping da loja, há consultas separadas à API JSON da loja e o controle de consumo ainda precisa de ajustes. As respostas do suporte não permitem concluir que toda a implementação esteja abrangida pela autorização da Web API.

## Achados e prioridades

### 1. Alta — scraping da loja Steam na descoberta de ofertas

- `supabase/functions/bright-api/index.ts:285`: baixa resultados de busca e extrai `data-ds-appid` do HTML. Depois consulta até 60 jogos por execução para verificar preço/desconto.
- `supabase/functions/native-api/routes.js:50`: interpreta elementos `search_result_row` e outros atributos HTML.
- `supabase/functions/native-api/routes.js:70`: consulta `/search/results/`, recebe `results_html` e passa o HTML ao interpretador.
- A segunda rota é acessível via `native-api/router.js:18`; o Worker público de apresentação não executa essas integrações.

A Steam declarou que scraping de metadados da loja não é coberto pelos termos da Web API e pode ser bloqueado quando prejudicial. Isso não prova que houve bloqueio ou violação no uso atual; impede tratar esse caminho como autorizado pela resposta recebida.

Ação: substituir a descoberta por um feed cuja licença/condições permitam esse uso ou obter confirmação específica da Valve. Preservar os links de resgate e a identificação da Steam. Evitar uma verificação individual de dezenas de páginas por atualização de cada cliente.

### 2. Alta — orçamento global da chave Steam não demonstrado

- `supabase/patch-1.39.3-bright-api.sql:20`: o contador é por usuário, com limites por minuto e por dia; não há contador global do provedor/chave nessa função.
- `bright-api/index.ts:173`: a mesma chave do servidor atende às chamadas Web API.
- `desktop/src/redesign.js:144`: presença consulta a Steam a cada 15 segundos, enquanto a conta está ativa e visível.
- `desktop/src/cavern-shell.js:268`: sincronização pode fazer uma chamada de biblioteca e até cinco consultas de conquistas a cada minuto, além da presença e das consultas de amigos.

Os termos consultados indicam 100.000 chamadas à Steam Web API por dia. O limite por usuário protege o aplicativo, mas não garante o teto total da chave quando há várias contas. Requisições à loja são um consumo separado e não devem ser confundidas com essa cota da Web API.

Ação: orçamento global persistente para Steam Web API, contabilizando tentativas reais; cache de esquemas públicos de conquistas; coalescência de consultas idênticas; frequência adaptativa para presença e sincronização. Não aumentar automaticamente a frequência quando o número de usuários crescer.

### 3. Média — tratamento de 429 ignora o tempo informado pelo provedor

- `bright-api/index.ts:170`: repete HTTP 429 ou 5xx após 400 ms. Ao esgotar tentativas, converte a falha em 502.
- O comportamento vale para Steam e RetroAchievements por usarem o mesmo auxiliar.
- `desktop/src-tauri/src/main.rs:672`: a consulta de catálogos também repete 429 após 400 ms.

O cliente recebe 502 e não consegue distinguir adequadamente indisponibilidade de limitação. O `Retry-After: 60` do backend protege os limites próprios, mas não resolve a perda do prazo enviado pelo provedor.

Ação: respeitar `Retry-After` quando presente, aplicar espera progressiva com variação aleatória quando ausente e manter um período de pausa compartilhado por provedor. Para prazos maiores que o tempo de uma requisição, retornar a limitação ao cliente em vez de manter a função esperando. Não substituir a última resposta válida por um resultado vazio de erro.

### 4. Média — cache de ofertas não é efetivado pelo caminho nativo atual

- `native-api/routes.js:66` depende de `caches.default`.
- A gravação em cache também exige `ctx` (`routes.js:72`).
- `native-api/router.js:18` chama `steamFree(local)` sem fornecer esse contexto.
- Não há, nessa rota, um cache persistente alternativo para o runtime Supabase. Um cabeçalho `Cache-Control` sozinho não comprova a deduplicação das buscas no servidor.
- `AccountRepository.java:112`: Android pede `gratis` ao bright-api, aproveita apenas Epic/comunidade e depois consulta `/api/steam-free`. Entretanto, `gratis` já executa a busca Steam (`bright-api/index.ts:474`). Há trabalho Steam redundante descartado pelo Android.

Ação: uma fonte compartilhada de ofertas com prazo de atualização e proteção contra consultas simultâneas. Separar as lojas solicitadas ou reutilizar o resultado Steam já carregado, sem iniciar uma segunda descoberta.

### 5. Média — consultas à API JSON da loja merecem avaliação separada

- Backend: `/api/appdetails`, `/api/storesearch` e `/api/featuredcategories` em `bright-api/index.ts:213`, `:244` e `:278`.
- Desktop: `desktop/src-tauri/src/v06.rs:26` e `:137` consultam a loja diretamente; a busca pode abrir até seis consultas em paralelo, a partir de três variantes do nome e dois idiomas.
- Capas no backend: `native-api/routes.js:82` consulta `appdetails`.

Esses endpoints JSON não são o parsing de HTML identificado no achado 1. Entretanto, estar em `/api/` na loja não demonstra cobertura pelos termos de `api.steampowered.com`.

Ação: inventariar quais recursos dependem deles (busca, descrição, preço, vídeos e imagens), usar fontes com condições confirmadas quando apropriado e solicitar esclarecimento específico à Valve para o que permanecer. Evitar remover a Web API de biblioteca/conquistas, que é outra integração.

### 6. Média — documentação de armazenamento ainda incompleta

- `public/privacidade.html:5` declara o projeto principal em São Paulo, Brasil, mas informa que o inventário de países, transferências e retenção dos demais fornecedores está em conclusão.
- Os termos Steam pedem informar os dados armazenados e os países de armazenamento de Steam Data.
- O aviso já menciona identificadores, horas e conquistas, mas o inventário precisa incluir a retenção de desbloqueios locais, cópias de recuperação e a diferença entre desconectar uma integração e apagar o histórico salvo.

Ação: confirmar as regiões efetivas de banco, backups e demais destinos que armazenam Steam Data; documentar os campos, retenção e exclusão. Não inventar países a partir do endereço comercial de um fornecedor. A região declarada no aviso não foi conferida na infraestrutura nesta revisão.

## RetroAchievements — pontos verificados

- Endpoints usados pelo backend: `API_GetGameList`, `API_GetUserProfile`, `API_GetUserCompletionProgress`, `API_GetUserRecentlyPlayedGames` e `API_GetGameInfoAndUserProgress`.
- `bright-api/index.ts:469` monta uma lista explícita de campos: ID, nome, descrição, pontos, desbloqueio, hardcore, data e ícone. Não repassa o objeto completo de conquistas ao cliente.
- O cache de busca `raSystemCache` guarda listas de jogos por sistema durante 24 horas na instância; a consulta usa `h:0`, e não é uma busca de patches para emuladores.
- O desktop mantém respostas de perfil, jogos e conquistas em memória por dois minutos, separadas pela conta do BatCaverna (`desktop/src/app.js:8` e `:25`).
- A coleção persistida guarda capa, IDs e estados de acompanhamento conforme suas tabelas e operações; não foi encontrado armazenamento de lógica de conquistas nesse caminho.
- A chave RA permanece no servidor. A autenticação e o limitador são executados antes do provedor.
- O cache de busca é por instância, sem coordenação entre instâncias. Uma busca sem console pode consultar até 24 sistemas, com quatro trabalhadores. Acrescentar cache compartilhado/coalescência ajudaria a respeitar o limite dinâmico descrito por RAAdmin.

Esses pontos são compatíveis tecnicamente com a condição destacada por RAAdmin no escopo analisado. Não representam uma conclusão sobre direitos de todas as imagens, monetização ou uma aprovação de recursos que não tenham sido descritos à equipe.

## Steam — pontos que já estão bem encaminhados

- Biblioteca, presença, esquemas de conquistas e progresso oficial usam `api.steampowered.com`.
- A chave Web API fica no backend e não é enviada ao aplicativo.
- A sincronização usa o usuário autenticado e o App ID salvo, evitando atualizar a biblioteca de outra conta.
- Falta de acesso ao progresso oficial é tratada como indisponibilidade; a sincronização preserva a porcentagem já salva em vez de zerá-la (`bright-api/index.ts:403` e `:416`).
- O progresso salvo pelo desktop é identificado como local; as respostas dos suportes não comprovam autorização específica ou reconhecimento oficial de desbloqueios obtidos via Cloud Redirect.

## Validação executada

- `node tests/bright-api-security.mjs`: passou; autenticação, isolamento de usuário, sigilo de chaves e preservação de progresso indisponível.
- `node tests/native-api.mjs`: passou; autenticação, limites próprios e demais verificações do roteador.
- Experimento adicional com o handler real e provedores simulados: a resposta RA foi alimentada com campos `MemAddr` e `Trigger` contendo um marcador. Nenhum deles apareceu na resposta normalizada ao cliente; os metadados esperados permaneceram.
- Busca de referências no código não identificou consumo de endpoints de patches/lógica RA nos caminhos analisados.

Esses testes não medem a cota global em produção, não confirmam autorização de uso de endpoints da loja e não verificam cópias antigas do banco.

## Ordem recomendada para os ajustes

1. Tratar 429 corretamente e adicionar orçamento global/cache compartilhado por provedor.
2. Eliminar a descoberta Steam por parsing de HTML, escolhendo uma fonte com condições confirmadas ou obtendo confirmação específica.
3. Remover o trabalho duplicado de ofertas no Android e centralizar a atualização das ofertas.
4. Revisar os endpoints JSON da loja e a frequência das consultas de presença.
5. Concluir o inventário de armazenamento/retenção e atualizar o aviso público com informações verificadas.
6. Manter uma lista explícita de campos permitidos para os dados RA e testes que rejeitem lógica de emulação nas respostas e nos caches.

# Controles de Steam e RetroAchievements

Implementação baseada na revisão de 29/10/2026. As respostas dos suportes são condicionais; este documento não representa aprovação de todos os endpoints, imagens ou usos comerciais.

## Implantação

Aplicar primeiro `20261029130000_provider_budgets_cache.sql`; depois publicar `bright-api` e `native-api`. O workflow manual **Provider API controls**, na branch `main`, executa essa sequência usando as credenciais já configuradas. Não executar todas as migrações históricas como atalho.

A variável GitHub `STEAM_STORE_METADATA_ENABLED=false` pausa as consultas JSON de metadados da loja no backend. O workflow publica o valor como configuração da função; o padrão de compatibilidade é `true`. Essa escolha não muda biblioteca, presença e conquistas da Web API oficial. A confirmação da Valve sobre `appdetails` e `storesearch` continua pendente. A nova versão desktop encaminha essas consultas pelo backend; versões desktop antigas ainda precisam ser atualizadas para usar o controle central.

## Contagem, pausa e cache

- Cada tentativa externa à Steam Web API, inclusive repetições de 5xx, reserva uma chamada na mesma linha global do banco. O teto da aplicação é de 90.000/dia UTC, abaixo das 100.000 chamadas/dia previstas nos termos consultados. Outras aplicações que reutilizem a chave não entram neste contador: preferir uma chave exclusiva para este backend.
- RetroAchievements usa um orçamento conservador compartilhado de 120 tentativas/minuto e 30.000/dia. Esses números são controles próprios, não um limite prometido pelo RetroAchievements, que informou ter limite dinâmico.
- Metadados da loja têm orçamento separado de 60 tentativas/minuto. Cachear uma resposta não consome nova tentativa externa.
- HTTP 429 não é repetido imediatamente. `Retry-After` aceita segundos ou data HTTP; se ausente/inválido, a pausa é de 60 segundos. O prazo é guardado por provedor e bloqueia outras instâncias. A resposta 429 inclui o prazo de espera. Falhas 5xx/rede têm no máximo duas tentativas, com uma pequena espera variável.
- O cache persistente e sua concessão de atualização são compartilhados entre instâncias. Os dados persistidos são públicos: esquema normalizado de conquistas Steam, listas normalizadas de jogos RA, metadados públicos da loja e ofertas. A tabela não aceita acesso por usuários comuns.
- Os dados de contas permanecem apenas no cache de memória isolado pela conta, com validade de 30 a 120 segundos. Operações de alteração, como sincronização e gravação da coleção, não usam cache de resultado.
- A lista de campos RA é aplicada antes do cache normalizado. Nunca armazenar patches, `MemAddr`, `Trigger` ou objetos brutos de lógica de emulação.

## Ofertas e clientes

O parsing de HTML da loja foi removido dos dois caminhos backend. A descoberta Steam mantém apenas a consulta JSON limitada e compartilhada de ofertas destacadas enquanto essa consulta estiver habilitada. Ela não garante cobrir todas as promoções da Steam.

A rota nativa antiga de ofertas consulta o mesmo serviço; não inicia um segundo rastreamento. O novo Android consome diretamente o resultado único de `gratis`; o novo desktop remove a consulta de fallback redundante. Erro de provedor não é persistido como catálogo vazio. As consultas de presença Steam do desktop são espaçadas por pelo menos 60 segundos; a detecção local continua funcionando com sua própria frequência.

## Dados e pendências verificáveis

O workflow de backup de 28/10/2026 (`40691114301`) concluiu exportação, criptografia, envio ao Google Drive e conferência do download criptografado. Isso comprova o destino lógico e a criptografia do arquivo, não o país físico de armazenamento do Drive. O responsável informou não saber confirmar essa localização. Não inserir um país presumido no aviso.

O deploy tenta consultar apenas a região do projeto Supabase na API de gerenciamento e imprime apenas a região, sem credenciais ou payload administrativo. A localização de backups, execução e retenção dos demais fornecedores continua exigindo inventário próprio.

## Testes

`node --test tests/provider-requests.mjs` verifica 429, prazo HTTP, orçamento por tentativa, cache entre instâncias e isolamento dos dados em memória.

`tests/provider-budgets-db.mjs` executa SQL real em PGlite, aplica a migração duas vezes e verifica teto diário, teto por minuto, pausa compartilhada, concessões de cache, expiração e negação a `anon`/`authenticated`. O workflow instala a dependência de teste em `/tmp`.

Os testes do handler verificam descarte de campos de lógica RA, pausas de metadados sem interromper a biblioteca Steam oficial e formatos públicos usados pelos clientes.

# Windows 0.17.49

## Indicações

A área de indicações tem busca por título ou pessoa, filtro por categoria, contador de resultados e cards com identificação da categoria. O envio usa duas colunas, seleção pesquisável da biblioteca, prévia da capa, destinatário e contador de mensagem. Mantém aceitar na biblioteca, guardar em lista e dispensar.

## Associação de executáveis

Configurações > Aplicativo > Jogos abertos no PC mostra opções de presença e registro de tempo, busca das associações e remoção. O diálogo tem busca de jogos, busca de executáveis abertos, atualização de processos e confirmação da seleção. Salvar substitui vínculos anteriores do mesmo jogo ou executável, evitando associações concorrentes. O processo continua sendo selecionado localmente e não exige envio de caminhos ao servidor.

## Horas

Valores numéricos são formatados com separadores pt-BR e no máximo uma casa decimal no perfil, início, cards e detalhes. A soma ignora valores negativos ou não finitos e permanece numérica, sem somar valores de filmes/séries/animes. A entrada manual aceita valores fracionários sincronizados sem a incompatibilidade anterior com step=0.1.

A consulta agregada de diagnóstico no banco não encontrou títulos com mais de 100 mil horas; o total muito detalhado da captura foi tratado como problema de apresentação. Nenhum histórico de horas foi apagado ou reescrito. O mecanismo de sincronização Steam e o registro idempotente de jogos locais permanecem inalterados.

## Verificação

Teste numérico de soma e localização; testes de interface para busca/categorias das indicações e seleção/busca/remoção de associações. Build e verificação de integridade dos módulos desktop. CI Windows executa também testes Rust e inicialização real do Tauri.

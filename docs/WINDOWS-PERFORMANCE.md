# Desempenho do Windows

A versão 2.1.20 mantém leituras recentes em memória para a navegação, prepara coleções após a primeira tela e antecipa leituras quando o usuário aponta ou foca na navegação. O pré-carregamento executa uma tarefa de fundo por vez e para quando o aplicativo fica oculto ou a sessão termina. A navegação principal continua independente dessa fila.

O cache guarda snapshots JSON, sem compartilhar objetos mutáveis com os componentes: biblioteca por 30 segundos; resumo, estatísticas e perfil próprio por 15 segundos. Há um teto de 16 entradas e aproximadamente 6 MiB de JSON em UTF-16. Respostas maiores não ficam retidas. Nenhum snapshot é persistido em disco. Conversas, presença e perfis de outras pessoas continuam com leituras próprias.

Edições invalidam os snapshots antes e depois da chamada nativa. Reativar a aba atual ou atualizar diretamente o renderer lê novamente o servidor. Retornar ao aplicativo ou recuperar a conexão também invalida os snapshots. A troca de sessão descarta respostas atrasadas, inclusive quando a mesma conta entra novamente. Uma atualização explícita em andamento não bloqueia o uso de um snapshot que ainda esteja dentro do prazo.

As notificações mostram a leitura recente da própria conta enquanto buscam os dados atuais; resultados idênticos não reconstroem o menu. A abertura não fica dependente dessa consulta. O fechamento e a troca de conta continuam impedindo que uma resposta atrasada reapareça na tela.

A inicialização prepara os arquivos estáticos em paralelo, preservando a ordem de execução dos módulos. O diagnóstico de módulos é agrupado; a etapa exata de falha e os marcadores de inicialização são mantidos. A transição centralizada continua responsável pelas animações das abas; o observador e o efeito de clique antigos foram removidos.

O resumo nativo mantém as mesmas consultas e filtros por usuário, dividindo oito leituras em dois grupos de no máximo quatro requisições simultâneas. A paginação usa o total exato retornado em `Content-Range`; sem esse total, mantém a leitura até uma página vazia. Limites de página menores impostos pelo servidor continuam sendo respeitados sem truncar a coleção.

## Verificação reproduzível

O benchmark usa o frontend compilado, dados sintéticos e 250 ms de atraso por leitura da ponte nativa. Ele não mede a conexão ou o hardware do usuário e não simula o ganho das consultas Rust em paralelo.

```sh
cd desktop
BAT_NAV_PERF_BENCHMARK=/tmp/navigation.json npm run test:ui
BAT_PERFORMANCE_ONLY=1 npm run test:ui
node scripts/screen-cache.test.mjs
```

Nos primeiros ensaios locais, a volta à biblioteca passou de cerca de 286 ms para 65 ms, sem nova consulta da coleção. Reabrir notificações passou de cerca de 279 ms para 39 ms. São medições de um cenário controlado, sujeitas à carga do processo; as leituras frias continuam dependendo da rede. O relatório JSON registra separadamente cada rota, suas consultas e os tempos de menus.

A suíte inclui compartilhamento de leituras, invalidação após edição, atualização explícita, descarte ao sair/trocar de conta e limites de memória. O teste nativo cobre paginação com limite imposto pelo servidor, total conhecido e total desconhecido. A validação completa e a abertura real do cliente Windows continuam obrigatórias na publicação.

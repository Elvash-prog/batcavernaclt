# BatCaverna 1.2.0

## Ativação

1. Execute `supabase/patch-1.2.0-progresso-estatisticas.sql` inteiro no SQL Editor do Supabase. É uma migração adicional à 1.1.0; pode ser reexecutada sem apagar dados.
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

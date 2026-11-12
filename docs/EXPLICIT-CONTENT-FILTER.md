# Filtro opcional de conteúdo sexual explícito — 2.1.8

A classificação etária 18/AO/Z/R18, violência, nudez ou descritores genéricos de maturidade deixam de marcar um jogo como pornografia. O contrato classificado do IGDB sinaliza tema erótico e termos explícitos como pornografia, hentai e simulação sexual; títulos comuns como Lords of the Fallen permanecem visíveis. A verificação de produção encontrou zero itens com a marca anterior persistida, portanto não houve limpeza nem alteração de escolhas das bibliotecas.

Windows e Android oferecem “Mostrar conteúdo adulto” na busca de jogos, no seletor SteamGridDB e em Configurações > Aparência. Desativado por padrão, exclui resultados/opções sinalizados. Ativado, inclui essas opções e mostra suas imagens normalmente. A preferência é local, separada por conta e dispositivo. Não é verificação de idade ou autorização de acesso.

Capas comuns aparecem normalmente. A confirmação individual e os botões sobrepostos de mostrar/ocultar por capa foram removidos. Se um item já salvo tiver imagem explicitamente marcada e o filtro estiver desativado, só essa imagem usa um indicador compacto; as dimensões e o clique normal do card são preservados. Alterar o filtro atualiza as imagens existentes, e cada dispositivo tem sua própria escolha. Imagens próprias continuam podendo ser marcadas manualmente no editor; não há análise automática de pixels nem garantia de detectar mídia sem sinalização.

A capa selecionada continua fixa. Não mudamos a URL salva ao aplicar o filtro, a autenticação, mídia privada, permissões, RLS, esquema ou assinatura. A API native-api v35 altera somente igdb.js; bright-api v60 permanece igual. O contrato antigo continua compatível, e filmes/animes não recebem ampliação de busca.

Testes usam apenas nomes e imagens sintéticos: capa comum com classificação 18, opção explícita filtrada/incluída, preferência persistida e isolada por conta, teclado e clique normal do card, primeira renderização e invalidação de imagens em andamento. Notas de versão presentes para Windows e Android 2.1.8 (code 117).

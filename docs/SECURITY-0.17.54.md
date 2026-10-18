# Revisão de segurança — 18/10/2026

## Correções

- `buscar_usuarios_clt(text)` agora usa `SECURITY INVOKER`, `search_path` vazio e o diretório público protegido por RLS. A busca antiga executava com privilégios elevados sobre `perfis` e não respeitava os bloqueios da comunidade.
- O parâmetro é comparado como texto literal. `%`, aspas, comentários SQL e delimitadores de filtros não são instruções ou curingas.
- O desktop usa somente a RPC parametrizada na busca de pessoas, sem alternativa que monte filtros com texto fornecido pelo usuário.
- O menu padrão do WebView e os atalhos de salvar, imprimir, recarregar e abrir DevTools foram desativados; copiar, colar e editar permanecem disponíveis. DevTools só fica habilitado em builds de desenvolvimento. Isso é comportamento da interface, não uma barreira de autorização.

## Verificação

- Banco em produção: nenhuma tabela regular em `public` sem RLS; a RPC alterada não é `SECURITY DEFINER` nem executável por `anon`.
- Testes em transação com rollback: tentativas com SQL, delimitadores de filtros e curingas não retornaram resultados.
- CI em PostgreSQL isolado: busca legítima continua funcionando; bloqueios são respeitados; testes repetidos depois de `pg_dump`/`pg_restore`.
- 54 testes do desktop, teste do menu/atalhos e build de produção da interface aprovados localmente. Pipelines validam também compilação e abertura real do Windows.
- A única função de aplicação com `EXECUTE` dinâmico encontrada na revisão do banco foi `clt_private.limit_social_write()`: valores usam `USING` e identificadores usam `%I`. O nome da tabela vem do contexto do trigger.

## Limites

Esta revisão cobre os caminhos examinados e não equivale a um pentest completo ou garantia de ausência de falhas. Não foram executados ataques destrutivos, testes de carga ou tentativas de acessar contas reais de terceiros. A proteção deve continuar no servidor, mesmo se alguém modificar o cliente instalado.

O primeiro backup real e seu teste de recuperação em ambiente separado continuam pendentes; consulte `RECOVERY.md`. Os diagnósticos do Supabase ainda exigem acompanhamento, incluindo proteção de senhas vazadas, funções privilegiadas legítimas e a extensão `pg_net`. Não foram enfraquecidas permissões para eliminar alertas.

## Rastreabilidade

- Código da versão: `29aeaf376b383932ae069c9efcc4dfa1cbcdb70a`.
- Migração aplicada: `20261018222011_harden_people_search.sql`.
- Segurança/recuperação: execução GitHub Actions `39172046650` aprovada.
- Interface e APIs: execução `39172046699` aprovada.
- Instalador e abertura real do Windows: execução `39172046609` aprovada; publicação assinada: `39172112984`.

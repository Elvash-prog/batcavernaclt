# Verificação de segredos

O workflow `Secret security` verifica os commits novos de cada pull request com Gitleaks 8.30.1. O binário tem SHA-256 verificado, usa as regras padrão e ignora comentários `gitleaks:allow`. O job tem apenas leitura do repositório, não recebe segredos da aplicação e não executa scripts do projeto. Os valores encontrados são ocultados integralmente nos logs.

A execução manual examina todo o histórico disponível no checkout. Ela pode falhar por achados antigos e configurações públicas que exigem avaliação humana. Não foi criada uma exceção global para ocultar esses resultados. A verificação automática de PR não afirma que o histórico inteiro esteja livre de segredos.

No GitHub, configure `Settings → Rules → Rulesets` para exigir o check `Secret security / scan` na branch principal. A existência do workflow por si só não impede um merge manual. Mudanças no próprio workflow também precisam de revisão.

## Chaves antigas já identificadas

No commit `5b3339714ea147a734feacab31ccaeb32c228551`, `public/index.html` contém `RAWG_KEY` na linha 2079 e `TMDB_KEY` na linha 2080. Os valores não devem ser copiados para issues ou mensagens. Não foi verificado se permanecem ativos.

1. Revogue a chave antiga RAWG no provedor, pois a integração foi removida.
2. Revogue ou substitua a chave antiga TMDB no provedor. Se o backend ainda usar essa chave, atualize o segredo correspondente em Supabase → Edge Functions → Secrets e valide a busca de filmes e séries.
3. Confirme a revogação com os provedores. Remover o valor do código atual ou reescrever o Git não revoga uma credencial.

Chaves públicas Firebase, Supabase publishable e identificadores de versão VAPID não equivalem a credenciais administrativas. As restrições de uso das chaves Firebase precisam ser conferidas no Google Cloud Console. Nenhuma chave foi rotacionada ou testada contra os provedores nesta alteração.

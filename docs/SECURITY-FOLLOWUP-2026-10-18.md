# Correções complementares de segurança — 18/10/2026

## Implementado e verificado

A PR 57 acrescenta proteção contra abuso do login por usuário, auditoria das dependências resolvidas e correções das bibliotecas encontradas. Complementa `PENTEST-2026-10-18.md`; não constitui certificação nem pentest independente completo.

### Login

A migração `20261018233809_login_rate_limits.sql` está aplicada. A função `login-username` versão 11 está ativa e consulta um contador privado antes da busca de e-mail ou autenticação. Contadores por minuto: 10 por combinação conta/origem, 30 por conta, 60 por origem e 300 no total. O limite global é incrementado primeiro para limitar a criação de chaves por solicitações abusivas. Operações atômicas no PostgreSQL impedem ultrapassagem por concorrência. Falha na infraestrutura do limitador retorna 503; excesso retorna 429 com `Retry-After: 60`.

Chaves HMAC-SHA256 não guardam usuário/IP/senha em texto; permanecem pseudônimos, não dados anônimos. O endereço do proxy é sinal complementar, pode ser falsificado e não substitui os limites por conta e global. Janelas anteriores a dez minutos são removidas em novas tentativas; períodos sem atividade podem mantê-las até a próxima limpeza. A política pública explica essa retenção. Somente `service_role` pode acessar os contadores e a RPC.

Teste SQL dentro de transação desfeita: limites de combinação, conta, origem e total; janela renovada; bloqueio dos papéis comuns. Teste HTTP em produção em 18/10/2026, 23:46:01–23:46:08 UTC, com um único usuário fictício inexistente: dez respostas 401 e duas 429 com espera de 60 segundos. Nenhuma conta real nem envio de e-mail foi usado. Tentativas anteriores cruzaram a mudança de minuto e não foram consideradas prova de bloqueio.

Limites fixos permitem rajadas junto à mudança de minuto. Abuso pode causar indisponibilidade temporária por conta ou global; não há bloqueio permanente. A proteção cobre este endpoint de login por usuário. A autenticação direta por e-mail continua sujeita às proteções do Supabase Auth, e não a esta RPC. CAPTCHA e proteção distribuída adicional não foram implementados.

### Dependências

O CI resolve e consulta o OSV para versões exatas de Cargo, npm, Deno e Maven. Falhas de rede, resultados incompletos ou dependências não resolvidas falham a verificação. Avisos ativos não são ignorados por uma lista geral de exceções. O relatório JSON e os grafos usados ficam nos artefatos do workflow.

A consulta inicial encontrou avisos em dependências indiretas do build Android e em componentes Rust. As bibliotecas do build foram corrigidas mantendo AGP 8.9.1 e os componentes que entram no APK. Correções: JDOM 2.0.6.1, jose4j 0.9.6, Commons Compress 1.28.0, protobuf-java 3.25.8, Netty 4.1.139.Final e Bouncy Castle 1.85. A resolução e a compilação precisam permanecer aprovadas no CI para aceitar essas substituições.

No Windows 0.17.55, o plugin atualizador 2.14.0 é usado sem a feature ZIP. O projeto distribui EXE NSIS assinado e preserva TLS, proxy e verificação de assinatura; não precisa extrair arquivos ZIP. A alteração remove a biblioteca `zip` e o caminho vulnerável de extração, em vez de ocultar seus avisos.

O grafo Rust auditado é o alcançável para `x86_64-pc-windows-msvc`, obtido por `cargo metadata --locked --filter-platform`. Componentes exclusivos de Linux presentes no lockfile não entram no produto Windows e não estão cobertos como distribuição Linux. Não publicar versões Linux/macOS sem auditoria dos respectivos grafos. O teste do scanner verifica que dependências inalcançáveis não entram no inventário de Windows.

As declarações npm do desktop foram fixadas nas versões já presentes no lockfile. O SDK Supabase do `send-push` foi fixado em 2.118.0, com árvore Deno e integridades versionadas. A função publicada versão 21 aceitou esse pacote; a checagem de segredo permanece obrigatória.

Resultado do CI `39177825314`, fonte `bf1d2cec1a493bdde10969304813b9c718d1b026`: consulta completa de 623 versões distintas (321 crates, 191 Maven e 111 npm, incluindo a árvore Deno), sem avisos ativos encontrados. Esse resultado é limitado ao inventário e à base de avisos consultada naquele momento; não prova ausência de vulnerabilidades desconhecidas. O CI seguinte também exige o Cargo.lock gerado e Deno.lock congelados.

## O que continua pendente

- Primeira cópia real criptografada do banco e Storage, destino privado, retenção e ensaio real de recuperação. A sessão não tem conexão administrativa autenticada do CLI nem chave administrativa do Storage. Os testes sintéticos já existentes não substituem esse ensaio. Seguir `RECOVERY.md`, fornecendo credenciais somente no terminal oficial local.
- Testes de segurança com duas contas dedicadas e testes físicos de APK/instalação/atualização. O teste funcional anterior em dois PCs foi informado como aprovado, mas não substitui esses cenários.
- Leaked password protection continua desativada; não foi declarado resolvido nem feito upgrade pago. Permissões/licenças comerciais de APIs dependem das respostas dos fornecedores.
- O Windows 0.17.55 foi publicado e verificado. Nenhum APK novo é exigido pelas alterações de backend e das ferramentas de build; o APK publicado continua 1.7.17.

## Evidências e operação

PR: https://github.com/Elvash-prog/batcavernaclt/pull/57

Auditoria: https://github.com/Elvash-prog/batcavernaclt/actions/runs/39177825314

Executar localmente: `python -m unittest discover -s tools/security`, `node tests/login-rate.mjs`, `node tests/edge-pentest.mjs`. Os 18 testes isolados Edge não enviam notificações reais. O workflow de segurança/recuperação executa o teste SQL com dados sintéticos e rollback.

## Fechamento da publicação — 19/10/2026 UTC

Fonte imutável da versão Windows 0.17.55: `170f8256be8733e2e28692ec4bde87913fe10971`. PR 57 incorporada como `7925bb06a017dbd55e704fe7a439071dccac995e`.

Todas as verificações do código final passaram: Windows com 25 testes Rust e abertura real do Tauri (`39178012559`), Android (`39178012521`), interface/APIs (`39178012548`), segurança/recuperação sintética (`39178012590`) e auditoria de dependências congeladas (`39178012480`). A consulta local independente usando os mesmos grafos também retornou 623 versões e nenhum aviso ativo.

Publicação assinada concluída: https://github.com/Elvash-prog/batcavernaclt/actions/runs/39178119794

Release: https://github.com/Elvash-prog/batcavernaclt/releases/tag/desktop-v0.17.55

O instalador, a assinatura e `latest.json` foram baixados da release publicada. Foram conferidos o destino/versão do manifesto, a igualdade da assinatura no manifesto e arquivo `.sig`, o identificador da chave, a assinatura Ed25519/BLAKE2b-512 do EXE e a assinatura do comentário que vincula a versão 0.17.55. Uma alteração sintética dos bytes foi rejeitada. O endpoint GitHub `releases/latest` aponta para essa versão.

- Instalador: 5.605.912 bytes.
- SHA-256: `a02731fbca73e644eb80afe865b5f4abd7cf66970205d3592803f56ff77dc80f`.
- Nenhuma chave privada foi usada nessa verificação; somente a chave pública já distribuída no cliente.

O deploy Cloudflare do merge 7925bb06 foi confirmado pelo check `Workers Builds: batcavernaclt`, aprovado. A leitura HTTP automatizada da página neste ambiente recebeu 403; portanto, não se declara inspeção visual da página publicada nesta etapa. A alteração do rótulo de download para 0.17.55 é feita somente depois de confirmar a release.

A assinatura confirma integridade/proveniência relativa à chave configurada; não é uma garantia geral de segurança do programa nem assinatura Authenticode de editor Windows.

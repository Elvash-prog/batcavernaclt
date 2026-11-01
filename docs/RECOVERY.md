# Recuperação no plano gratuito

O teste em dois computadores foi concluído com sucesso pelo responsável em 18/10/2026. Ele cobre layout e sessão no uso real informado, não substitui um teste de restauração do banco.

## Situação e limites

No Free, não presumir disponibilidade dos backups diários dos planos pagos. O procedimento abaixo faz uma exportação própria, somente de leitura, sem pausar o projeto e sem restaurar nada em produção. Acesso autenticado ao CLI e ao Storage precisa ser configurado pelo responsável. Nenhuma senha ou chave deve ser enviada em chat, issue, commit ou log.

`tools/operations/backup.py` exporta roles, esquema, dados, histórico de migrações, uma referência dos esquemas gerenciados auth/storage, as definições de origem de `supabase_functions` e os objetos do Storage. Faz inventário com hashes, criptografa com GnuPG (AES-256 no modo manual por senha) e pede uma verificação de descriptografia nesse modo. A cópia final é salva fora do repositório. O limite inicial de download de mídias é 256 MiB e uma exportação incompleta falha; ele pode ser ajustado explicitamente. O inventário conferido nesta revisão tinha 65 objetos, aproximadamente 63 MiB, mas o tamanho muda com o uso.

Arquivos SQL do banco não contêm os bytes das imagens e vídeos. Por isso o script também copia o Storage. Segredos das Edge Functions, SMTP, Firebase, chaves de assinatura dos clientes e a chave raiz de criptografia do Supabase Vault precisam de guarda separada e segura. As exportações do banco e das mídias não formam um snapshot atômico entre serviços. Planejar uma janela com pouca escrita e conferir os vínculos entre registros e objetos no ensaio. Não confundir esse pacote com um clone integral e automaticamente restaurável de toda a infraestrutura Supabase.

## Preparar no computador do responsável

Instalar Python 3, Docker Desktop, Supabase CLI e GnuPG/Gpg4win de fontes oficiais. O ensaio real e o workflow usam o CLI 2.122.0. O CLI e o Docker precisam funcionar no terminal antes de iniciar.

Dentro do repositório:

```text
supabase login
supabase link --project-ref luoqlhgfmixvfqbfcdoc
python tools/operations/backup.py --output CAMINHO_FORA_DO_REPOSITORIO/BatCaverna-AAAA-MM-DD.tar.gz.gpg
```

O login do CLI ocorre pelo mecanismo oficial. Se ele pedir a senha do banco, informe apenas no terminal oficial. O script pede a chave administrativa do Storage com entrada oculta; ela permanece no processo local e não é incluída no inventário. A alternativa `BATCAVERNA_BACKUP_SERVICE_KEY` é destinada a um ambiente seguro já configurado, não a um arquivo versionado. Não coloque credenciais em comandos de exemplo.

O GnuPG pede uma senha de criptografia: guarde-a em um gerenciador de senhas separado do arquivo. Sem ela, a cópia não poderá ser recuperada. O script pede também a descriptografia para conferir o pacote. Só considerar a execução concluída se a saída final informar `encrypted_backup`, `sha256`, `verified_files` e `storage_objects` sem erro. Falha de download, autenticação ou integridade impede essa confirmação.

As requisições administrativas ao Storage recusam redirecionamentos HTTP, inclusive para o mesmo host. Uma resposta de redirecionamento interrompe a exportação antes de reenviar os cabeçalhos administrativos. Não desative essa proteção para concluir um backup: confira a configuração do endpoint e a disponibilidade do serviço.

Manter a cópia criptografada fora do computador de trabalho em um destino privado escolhido pelo responsável. O script não transmite arquivos a nenhum destino de backup. Não programar execuções desassistidas antes de verificar credenciais, armazenamento, retenção e recuperação. Apagar cópias antigas de modo consistente com pedidos de exclusão; o prazo de retenção dessas cópias ainda precisa ser decidido pelo responsável e refletido no aviso público.

## Ensaio de recuperação

O workflow `Segurança e recuperação beta` usa PostgreSQL 17 em um contêiner isolado, dados sintéticos, exportação `pg_dump`, restauração em um segundo banco e repetição das verificações de permissões e bloqueios. O teste Python verifica criptografia/descriptografia e rejeição de arquivos corrompidos ou incompletos. Nenhum dado de usuário é exportado pelos testes.

A verificação do pacote também rejeita entradas duplicadas no manifesto, arquivos especiais no TAR, objetos repetidos no índice, dois objetos apontando para o mesmo arquivo, referências a SQL como mídia e arquivos de mídia ausentes do índice. Isso evita aceitar como completo um inventário internamente inconsistente. Hashes conferem integridade interna; não comprovam a origem de um pacote obtido de terceiros. Use o arquivo criptografado guardado no destino privado e confira seu hash registrado na exportação.

A regressão de hooks usa os filtros reais do CLI 2.122.0 e um PostgreSQL 17 descartável: a restauração antiga falha sem a função, e a nova restaura tabela, sequência, restrição, função, permissões e gatilho a partir dos SQLs exportados, sem SQL oficial complementar. O gatilho sintético não faz HTTP. Isso valida o mecanismo e as migrações cobertas pelas fixtures. O ensaio real de 24/10/2026 está registrado abaixo e tem escopo limitado. Não fazer ensaios em produção. Não criar um projeto ou uma branch com cobrança sem decisão do responsável.

Para uma recuperação real:

1. Registrar o incidente, identificar o último backup íntegro e preservar a produção para investigação. Desabilitar escritas, se necessário, por procedimento controlado.
2. Descriptografar em um diretório privado fora do repositório e verificar os hashes com `python tools/operations/backup.py --verify ARQUIVO_DESCRIPTOGRAFADO.tar.gz`.
3. Preparar um destino Supabase separado, compatível com PostgreSQL 17, extensões e serviços usados. Conferir previamente a configuração de Auth, SMTP, Storage, Realtime e Edge Functions.
4. Revisar `roles.sql` e preparar as extensões, `extensions`, Vault e a publicação `supabase_realtime` exigidos pelo destino antes de aplicar os SQLs. O CLI pode omitir a criação da publicação e de objetos gerenciados. Revisar `managed_schema.sql` para identificar as customizações próprias; não sobrescrever cegamente os esquemas gerenciados de uma instalação nova. Restaurar o histórico de migrações separadamente.
5. Nos novos pacotes (manifesto formato 2), `functions_schema.sql` contém as definições exportadas da origem de `supabase_functions`, incluindo `hooks`, sua sequência e `http_request()`. Aplicar as definições necessárias antes dos gatilhos que as referenciam em `schema.sql`. Em destino Supabase que já tenha esses objetos, comparar as definições e revisar conflitos, em vez de recriar tabelas ou restrições cegamente. Não reconstruir a função de memória nem baixar SQL externo para completar um pacote novo.
6. Para a restauração de banco vazio, separar com um parser SQL os gatilhos, políticas e chaves estrangeiras de `schema.sql`, `managed_schema.sql` e `functions_schema.sql`: aplicar primeiro as definições, depois `data.sql`, e só então os objetos separados. Manter a ordem das demais definições e executar com `ON_ERROR_STOP` e transação, sem dividir SQL por ponto e vírgula. Conferir todas as contagens e validar cada FK; não basta desabilitar gatilhos e presumir integridade. O ensaio real usou `sqlparse` para essa separação. Esse procedimento precisa ser adaptado às dependências e objetos já existentes no destino.
7. Se houver Vault ou colunas cifradas, seguir a instrução oficial de preservação da chave raiz antes de pausar ou excluir o projeto de origem. Não colocar essa chave no pacote compartilhado.
8. Recriar buckets com as configurações do inventário e reenviar os objetos para os nomes originais constantes em `storage-index.json`. As chaves `.bin` do pacote são nomes locais de segurança, não os nomes finais no Storage. Conferir contagem e hashes. Não tornar buckets privados públicos.
9. Reaplicar segredos pelo armazenamento seguro, conferir publicações Realtime, Auth/SMTP, políticas e regiões. Testar login, recuperação de senha, busca de pessoas, bloqueios, biblioteca, mensagens, uploads e atualizações em contas de teste.
10. Só alterar o destino dos clientes após a validação. Não restaurar sessões antigas indiscriminadamente: pedidos de exclusão e revogação posteriores ao backup precisam ser respeitados antes de reabrir acesso.

## Referências oficiais

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://www.gnupg.org/documentation/

## Ensaio real — 24/10/2026

Executado pelo responsável no Windows, com resultados acompanhados por capturas do terminal:

- Pacote criptografado descriptografado e verificado: 72 arquivos inventariados, incluindo 65 objetos do Storage.
- Primeiro destino PostgreSQL isolado sem rede: 74 tabelas / 2.505 registros conferidos por contagem, 81 relacionamentos FK validados sem falhas e vínculos entre inventário e objetos conferidos.
- Segundo destino com serviços Supabase locais: 344 colunas do backup presentes com os mesmos tipos; 18 colunas adicionais pertencentes a tabelas novas do Storage. Dados de public/auth/storage importados preservando as migrações internas do destino. Comparação de 72 tabelas / 2.378 registros sem divergência de quantidade ou conteúdo nesse escopo.
- Login com senha original, consulta autenticada e logout local responderam 200/200/204.
- 65 objetos reenviados e baixados pela API administrativa com tamanho e SHA-256 iguais ao inventário; identidade/proprietário dos objetos e configuração dos buckets preservados.
- Conta comum: 18 arquivos próprios testados, seis baixados sem divergência e 12 ocultados pelas regras existentes. Conferência das funções de aprovação/acesso retornou condições iguais à cópia original: 11 objetos sem aprovação e um em quarentena explicam os bloqueios.

Os serviços de dados foram limitados a uma rede Docker interna e os acessos locais publicados foram vinculados a 127.0.0.1. A produção não foi restaurada. O ensaio não cobre todos os clientes, fluxos de recuperação de senha, Realtime, provedores externos, Vault ou configurações/segredos externos. Tampouco é uma auditoria completa de autorização entre contas distintas.

## Preparação da automação com chave pública

O responsável gerou uma chave de backup com validade até 23/10/2028, exportou as partes pública/privada e testou a recuperação com a cópia privada importada em um chaveiro temporário separado. Somente a parte pública é destinada ao secret `BACKUP_GPG_PUBLIC_KEY` do GitHub; nunca cadastrar a chave privada ou sua senha no runner.

`backup.py --recipient-file CAMINHO_PUBLICO.asc --output CAMINHO_EXTERNO.tar.gz.gpg` permite criptografia desassistida. O script verifica o pacote em claro antes da criptografia e retorna `decryption_verified: false` nesse modo: um runner que possui apenas a chave pública não pode comprovar a descriptografia do resultado. Baixar e descriptografar a primeira cópia produzida pela automação no computador do responsável, conferir os hashes e repetir ensaios periodicamente. O modo manual por senha mantém a verificação de descriptografia e retorna `decryption_verified: true`.

O responsável escolheu sete cópias diárias em 24/10/2026. A pasta privada do Meu Drive e as sete reservas pertencem ao responsável; somente ele e a conta de serviço de backup podem acessá-las. O fluxo atualiza os arquivos existentes, sem criar arquivos pertencentes à conta de serviço e sem alterar compartilhamentos. Nunca usar a pasta pública de instaladores.

## Workflow privado e primeira execução

`.github/workflows/private-backup.yml` usa os seguintes **Actions secrets** em Settings → Secrets and variables → Actions → Secrets:

- `SUPABASE_ACCESS_TOKEN`: token com acesso ao projeto e escopos necessários ao vínculo do CLI; não enviar o valor em mensagens.
- `SUPABASE_DB_PASSWORD`: senha do banco do projeto de origem.
- `BATCAVERNA_BACKUP_SERVICE_KEY`: chave moderna `sb_secret_`, destinada ao backup.
- `BACKUP_GPG_PUBLIC_KEY`: conteúdo completo da chave pública exportada; nunca a chave privada ou sua senha.
- `GDRIVE_SERVICE_ACCOUNT_JSON`: credencial da conta de serviço autorizada na pasta privada, já usada pelos fluxos existentes.

Depois da revisão e integração na branch principal:

1. Em Actions → Backup privado Supabase → Run workflow, manter a branch principal e escolher `check`. Essa opção verifica configuração, pasta e sete arquivos, sem exportar o banco nem substituir cópias. A checagem não comprova que a senha do banco ou a chave administrativa conseguem exportar os dados.
2. Executar novamente com `backup`. Conferir todos os jobs e a saída `download_verified: true`. O fluxo exporta, verifica o pacote em claro, criptografa, atualiza uma reserva e baixa novamente o arquivo criptografado para comparar tamanho e SHA-256. A chave privada não é disponibilizada ao runner. Arquivos em claro não são enviados a artifacts do GitHub nem ao Drive.
3. Baixar a reserva `.tar.gz.gpg` atualizada para um diretório privado fora do repositório. Comparar o SHA-256 com o resultado do job, descriptografar com a chave privada local e executar `python tools/operations/backup.py --verify ARQUIVO_DESCRIPTOGRAFADO.tar.gz`. Só avançar se essa conferência for concluída sem erros. Preservar a chave privada e sua senha separadas do backup.
4. Conferir as notificações de falha do GitHub Actions na conta do responsável. Alertas de falha não detectam uma execução que nunca iniciou: estabelecer também uma conferência diária da data da última cópia válida.
5. Somente após a recuperação inicial, criar a **Actions variable** `BACKUP_AUTOMATION_ENABLED` com valor `true`, em Settings → Secrets and variables → Actions → Variables. A agenda é 06:17 UTC (03:17 em São Paulo). Execuções agendadas podem atrasar; não são garantia de horário. Remover a variável ou alterar para `false` interrompe as exportações agendadas, mantendo execução manual disponível.

O exportador só roda na branch principal. O workflow começa com testes sintéticos de integridade, criptografia e upload. A seleção preenche reservas vazias antes de substituir a cópia mais antiga e evita substituir outra reserva quando já há uma cópia verificada na mesma data UTC. Falhas de permissões, upload ou hash impedem marcar a nova cópia como válida. Uma falha durante a substituição pode reduzir temporariamente o número de cópias atuais válidas; manter também uma cópia independente.

**Retenção:** são sete arquivos atuais em rotação, não uma garantia de exclusão após sete dias. O Drive pode conservar revisões anteriores dos arquivos atualizados; o fluxo não as fixa para retenção permanente nem as elimina. Conferir o gerenciamento de versões do Drive, a política de exclusão e o espaço disponível; refletir esse comportamento no aviso de privacidade.

## Pendente

A automação diária do Drive já teve execuções reais concluídas. A segunda cópia B2 foi habilitada e o primeiro envio foi confirmado em 29/10/2026, conforme o registro abaixo. A descriptografia e a restauração do banco desta cópia foram concluídas pelo responsável no ensaio descrito abaixo. Faltam login e acesso às mídias pelos serviços para esta cópia, além de conferir notificações e acompanhar as próximas execuções agendadas e a rotação real. Monitorar validade da chave pública (23/10/2028), permissões, espaço e disponibilidade das cópias.

## Diagnóstico seguro de exportação

Uma falha de subprocesso informa somente código de saída e uma categoria fixa calculada localmente. Não imprimir stderr/stdout remoto, argumentos de conexão ou saída `--debug` no Actions: eles podem conter credenciais, dados ou detalhes internos. Categoria é indicação para investigar, não comprovação definitiva da causa.

- `DB_AUTH`: conferir a senha do banco no secret `SUPABASE_DB_PASSWORD`, sem alterar a chave do Storage por esse motivo.
- `DB_PERMISSION` / `API_PERMISSION`: conferir permissões do usuário/token usadas pelo CLI.
- `DB_VERSION`: conferir compatibilidade entre pg_dump e a versão do servidor.
- `DOCKER_IMAGE` / `DOCKER_DAEMON`: conferir acesso à imagem e disponibilidade do Docker no runner.
- `TLS` / `NETWORK`: conferir certificados, resolução DNS, conectividade do runner e restrições de rede do banco.
- `LOCAL_SPACE`: conferir espaço disponível no runner.
- `UNCLASSIFIED`: mensagem não reconhecida; não habilitar logs brutos no CI. Investigar em ambiente privado, sem compartilhar credenciais.

Se a execução falhar antes da etapa de upload, nenhum arquivo do Drive terá sido substituído por essa execução. Não habilitar a agenda enquanto não houver backup real verificado e recuperado.


## Destino adicional em São Paulo — preparado em 29/10/2026

O guia [BACKUP-SAO-PAULO.md](BACKUP-SAO-PAULO.md) e o template CloudFormation preparam um bucket S3 privado com versionamento, proteção Governance por sete dias e acesso temporário pelo GitHub. Essa integração é opcional e fica desativada sem `BACKUP_S3_ENABLED=true`. O responsável ainda precisa criar a conta AWS, revisar/provisionar o destino, cadastrar as variáveis e validar upload, descriptografia e restauração. Não há confirmação de backup real no S3 nesta etapa. O backup atual do Drive não é removido.


## Decisão atual: Drive + Backblaze B2 — 29/10/2026

O responsável escolheu manter o Drive e preparar o B2, aproveitando a faixa gratuita e a rotação de sete datas. O guia atual é [BACKUP-B2.md](BACKUP-B2.md). A opção AWS permanece preparada, sem ativação confirmada, e não é necessária para o plano escolhido. O primeiro envio B2 foi confirmado na [execução 40971128660](https://github.com/Elvash-prog/batcavernaclt/actions/runs/40971128660): região `us-east-005` (Estados Unidos), bucket privado, 67.015.394 bytes, checksum e download completo válidos. O Drive também concluiu. A chave aceita tem somente `listBuckets,listFiles,readFiles,writeFiles,deleteFiles` no bucket dedicado; a chave mestre não é usada pelo workflow. A descriptografia e a restauração local do banco desta cópia foram concluídas, conforme o registro abaixo. O teste pelos serviços continua pendente para esta cópia; o ensaio de 24/10 não o substitui.


## Ensaio B2 retomado — pasta 20261030

Resultados confirmados pelo responsável nesta retomada (não reexecutados sobre seus dados nesta sessão):

- Origem: execução `40971128660`, Drive e B2 ativos; B2 `us-east-005`, Estados Unidos.
- SHA-256 do arquivo criptografado testado: `43560df9d919fc71d1185a25e3b96644b27ebf5f4b1daaf79906e6b02c8f3cb9`.
- Descriptografia local concluída, chave privada localizada e preservada. Pacote verificado com 72 arquivos, incluindo 65 objetos de mídia.
- Windows, Docker Desktop Linux; contêiner `batcaverna-supabase-restauracao`, imagem `supabase/postgres:17.11.0.011`, rede `none`, sem portas; banco `batcaverna_ensaio`.
- Pasta privada `%USERPROFILE%\BatCaverna-Restauracao-20261030`; pacote em `%USERPROFILE%\Downloads\BatCaverna-recuperado.tar.gz`. Não versionar esses arquivos ou dados, repetir importações nesse banco nem apagar o ambiente.
- Restauradas 78 tabelas, 3.186 registros, nenhuma divergência de contagem e 85 chaves estrangeiras validadas.
- Gatilhos, políticas e FKs separados com `sqlparse` e reaplicados depois dos dados, em transação. Também foram preparados `extensions`, Vault e a publicação `supabase_realtime`.
- A lacuna do exportador exigiu reconstruir `supabase_functions.hooks` e `http_request()` usando referência oficial. Isso **não comprova equivalência exata à produção**. Contagens e FKs aprovadas também não comprovam identidade de todo o conteúdo.
- Login e acesso às mídias pelos serviços **ainda não testados nesta cópia**. O contêiner sem rede é um ensaio do banco, não uma instalação completa de Auth/Storage.

A correção passa a exportar `functions_schema.sql` diretamente da origem, sem substituir esse arquivo por uma definição oficial genérica. O manifesto formato 2 exige esse arquivo; `--verify` continua aceitando formato 1 e informa `functions_schema_included: false` quando ausente. Um pacote antigo íntegro continua incompleto para essa dependência. Não declarar o ensaio antigo como prova da nova correção: é necessário gerar uma nova cópia e conferir seu resultado.

## Próximo ensaio de login e mídias

Preservar o contêiner/banco atual sem rede e sem nova importação. Preparar **outro** destino local com serviços Supabase compatíveis, dados persistentes separados, nenhuma conexão à produção e portas vinculadas exclusivamente a `127.0.0.1`. Não conectar Auth/Storage ao contêiner preservado nem mudar sua rede. Sem esse segundo destino, os testes abaixo permanecem pendentes.

1. Conferir versões, migrações internas, extensões e configuração local de Auth/Storage antes de importar no novo destino. Desativar envio de e-mail, provedores externos, webhooks HTTP e integrações que possam produzir efeitos fora do ensaio. Preservar as definições originais exportadas para comparação antes de qualquer adaptação exclusivamente local.
2. Restaurar no novo destino conforme o procedimento acima, comparar contagens/FKs e diferenças de definição; não substituir os esquemas internos atuais do Auth/Storage cegamente.
3. Recriar os buckets com a privacidade do índice e enviar os 65 arquivos aos nomes originais. Não usar o nome local `.bin` como nome remoto. Conferir proprietários e metadados necessários às políticas.
4. Com credenciais fornecidas apenas no terminal local, testar login, consulta autenticada e logout; registrar somente status HTTP e contagens. Não registrar senha, JWT, refresh token, e-mail, nomes de objetos ou respostas com dados pessoais. O teste de recuperação de senha exige um coletor de e-mail local.
5. Conferir download administrativo de todos os objetos por tamanho e SHA-256; depois testar uma conta comum: arquivo próprio aprovado, pendente/quarentena, arquivo de outra conta e requisição anônima. O acesso administrativo não comprova RLS. Não alterar políticas para fazer o teste passar: investigar bloqueios esperados e divergências.
6. Após logout, conferir que renovar a sessão encerrada falha; um access token já emitido pode continuar válido até expirar. Registrar as limitações e os resultados separadamente do ensaio puramente SQL.

Nunca enviar chaves privadas, senhas ou arquivos pessoais ao chat. Não restaurar nada em produção e não trocar os endpoints dos clientes durante o ensaio.

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


## Nova cópia após a correção — 01/11/2026

A correção foi integrada pelo [PR 147](https://github.com/Elvash-prog/batcavernaclt/pull/147), commit `8844ea2b91ebbff11a91cca95584a0228ebf8153`, após as verificações do CI e 37 testes locais aprovados, incluindo a recuperação sintética sem SQL complementar.

A [execução 41309372776](https://github.com/Elvash-prog/batcavernaclt/actions/runs/41309372776) gerou uma nova cópia com esse commit e terminou com sucesso:

- Manifesto formato 2; `functions_schema_included: true`.
- 73 arquivos inventariados, incluindo 65 objetos de mídia. O arquivo adicional é `functions_schema.sql`.
- Drive e Backblaze B2 concluídos com `download_verified: true` em ambos; o B2 foi executado com download completo habilitado.
- SHA-256 do arquivo criptografado: `f67668355d96ceecfd5ccbddd141c2c89ad07ca7f9e2bb417fb17a722b51188b`.
- `decryption_verified: false`, esperado no runner que só possui a chave pública. A integridade do pacote em claro foi verificada antes da criptografia; os downloads conferiram a cópia criptografada.

Isso confirma a nova exportação e os destinos, além da regressão sintética de recuperação. **Não confirma a descriptografia nem a restauração real desta nova cópia.** Esses passos exigem a chave privada preservada no computador do responsável e outro destino isolado, sem repetir a importação no contêiner `batcaverna-supabase-restauracao`. Os testes locais de login e mídias continuam preparados no roteiro acima, sem execução sobre esta cópia.


## Troca da chave de backup

Se a frase secreta for perdida, uma chave nova não abre os backups antigos. Preservar a chave antiga, as cópias e qualquer pacote já descriptografado. Criar a nova chave em chaveiro separado, guardar a senha em gerenciador seguro, exportar a parte pública e a privada e testar criptografia/descriptografia de um texto sintético em dois chaveiros novos usando apenas os arquivos exportados. Manter uma cópia privada independente e a senha separada dos arquivos de backup.

Somente depois do teste, atualizar `BACKUP_GPG_PUBLIC_KEY` no GitHub com a **parte pública**. Nunca cadastrar a parte privada ou sua senha no runner.

A rotação normal mantém a primeira cópia por dia UTC. Depois de uma troca de chave, executar manualmente `Backup privado Supabase`, modo `backup`, com `replace_today=true`: a opção substitui a reserva do Drive de hoje e permite um novo envio B2 na mesma data, forçando download completo antes da limpeza normal das versões B2. Sem essa opção, uma execução pode exportar com a nova chave e manter nos destinos a cópia anterior do dia. A agenda permanece com o comportamento padrão, sem substituição forçada. A opção não altera o destino AWS opcional.

Conferir o SHA-256 retornado por cada destino contra o da exportação e baixar a nova cópia para testar a recuperação real no computador do responsável. Sucesso de upload não comprova que a nova chave privada consegue descriptografar o pacote.


## Ensaio da chave v2 e serviços locais — 01/11/2026

O responsável confirmou a perda da frase secreta da chave anterior, que foi preservada. Criou uma chave v2 em chaveiro separado, exportou as partes pública e privada e confirmou a recuperação de um texto sintético usando as exportações em dois chaveiros novos. Somente a parte pública foi atualizada em `BACKUP_GPG_PUBLIC_KEY`.

Após o [PR 149](https://github.com/Elvash-prog/batcavernaclt/pull/149), a [execução 41313336774](https://github.com/Elvash-prog/batcavernaclt/actions/runs/41313336774) substituiu explicitamente a cópia do dia: Drive e B2 confirmaram por download o mesmo SHA-256 `c0e9b036fb69cc2f52ced3965f83494861be9f11f4d495df65cb6734f674f806`, e o B2 informou `already_present_today: false`. O responsável confirmou no Windows a descriptografia com a chave v2 e a verificação interna: 73 arquivos, 65 mídias, formato 2 e `functions_schema_included: true`. Isso ainda não é uma restauração real desta cópia.

Foi criado outro projeto local, `batcaverna-ensaio-v2`, pelo CLI 2.122.0. Os dois contêineres anteriores permaneceram preservados. Auth, Storage, PostgREST, Kong, Mailpit e PostgreSQL iniciaram saudáveis. O banco novo usa `public.ecr.aws/supabase/postgres:17.11.0.006`; as 320 colunas em 31 tabelas Auth/Storage presentes nos cabeçalhos COPY do backup existem com os mesmos tipos, sem colunas extras obrigatórias sem padrão. O destino foi conferido sem usuários, buckets, objetos e tabelas da aplicação em public; Vault, hooks, http_request() e a publicação Realtime estão presentes.

Uma rede Docker `--internal` pode não publicar portas, mesmo com `-p`, impedindo o bootstrap do CLI em 127.0.0.1:54322. O comportamento foi reproduzido com PostgreSQL sintético. No Windows, os serviços ficaram somente em `batcaverna-ensaio-v2-interna`; um encaminhador TCP separado conecta essa rede a uma rede de entrada e publica exclusivamente `127.0.0.1:54321`, `127.0.0.1:54322` e `127.0.0.1:54324`. As redes dos contêineres com dados devem continuar exclusivamente internas. Não remover o encaminhador enquanto os serviços dependerem dessas portas; não publicar portas em 0.0.0.0.

### Preparação do plano, sem importação

`tools/operations/prepare_service_restore.py` usa `sqlparse==0.6.0` (fixado em `requirements-recovery.txt`) e somente aceita o contêiner `supabase_db_batcaverna-ensaio-v2`, em execução exclusivamente na rede interna acima. Reconfere os hashes da pasta extraída e recusa um banco já preenchido. Não executa SQL de restauração: apenas SELECTs de catálogo e geração de quatro arquivos locais, com hashes em `plan.json`.

O plano separa funções de webhooks exportadas da origem, definições da aplicação, dados e objetos posteriores (gatilhos, políticas e FKs). Mantém tabelas e funções nativas já existentes de Auth/Storage; conflitos de políticas/FKs ou gatilhos da aplicação em tabelas gerenciadas interrompem a preparação para revisão. Isso não comprova equivalência de todas as definições internas da plataforma entre versões. Não aplicar os esquemas gerenciados completos cegamente.

Para Auth, mantém apenas `users`, `identities` e `mfa_factors`; sessões, refresh tokens e demais tabelas Auth são omitidos e suas contagens são registradas no plano. Não desabilita MFA. As contagens da restauração devem ser comparadas ao escopo filtrado em `expected_counts`, sem declarar igualdade com o total bruto do backup.

Exemplo no computador do responsável, com scripts disponíveis localmente:

```text
py prepare_service_restore.py --backup CAMINHO_PRIVADO/backup-v2 --output CAMINHO_PRIVADO/plano-restauracao
```

O plano e seus SQLs contêm dados privados e não devem ser enviados ao chat, artifacts ou repositório. Somente o resumo de contagens pode ser compartilhado. A importação precisa de uma etapa separada com transação, parada em erro, conferência das contagens e varredura de FKs existentes: `VALIDATE CONSTRAINT` sozinho não reexamina uma FK que já estava marcada válida e recebeu dados com gatilhos desabilitados. Os testes reais de login e mídias continuam pendentes.


### Execução transacional do plano local

O plano preparado pelo responsável para a cópia v2 contém 54 tabelas e 2.596 registros a importar; 669 registros de outras tabelas Auth foram omitidos. Sete gatilhos nativos e 29 FKs nativas foram preservados. Esses números descrevem o plano, não uma importação já concluída.

`tools/operations/apply_service_restore.py` reconfere o pacote e regenera o plano usando o catálogo atual do mesmo contêiner dedicado. Recusa SQL alterado mesmo que alguém tenha atualizado os hashes no JSON do plano. Sem `--apply`, apenas valida. Com `--apply`, usa uma única transação explícita, trava as tabelas básicas do destino e recusa um banco preenchido. A ferramenta não permite selecionar outro contêiner ou banco.

Executa as definições exportadas, os dados filtrados com gatilhos desabilitados e os objetos posteriores. Antes do COMMIT, confere a contagem de cada tabela importada e procura órfãos em todas as FKs não pertencentes aos catálogos do PostgreSQL, inclusive as já marcadas válidas. A varredura usa os operadores da própria FK, suporta relações compostas e diferencia MATCH SIMPLE de MATCH FULL. Não imprime as linhas encontradas. Um erro SQL anterior ao COMMIT impede a confirmação de toda a transação. A confirmação impressa é emitida somente após o COMMIT; uma entrada interrompida antes dele não recebe confirmação nem é confirmada automaticamente no EOF.

Exemplos, no computador do responsável:

```text
py apply_service_restore.py --backup CAMINHO_PRIVADO/backup-v2 --plan CAMINHO_PRIVADO/plano-restauracao
py apply_service_restore.py --backup CAMINHO_PRIVADO/backup-v2 --plan CAMINHO_PRIVADO/plano-restauracao --apply
```

Os logs completos ficam em uma subpasta privada `execucao-*` do plano, pois erros de COPY podem conter dados pessoais. A saída compartilhável contém somente status, código SQLSTATE e contagens. Se houver erro ou falta de confirmação, **não repetir a importação antes de conferir o estado do banco**: uma falha de conexão depois do COMMIT pode impedir a confirmação ao cliente. A ferramenta recusa nova importação quando encontra dados da aplicação.

A execução e a auditoria de FKs foram testadas em PostgreSQL sintético, incluindo rollback após falha tardia, detecção de órfão em FK previamente válida, MATCH FULL com NULL parcial e interrupção do fluxo antes do COMMIT. A importação de SQL não restaura os bytes das mídias nem comprova login ou autorização entre contas.


## Resultado SQL e autenticação da cópia v2 — 01/11/2026

O responsável executou o plano no contêiner novo `supabase_db_batcaverna-ensaio-v2`. Resultado confirmado: `status: committed`, 54 tabelas, 2.596 registros conferidos e 89 FKs varridas. A diferença para o total bruto corresponde ao escopo Auth filtrado descrito acima; não se trata de nova importação nos dois contêineres anteriores.

Pelos endpoints exclusivamente em 127.0.0.1, confirmou login 200, consulta de usuário 200 e identidade coincidente, consulta autenticada do próprio perfil 200 com uma linha, logout da sessão local 204 e renovação posterior recusada com 400. A conta usada tinha zero fatores MFA verificados; MFA não foi avaliado nesta rodada. Nenhuma senha ou token foi incluído nos resultados compartilhados.

### Restauração dos bytes no backend local de arquivos

O Storage local foi identificado como `public.ecr.aws/supabase/storage-api:v1.84.19`, backend `file`, tenant/bucket interno `stub` e volume Docker em `/mnt`. `restore_local_media.py` suporta somente essa imagem, configuração e os dois contêineres dedicados, ambos exclusivamente na rede interna do ensaio. Não seleciona outros destinos.

A ferramenta reconfere o manifesto, hashes, tamanhos, nomes/versões de objetos e a privacidade dos buckets no banco. Também compara ids, versões, proprietários e metadados atuais com os registros COPY de storage.objects no SQL original, recusando alterações posteriores antes de copiar bytes. Sem `--apply`, apenas verifica. Com `--apply`, confere primeiro a leitura administrativa dos buckets e escreve somente os blobs ausentes no volume. Não faz INSERT/UPDATE nem reenvia objetos por uma API de upload que pudesse alterar seus proprietários ou disparar moderação. Arquivos existentes precisam coincidir nos bytes e atributos; divergências interrompem a operação, sem sobrescrevê-los. Novos arquivos são publicados completos, com atributos MIME/cache/encoding, por ligação atômica que recusa substituição de destino existente.

O layout e os atributos seguem o [FileBackend da versão exata](https://github.com/supabase/storage/blob/v1.84.19/src/storage/backend/file.ts), o [TenantLocation](https://github.com/supabase/storage/blob/v1.84.19/src/storage/locator.ts) e o [separador de versão](https://github.com/supabase/storage/blob/v1.84.19/src/storage/backend/adapter.ts). Respeita `TUS_USE_FILE_VERSION_SEPARATOR`. Os testes usam o FileBackend original da imagem para ler os arquivos escritos, nos dois formatos de versão; também cobrem hashes incorretos, repetição sem sobrescrita, links, travessia e colisões de caminhos.

Depois da cópia, baixa cada objeto pela API administrativa local, comparando tamanho e SHA-256 com o índice. Reconfere identidades, versões, proprietários, metadados e configurações/privacidade dos buckets; timestamps de acesso/atualização são excluídos da comparação porque leituras podem atualizá-los. O ETag produzido pelo backend local pode diferir do S3; o teste de conteúdo usa SHA-256. As chaves são lidas do CLI local em memória e nunca são exibidas. Requisições HTTP usam apenas 127.0.0.1, sem proxy nem redirecionamento de credenciais.

```text
py restore_local_media.py --backup CAMINHO_PRIVADO/backup-v2
py restore_local_media.py --backup CAMINHO_PRIVADO/backup-v2 --apply
```

Uma interrupção pode deixar parte dos novos blobs restaurados; repetir confere e reutiliza arquivos que já coincidam, sem sobrescrita. Não apagar nem alterar registros para contornar erros. Os resultados compartilháveis contêm apenas contagens. **A ferramenta ainda precisa ser executada na cópia real.** Downloads administrativos aprovados não comprovam acesso de conta comum: a etapa seguinte deve testar as regras existentes com usuário autenticado e requisições anônimas, sem mudar políticas ou tornar buckets públicos.

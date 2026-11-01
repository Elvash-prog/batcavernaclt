# Ensaio mensal assistido no Windows

**Estado: ensaio real aprovado em 01/11/2026, após correções e retomada sem nova importação.** A primeira fase validou pacote, SQL e mídias; a retomada corrigida confirmou login/perfil, acesso autenticado e anônimo, logout/refresh e parada dos serviços. O resultado detalhado está ao final. Os testes automatizados cobrem Windows, PostgreSQL e imagens reais de Auth/Storage. O lembrete mensal ainda precisa ser instalado no computador do responsável; não foi ativado remotamente.

O backup diário no GitHub Actions continua independente deste comando. O agendamento diário gera cópias criptografadas no Drive/B2. O ensaio mensal testa se uma cópia recente pode ser recuperada e usada. Não depende de manter o computador ligado para gerar o backup diário.

## Preparar uma vez

Requisitos: Windows PowerShell 5.1+, Python 3 com `py -3` e venv/pip, GnuPG, Docker Desktop em modo Linux e o CLI portátil Supabase 2.122.0 usado no ensaio anterior. O iniciador procura esse CLI em `%USERPROFILE%\BatCaverna-Servicos-v2\ferramentas\supabase-2.122.0\supabase.exe`; recusa outra versão. Não atualiza o CLI automaticamente.

Manter os arquivos desta versão juntos em uma pasta permanente de ferramentas, fora dos pacotes de backup e dos ambientes preservados. O pacote deve conter:

- `Start-RecoveryRehearsal.ps1` e `monthly_rehearsal.py`;
- `backup.py`, `b2_backup.py`, `prepare_service_restore.py`, `apply_service_restore.py`;
- `restore_local_media.py`, `verify_local_media_access.py`, `requirements-recovery.txt`.

Não misturar os arquivos candidatos com versões antigas. Conferir a origem e o SHA-256 do pacote antes de executá-lo. Não desativar a política de execução do Windows de modo global. Se os arquivos baixados forem bloqueados, só desbloquear os arquivos desta distribuição após conferir o pacote.

Abrir o PowerShell na pasta de ferramentas e conferir os pré-requisitos:

```powershell
.\Start-RecoveryRehearsal.ps1 -CheckOnly
```

Essa opção prepara uma pasta privada/venv e instala `sqlparse==0.6.0` no primeiro uso. Confere Docker Linux, GPG, CLI e portas disponíveis; não pede credenciais, não descriptografa e não cria/restaura serviços. Ainda não comprova o ensaio completo. O parser PowerShell também deve passar antes de executar o iniciador pela primeira vez.

## Comando do ensaio

```powershell
.\Start-RecoveryRehearsal.ps1
```

Selecionar no diálogo uma cópia `.gpg` recente, já baixada do Drive/B2. Colar o SHA-256 do resumo da execução correspondente, não um hash calculado do próprio arquivo sem outra referência. O iniciador confere esse hash antes de descriptografar. Ele tenta o chaveiro v2 preservado; se não estiver disponível, pede para selecionar a pasta do chaveiro. O GPG solicita a frase secreta localmente, pelo pinentry. Não há importação de chave privada nem gravação de frase secreta.

Para informar os parâmetros sem diálogos de seleção:

```powershell
.\Start-RecoveryRehearsal.ps1 -Archive 'CAMINHO_PRIVADO\backup.tar.gz.gpg' -Sha256 'SHA256_DO_RESUMO' -Keyring 'CAMINHO_PRIVADO\gnupg'
```

O padrão exige pacote criado há no máximo sete dias e recusa data sem fuso ou no futuro. Para um ensaio histórico deliberado, `-MaxAgeDays` aceita de 1 a 60 dias; isso não transforma uma cópia antiga em backup atualizado.

Cada execução cria um projeto `batcaverna-mensal-<identificador novo>`, com banco e volumes novos. Não existe opção para escolher um banco já restaurado, resetar ou reaproveitar um ensaio anterior. Uma trava impede dois ensaios simultâneos. Se o processo for encerrado à força, conferir se ainda está ativo antes de remover a trava privada `.ensaio-em-andamento`.

O comando:

1. Confere o hash externo, descriptografa, valida o manifesto/arquivos e extrai com limites de tamanho, recusando links, travessia, ADS e colisões de caminhos do Windows.
2. Cria rede Docker interna e um encaminhador TCP da versão fixada. Apenas ele tem portas em `127.0.0.1:55321`, `55322` e `55324`; os serviços de dados só pertencem à rede interna. Recusa portas ocupadas, membros inesperados, PostgreSQL/Storage incompatíveis ou serviços expostos.
3. Usa as ferramentas validadas para preparar SQL, revalidar o plano, importar em transação e conferir contagens/FKs antes do COMMIT. As definições de supabase_functions vêm do pacote. Não conecta o CLI ao projeto remoto.
4. Restaura os bytes das mídias sem uploads que alterem proprietários, verifica todos os downloads administrativos e os metadados/privacidade.
5. Pede e-mail/senha da conta BatCaverna somente no terminal, com entrada oculta. Verifica login, identidade, perfil próprio, acessos autenticados e anônimos conforme as políticas atuais, logout e rejeição do refresh token após logout. Uma conta com MFA verificado resulta em ensaio limitado; não desabilita MFA.
6. Grava `relatorio.json` com contagens e códigos fixos e para somente os contêineres gerados nesta execução, inclusive em falhas. Falha ao confirmar a parada também impede aprovação. Não apaga volumes, pacotes nem ambientes anteriores.

Os arquivos ficam em `%USERPROFILE%\BatCaverna-Ensaios-Mensais\ensaio-<identificador>`, com ACL do usuário atual e SYSTEM. O diretório contém dados pessoais e SQL/logs privados. Apenas `relatorio.json` foi projetado para compartilhamento, sem nomes de objetos, identificadores de contas, credenciais ou corpos de erro. A pasta `python` contém o venv, não as credenciais. O relatório é gravado ao final; se faltar após queda de energia/processo interrompido, o ensaio não está aprovado.

Os contêineres e volumes são preservados e consomem disco em cada ensaio. Revisar retenção local separadamente; este comando não faz limpeza automática. Se o banco tiver sido confirmado mas uma etapa posterior falhar, preservar esse ensaio para diagnóstico e iniciar outro identificador no próximo teste, sem repetir importação nele.

## Download automático opcional do B2

O modo inicial seleciona um arquivo já baixado. Para também baixar a cópia mais recente no mesmo comando, criar **outra chave de aplicação B2**, restrita ao bucket dedicado e com somente `listBuckets,listFiles,readFiles`. Não substituir nem ampliar a chave usada pelo backup diário. A ferramenta recusa chave mestre ou permissões de escrita/exclusão. O uso faz download completo e consome a transferência do B2; não modifica os caps da conta.

Guardar um JSON local com **somente** os campos abaixo; não cadastrar chaves ou senhas nesse arquivo:

```json
{"bucket_id":"ID_DO_BUCKET","bucket_name":"NOME_DO_BUCKET","region":"us-east-005"}
```

```powershell
.\Start-RecoveryRehearsal.ps1 -B2Config 'CAMINHO_PRIVADO\b2-leitura.json'
```

O ID e a chave de aplicação são solicitados com entrada oculta a cada ensaio e usados somente em memória. O download seleciona a versão diária gerenciada mais recente e verifica tamanho/SHA-256 contra os metadados B2 recebidos por HTTPS, além do manifesto após descriptografar. Não faz upload, poda nem alteração do bucket. Falha no download não dispara restauração. Endpoints B2 inesperados e redirecionamentos são recusados; o acesso aos serviços de dados usa exclusivamente loopback, sem proxy.

## Lembrete mensal

**O resultado real foi aprovado nas condições registradas abaixo.** Na pasta permanente das ferramentas:

```powershell
.\Start-RecoveryRehearsal.ps1 -InstallMonthlyReminder
```

Cria `BatCaverna-Ensaio-Mensal-Assistido` no Agendador de Tarefas: dia 1, às 19h no horário local do Windows, começando no mês seguinte. A tarefa usa o usuário atual, somente em sessão interativa, sem senha armazenada e sem privilégios elevados. Mostra um lembrete para iniciar o assistente; não descriptografa nem importa sem a participação local. Execuções perdidas podem ser apresentadas quando a sessão estiver disponível. O horário pode ser alterado no Agendador.

Uma tarefa existente não é substituída. Manter a pasta das ferramentas no mesmo caminho. Por padrão, o lembrete usa o modo de seleção de arquivo. Para instalar o lembrete com download B2, informar também `-B2Config 'CAMINHO_PRIVADO\b2-leitura.json'` na instalação: somente o caminho do arquivo de configuração é gravado na tarefa; as duas credenciais B2 continuam sendo pedidas localmente a cada ensaio. Para desativar/remover o lembrete, usar o Agendador de Tarefas. Isso não altera a agenda do backup diário.

A ausência de relatório mensal precisa ser acompanhada pelo responsável; o lembrete não é um monitor externo. As notificações de falha do GitHub e a data da última cópia diária válida também precisam de acompanhamento. Este ensaio continua limitado às políticas da conta escolhida e não cobre auditoria entre contas independentes, aplicativos nativos ou recuperação de toda a infraestrutura/segredos externos do Supabase.


## Correção das permissões da pasta no Windows

A primeira execução de `-CheckOnly` foi confirmada no Windows: CLI 2.122.0, Docker Linux e portas livres, sem restauração iniciada. Na tentativa seguinte, o iniciador original falhou no `Set-Acl` por `SeSecurityPrivilege`, antes de chamar o coordenador Python. Não é necessário repetir importações nem elevar o PowerShell.

A correção lê e persiste apenas a seção Access (DACL) pela API .NET, preservando owner/group/auditoria. Remove regras explícitas anteriores e mantém somente usuário atual/SYSTEM, com herança para os arquivos do ensaio. O teste Windows chama essa função duas vezes no mesmo diretório e confere as duas permissões resultantes, tanto no Windows PowerShell quanto no PowerShell Core disponível. Não substitui a validação integral do novo ensaio.


## Retomar somente o acesso após SQL/mídias aprovados

O primeiro ensaio automatizado real confirmou 73 arquivos, 65 mídias, formato 2 e definições de functions incluídas, SQL em COMMIT (54 tabelas, 2.596 registros, 88 FKs examinadas) e 65 downloads administrativos com metadados preservados. A etapa de login retornou 422; os serviços foram parados e o ambiente preservado. Isso ainda não aprova o ensaio completo.

O coordenador inicial gerava `[auth.email].enable_signup=false`. No [CLI 2.122.0](https://github.com/supabase/cli/blob/v2.122.0/apps/cli/src/commands/start/services/gotrue.service.ts), essa opção determina `GOTRUE_EXTERNAL_EMAIL_ENABLED`, desabilitando também o login. A configuração corrigida mantém `[auth].enable_signup=false` (`GOTRUE_DISABLE_SIGNUP=true`) e usa `[auth.email].enable_signup=true`: login por e-mail habilitado e novos cadastros globalmente bloqueados.

```powershell
.\Start-RecoveryRehearsal.ps1 -RetryAccess 'IDENTIFICADOR_DO_ENSAIO'
```

Essa opção só aceita um relatório inicial com SQL confirmado, downloads administrativos aprovados e serviços parados, na pasta gerada para o próprio identificador hexadecimal. Não pede pacote/GPG nem recebe outro backup. Verifica novamente o pacote e sua data, a rede e os nomes/imagens/portas dos contêineres. Uma configuração inesperada impede a correção.

Quando o Auth ainda está com o provedor de e-mail desativado, preserva o contêiner anterior parado com outro nome e recria somente o Auth sem volumes, na mesma rede interna, copiando ambiente, imagem e configurações compatíveis e alterando o flag de e-mail. O ambiente temporário que contém os segredos do serviço fica na pasta privada e é apagado depois da criação; nunca é impresso. Não habilita novos cadastros. Contêiner com mounts, privilégios elevados ou configurações não suportadas é recusado antes dessa alteração.

Depois, inicia os serviços existentes, reexamina contagens e FKs em transação READ ONLY sem CREATE/INSERT de tabelas de validação, confere os blobs já presentes e seus downloads e pede a conta local para repetir acesso/perfil/logout/refresh. Não executa os SQLs de importação nem copia novamente as mídias. O relatório inicial é preservado; cada retomada grava outro `retomada-<identificador>.json`. Para novamente os serviços gerados ao terminar. Os códigos de erro Auth compartilháveis vêm de uma lista fixa; mensagens/corpos remotos continuam privados.

### Portas declaradas na retomada

O diagnóstico do ambiente real confirmou os seis serviços parados, somente na rede interna e com `NetworkSettings.Ports={}`. O Docker conserva declarações em `HostConfig.PortBindings` para db (`5432/tcp → 55322`), kong (`8000/tcp → 55321`) e inbucket (`8025/tcp → 55324`), mesmo quando a rede interna impede publicação. A checagem inicial da retomada tratava essa configuração como exposição e interrompia antes da correção do Auth.

A checagem corrigida aceita somente essas três declarações, nas portas exatas, com endereço explícito loopback ou vazio apenas quando o padrão da rede é `127.0.0.1`. Continua exigindo rede interna exclusiva com o identificador do ensaio; depois da partida, todos os serviços de dados precisam permanecer sem portas efetivamente publicadas. Rede adicional, endereço wildcard, porta diferente ou publicação efetiva impedem prosseguir. Os testes criam contêineres descartáveis em Docker real e conferem as declarações/publicações antes, durante e depois da execução; também cobrem recusas antes de qualquer partida e exposição detectada depois dela. Nenhum SQL de importação precisa ser repetido.


## Resultado real aprovado — 01/11/2026

O responsável confirmou a retomada com `status: passed`, `stage: complete`, `retry_access_only: true`, `auth_email_provider_corrected: true`, `sql_rechecked_read_only: true` e `services_stopped: true`. A cópia permaneceu com SHA-256 `c0e9b036fb69cc2f52ced3965f83494861be9f11f4d495df65cb6734f674f806`, formato 2, 73 arquivos, 65 mídias e definições de supabase_functions incluídas.

O COMMIT original continha 54 tabelas, 2.596 registros e 88 FKs examinadas neste projeto de serviços. A retomada reexaminou contagens/FKs em modo somente leitura e conferiu os blobs existentes e downloads sem nova importação nem cópia de mídias. Os 65 downloads administrativos e a preservação dos metadados haviam sido confirmados na primeira fase.

```json
{"status":"passed","login_status":200,"user_status":200,"profile_status":200,"profile_rows":1,"verified_mfa_factors":0,"objects":65,"user_expected_allowed":48,"user_downloads_verified":48,"user_expected_denied":17,"user_denials_verified":17,"anonymous_private_expected":64,"anonymous_private_denials_verified":64,"anonymous_public_downloads_verified":1,"policy_mismatches":0,"logout_status":204,"refresh_after_logout_status":400,"refresh_blocked":true}
```

Não houve divergência entre os acessos e as políticas no contexto da conta escolhida. O refresh token foi recusado após logout. Os serviços foram parados, o relatório inicial e os relatórios de retomada foram preservados e não houve restauração em produção. Este resultado foi obtido em duas fases, não em uma nova importação completa após as correções. O download B2 opcional e a instalação/execução do lembrete mensal ainda dependem de configuração/confirmação local; a validação do ensaio não os ativa automaticamente.

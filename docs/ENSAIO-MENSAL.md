# Ensaio mensal assistido no Windows

**Estado: implementação candidata, ainda sem execução integral no Windows/Docker.** O ensaio manual de 01/11/2026 foi aprovado; isso não valida automaticamente o novo coordenador. Antes de instalar o lembrete, validar o iniciador PowerShell e executar um ensaio completo com esta versão em um destino novo. A publicação e os testes com Docker desta implementação ficaram bloqueados na sessão de desenvolvimento pelo limite da revisão automática.

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

**Instalar somente depois da validação integral desta versão.** Na pasta permanente das ferramentas:

```powershell
.\Start-RecoveryRehearsal.ps1 -InstallMonthlyReminder
```

Cria `BatCaverna-Ensaio-Mensal-Assistido` no Agendador de Tarefas: dia 1, às 19h no horário local do Windows, começando no mês seguinte. A tarefa usa o usuário atual, somente em sessão interativa, sem senha armazenada e sem privilégios elevados. Mostra um lembrete para iniciar o assistente; não descriptografa nem importa sem a participação local. Execuções perdidas podem ser apresentadas quando a sessão estiver disponível. O horário pode ser alterado no Agendador.

Uma tarefa existente não é substituída. Manter a pasta das ferramentas no mesmo caminho. Este lembrete usa o modo de seleção de arquivo; o download B2 continua sendo uma opção explícita por `-B2Config`. Para desativar/remover o lembrete, usar o Agendador de Tarefas. Isso não altera a agenda do backup diário.

A ausência de relatório mensal precisa ser acompanhada pelo responsável; o lembrete não é um monitor externo. As notificações de falha do GitHub e a data da última cópia diária válida também precisam de acompanhamento. Este ensaio continua limitado às políticas da conta escolhida e não cobre auditoria entre contas independentes, aplicativos nativos ou recuperação de toda a infraestrutura/segredos externos do Supabase.

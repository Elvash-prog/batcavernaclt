# Segunda cópia gratuita no Backblaze B2

Decisão do responsável em 29/10/2026: manter o Google Drive e acrescentar o Backblaze B2. A AWS permanece opcional/desativada. **Primeiro envio real confirmado em 29/10/2026:** bucket privado na região `us-east-005` (Estados Unidos), chave restrita, 67.015.394 bytes e checksum/download completo conferidos na [execução 40971128660](https://github.com/Elvash-prog/batcavernaclt/actions/runs/40971128660). O Drive também concluiu nessa execução. A descriptografia e a restauração desta cópia continuam pendentes.

## Espaço e custos

O backup de 29/10/2026 teve **67.178.606 bytes**, com download conferido no fluxo do Drive. Sete pacotes desse tamanho ocupariam cerca de **470 MB**, sem contar crescimento futuro ou versões extras.

Na tabela consultada em 29/10/2026, os primeiros **10 GB de armazenamento B2 são gratuitos**, sem prazo de seis meses. A franquia é compartilhada pela conta, não concedida novamente a cada bucket. Armazenamento extra, transferências fora da franquia e outros serviços podem gerar cobrança.

O código impõe um limite mais baixo de **2 GB no bucket dedicado**, incluindo todas as versões retornadas pelo provedor. Cada pacote pode ter até 512 MiB. O programa recusa novo upload se o inventário somado ao pacote passar desse teto; nunca apaga arquivos desconhecidos para liberar espaço. Outros buckets e clientes da mesma conta não são observáveis pela chave restrita: não tratar esse controle local como teto financeiro de toda a conta.

A franquia de download tem regras próprias: a tabela atual prevê transferência gratuita de até três vezes o armazenamento médio mensal. Baixar todos os backups de 67 MB diariamente pode ultrapassar a franquia, mesmo com apenas sete cópias guardadas. Por isso:

- Cada envio valida o SHA-1 calculado sobre o pacote com o checksum confirmado pelo B2, o tamanho, SHA-256 nos metadados e a versão específica consultada depois do upload.
- O download completo é **manual/opcional** no workflow. Quando solicitado, os bytes baixados são comparados com o SHA-256 esperado.
- Os limites de gastos do provedor devem ser configurados antes de ativar. A flag de confirmação do GitHub registra a configuração feita pelo responsável; o programa não consegue consultar esses valores pela chave de arquivos.
- Nenhuma dessas verificações substitui descriptografar e restaurar uma cópia em ambiente separado.

Referências: [preços](https://www.backblaze.com/cloud-storage/pricing), [transações e transferência](https://www.backblaze.com/cloud-storage/transaction-pricing), [Caps & Alerts](https://www.backblaze.com/docs/cloud-storage-create-and-manage-caps-and-alerts).

## 1. Conta e bucket privado

1. Crie uma conta de **Backblaze B2 Cloud Storage** em https://www.backblaze.com/cloud-storage. O produto de backup ilimitado de computadores é outro serviço. Ative autenticação em duas etapas.
2. Na criação da conta, escolha conscientemente a região. Como opção documentável, **EU Central** fica em Amsterdã, Países Baixos; há também regiões nos EUA e Canadá. Não existe região Brasil na documentação consultada. A região da conta não pode ser simplesmente alterada depois; confirme a escolha antes de concluir. Consulte [Data Regions](https://www.backblaze.com/docs/cloud-storage-data-regions).
3. Abra **B2 Cloud Storage → Caps & Alerts → Edit Caps**. Retire `No Cap` e configure os limites diários de gastos em **US$ 0,00**, para armazenamento, downloads e categorias disponíveis de transações. Confira que foram salvos. As alterações podem levar até dez minutos. Um alerta isolado não é um bloqueio de gastos; configure os caps, não apenas o e-mail de aviso. Em conta gratuita sem cartão, a edição pode ficar indisponível: confira se os limites já aparecem como US$ 0,00, como na configuração informada pelo responsável. Se não for possível confirmar os limites, mantenha a integração desativada e revise as condições antes de seguir.
4. Crie um bucket exclusivo, por exemplo `batcaverna-backups-SEU-SUFIXO-UNICO`, escolhendo **Private**. Mantenha as versões disponíveis para a rotação do programa. Não acrescente Object Lock/retention ou uma regra que remova os arquivos antes da rotina: isso pode impedir a rotação ou remover pontos de recuperação. O controle de sete datas será feito pelo uploader.
5. Anote o **nome**, **Bucket ID** e o **S3 Endpoint** mostrado pelo B2. Um endpoint `s3.eu-central-003.backblazeb2.com` corresponde à configuração `eu-central-003`. O uso da API nativa pelo script não muda a região da conta.

## 2. Chave restrita e GitHub

Em **Application Keys**, crie uma chave de aplicação restrita **somente a esse bucket**, com leitura/gravação, listagem e remoção de versões de arquivos. Permita listar o bucket. Deixe o prefixo de arquivo em branco para o programa conseguir contabilizar todo o bucket; ele só escreve no namespace `batcaverna/` e só remove versões próprias reconhecidas nesse namespace. Não use a chave mestre ou uma chave que administre outros buckets, chaves ou contorne retenção.

A opção genérica `Read and Write` da interface pode incluir `writeBuckets`, que a rotina recusa por permitir alterar o bucket. Nesse caso, use a ferramenta oficial B2 para criar uma chave com capacidades explícitas: `b2 key create --bucket NOME_EXATO batcaverna-backup-restrita "listBuckets,listFiles,readFiles,writeFiles,deleteFiles"`. A autenticação para criar essa chave exige credenciais com permissão de criação; não cadastrar a chave mestre no GitHub. Tanto a saída da autenticação quanto a da criação podem conter credenciais: não compartilhar capturas ou logs.

O script verifica o escopo real retornado pela autorização antes de operar. As capacidades necessárias são `listBuckets`, `listFiles`, `readFiles`, `writeFiles` e `deleteFiles`. Também recusa capacidades administrativas de chaves/buckets e bypass de Governance. A conta precisa permitir a rotação de versões antigas; um problema de permissão deixa a execução com erro, preservando as demais cópias.

No repositório `Elvash-prog/batcavernaclt`, abra **Settings → Secrets and variables → Actions**.

Em **Secrets**, cadastre:

| Secret | Valor |
| --- | --- |
| `B2_BACKUP_KEY_ID` | `keyID` da chave de aplicação |
| `B2_BACKUP_APPLICATION_KEY` | `applicationKey` da chave, exibida na criação |

Cadastre os valores diretamente no GitHub. Não enviar a chave pelo chat, issue ou commit. A chave privada GPG permanece fora do GitHub, como no backup atual.

Em **Variables**, cadastre:

| Variável | Valor |
| --- | --- |
| `BACKUP_B2_BUCKET_ID` | Bucket ID mostrado pelo B2 |
| `BACKUP_B2_BUCKET_NAME` | Nome exato do bucket privado |
| `BACKUP_B2_REGION` | Região extraída do S3 Endpoint, por exemplo `eu-central-003` |
| `BACKUP_B2_CAPS_CONFIRMED` | `true` depois de conferir os caps no B2 |
| `BACKUP_B2_ENABLED` | `true` depois de concluir essa configuração |

Mantenha `BACKUP_S3_ENABLED` ausente ou `false`: a AWS não faz parte da opção escolhida. A variável existente `BACKUP_AUTOMATION_ENABLED` continua controlando a agenda diária. O B2 fica desativado enquanto sua flag de ativação não for `true`.

## 3. Primeiro teste e ativação

1. Em **Actions → Backup privado Supabase → Run workflow**, selecione `main`, modo `check`. Confira a etapa B2 com `private_bucket_checked: true`, região correta, quantidade de versões e ocupação abaixo de `budget_bytes: 2000000000`. Esse modo não grava nem apaga arquivos e ainda não comprova a permissão de upload ou remoção.
2. Execute no modo `backup`. O pacote já exportado/criptografado é enviado para o Drive e para o B2. Confira separadamente o resultado de cada destino no resumo. No B2, espere `upload_checksum_verified: true`. Sem a opção de download completo, `download_verified` permanece `false` intencionalmente.
3. Para a conferência inicial, execute no modo `backup` marcando **Conferir download completo do B2**. Uma cópia confirmada na mesma data UTC é reaproveitada sem criar outra versão. Confira `download_verified: true`, sujeito à franquia de transferência e aos caps da conta. A rotina não aumenta os caps automaticamente para fazer o download passar.
4. Baixe a cópia pelo console privado B2 e descriptografe com a chave privada local. Confira o pacote e faça um ensaio de restauração em ambiente separado conforme [RECOVERY.md](RECOVERY.md). O runner só tem a chave pública; `decryption_verified` continua `false` nos testes automáticos.
5. Depois da validação real, registre o país da região escolhida no inventário de armazenamento e no aviso de privacidade. Não declarar Brasil para esse destino, nem afirmar que o Drive está no mesmo país.

## Rotação e falhas

O uploader mantém **sete datas UTC de backup**, com uma versão preferida por data. Depois de confirmar uma nova versão por checksum e metadados, remove apenas versões reconhecidas excedentes. Durante o envio/verificação pode existir uma oitava cópia temporária; esse espaço entra no cálculo anterior ao upload. Uma falha no envio ou na validação não inicia a remoção das cópias anteriores. Uma falha na limpeza pode deixar cópias extras, que entram na próxima contagem de espaço.

A contagem consulta `b2_list_file_versions` com paginação, incluindo versões ocultas/antigas. Um inventário incompleto, upload grande não finalizado ou destino público interrompe a rotina. Arquivos fora do formato e namespace próprios não são apagados.

Drive e B2 têm resultados separados. Quando há outro destino habilitado, falhas na autenticação do Drive não impedem tentar exportar e enviar para ele. O workflow ainda fica com erro se um destino habilitado falhar: não apresenta falha parcial como sucesso integral. Cada destino usa suas próprias credenciais e verificações.

O agendamento ainda depende do GitHub Actions: quotas, atrasos e indisponibilidade podem impedir uma execução. Conferir a data da última cópia e as notificações de falha. Mudar de armazenamento não remove essa dependência. Para suspender novos envios B2, altere `BACKUP_B2_ENABLED` para `false`; isso não apaga arquivos existentes.

## Conferência local da primeira cópia — Windows

No console privado B2, abra o bucket, entre em `batcaverna/2026-10-29/` e baixe o arquivo `43560df9d919fc71d1185a25e3b96644b27ebf5f4b1daaf79906e6b02c8f3cb9.tar.gz.gpg`. Guarde em uma pasta local privada fora do repositório e, para os comandos abaixo, renomeie para `BatCaverna-2026-10-29.tar.gz.gpg`. Não torne o bucket público nem envie o pacote ao chat. O arquivo contém dados pessoais, mesmo criptografado.

No PowerShell, dentro dessa pasta:

```powershell
Get-FileHash ".\BatCaverna-2026-10-29.tar.gz.gpg" -Algorithm SHA256
```

O resultado deve ser `43560DF9D919FC71D1185A25E3B96644B27EBF5F4B1DAAF79906E6B02C8F3CB9`. Se não coincidir, pare e confira a versão baixada. Maiúsculas/minúsculas não alteram o hash. Esse valor corresponde somente à primeira cópia indicada acima.

Com GnuPG/Gpg4win instalado e a chave privada de backup já disponível no chaveiro local:

```powershell
gpg --output ".\BatCaverna-2026-10-29.tar.gz" --decrypt ".\BatCaverna-2026-10-29.tar.gz.gpg"
```

A senha é informada somente na janela local do GnuPG. Não coloque senha em argumentos nem envie a chave privada, o TAR ou capturas com dados ao chat. Se aparecer `No secret key`, localize a chave privada de backup guardada pelo responsável e importe-a localmente; a chave pública do GitHub não descriptografa o arquivo. Não gere outra chave esperando recuperar um arquivo antigo.

Depois, com Python e uma cópia do repositório disponíveis, execute `py tools/operations/backup.py --verify CAMINHO_PRIVADO/BatCaverna-2026-10-29.tar.gz`. Só avance se a verificação concluir sem erros. Siga o [ensaio de recuperação](RECOVERY.md#ensaio-de-recuperação) em um destino isolado, sem vínculo com produção. Não restaure SQL diretamente no projeto principal. Mantenha o pacote descriptografado fora de pastas compartilhadas e remova-o depois do ensaio conforme a política de retenção.

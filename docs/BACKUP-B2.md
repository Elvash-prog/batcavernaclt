# Segunda cópia gratuita no Backblaze B2

Decisão do responsável em 29/10/2026: manter o Google Drive e acrescentar o Backblaze B2. A AWS permanece opcional/desativada. **A integração está preparada; ainda não há cópia real B2 confirmada nesta etapa.** Criar e configurar a conta e validar o primeiro envio continuam necessários.

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
3. Abra **B2 Cloud Storage → Caps & Alerts → Edit Caps**. Retire `No Cap` e configure os limites diários de gastos em **US$ 0,00**, para armazenamento, downloads e categorias disponíveis de transações. Confira que foram salvos. As alterações podem levar até dez minutos. Um alerta isolado não é um bloqueio de gastos; configure os caps, não apenas o e-mail de aviso. Se a interface ou seu plano não permitir zero, mantenha a integração desativada e revise as condições antes de seguir.
4. Crie um bucket exclusivo, por exemplo `batcaverna-backups-SEU-SUFIXO-UNICO`, escolhendo **Private**. Mantenha as versões disponíveis para a rotação do programa. Não acrescente Object Lock/retention ou uma regra que remova os arquivos antes da rotina: isso pode impedir a rotação ou remover pontos de recuperação. O controle de sete datas será feito pelo uploader.
5. Anote o **nome**, **Bucket ID** e o **S3 Endpoint** mostrado pelo B2. Um endpoint `s3.eu-central-003.backblazeb2.com` corresponde à configuração `eu-central-003`. O uso da API nativa pelo script não muda a região da conta.

## 2. Chave restrita e GitHub

Em **Application Keys**, crie uma chave de aplicação restrita **somente a esse bucket**, com leitura/gravação, listagem e remoção de versões de arquivos. Permita listar o bucket. Deixe o prefixo de arquivo em branco para o programa conseguir contabilizar todo o bucket; ele só escreve no namespace `batcaverna/` e só remove versões próprias reconhecidas nesse namespace. Não use a chave mestre ou uma chave que administre outros buckets, chaves ou contorne retenção.

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

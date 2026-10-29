# Backup privado em São Paulo

Estado: configuração preparada, **S3 ainda não ativado nem validado em uma conta AWS**. O responsável informou em 29/10/2026 que ainda não tem conta AWS. O backup criptografado existente no Google Drive permanece. A execução diária de 29/10/2026 terminou com sucesso; isso não substitui conferir a recuperação dos dados atuais.

## O que esta etapa faz

Reaproveita `backup.py`: banco, histórico de migrações e arquivos do Supabase Storage são inventariados, conferidos e criptografados com a chave pública GPG. O runner não recebe a chave privada. O novo destino recebe apenas o pacote `.tar.gz.gpg`.

O template [backup-s3-stack.json](../tools/operations/backup-s3-stack.json) prepara:

- Bucket privado na região `sa-east-1` (São Paulo), com bloqueio público, ACLs desativadas e criptografia S3, além do GPG já aplicado no exportador.
- Histórico de versões e Object Lock Governance por sete dias. A role da automação não tem permissão de apagar cópias ou contornar a proteção. Um administrador autorizado da conta pode contornar Governance; não é uma garantia de imutabilidade contra o próprio administrador.
- Expiração das cópias atuais a partir de oito dias e das versões não atuais oito dias depois de se tornarem antigas. Com versionamento, marcadores de exclusão e execução assíncrona do lifecycle, isso **não garante destruição física em oito dias**. Revisar o prazo com a política de exclusão e o uso real.
- Permissão temporária por GitHub OIDC, limitada à branch `main` de `Elvash-prog/batcavernaclt` e ao prefixo `backups/`. Não é necessário criar chaves AWS permanentes.
- Bucket preservado ao excluir ou substituir a stack, evitando apagar backups junto com a configuração. Isso também mantém eventuais custos de armazenamento até uma exclusão administrativa posterior.

O template não cria recursos fora de São Paulo. Se for aberto em outra região, a stack não terá os recursos/outputs esperados: selecione São Paulo antes de criar. Não há replicação para outra região configurada.

**Custos:** o uso do S3 pode gerar cobranças de armazenamento, requisições e download. Configure um alerta de gastos antes da ativação. Um alerta não é um teto que bloqueia despesas. Verifique os preços e o plano oferecido pela AWS à sua conta; não presumir gratuidade permanente.

## 1. Criar a conta e o destino

1. Crie sua conta em https://aws.amazon.com/pt/ e conclua a verificação e a forma de pagamento exigidas pela AWS. Ative autenticação em duas etapas e um alerta de gastos. Não cadastre senhas, cartão ou chaves privadas no repositório ou no chat.
2. No console, escolha **América do Sul (São Paulo) — sa-east-1**.
3. Abra **CloudFormation → Criar pilha → Com novos recursos → Fazer upload de um arquivo de modelo**. Use o JSON indicado acima; ele contém configuração, não credenciais.
4. Nome sugerido: `batcaverna-backups`. Em uma conta nova, deixe `ExistingGitHubProviderArn` vazio. Se já existir um provedor IAM para `token.actions.githubusercontent.com`, informe o ARN dele para reutilizá-lo. O template preserva um provedor que criar, pois ele pode futuramente ser compartilhado por outras automações.
5. Revise os recursos, a região, a proteção de sete dias e o lifecycle. Reconheça a criação da role IAM e crie a stack. Essa é a etapa que efetivamente provisiona recursos na sua conta.
6. Quando a stack chegar a `CREATE_COMPLETE`, abra **Saídas / Outputs**. Ela fornece `BackupBucketName`, `BackupRoleArn`, `BackupAccountId` e `BackupRegion`. Confira que a região é `sa-east-1`.

## 2. Conectar ao GitHub

Em [Settings → Secrets and variables → Actions → Variables](https://github.com/Elvash-prog/batcavernaclt/settings/variables/actions), crie **Repository variables**:

| Variável | Valor |
| --- | --- |
| `BACKUP_S3_BUCKET` | Saída `BackupBucketName` |
| `BACKUP_AWS_ROLE_ARN` | Saída `BackupRoleArn` |
| `BACKUP_AWS_ACCOUNT_ID` | Saída `BackupAccountId`, com 12 dígitos |
| `BACKUP_S3_ENABLED` | `true`, somente depois de revisar a configuração acima |

São identificadores de configuração, não senhas AWS. Os secrets atuais de Supabase e a chave **pública** GPG permanecem como descritos em [RECOVERY.md](RECOVERY.md). A conta desta sessão não dispõe de conexão AWS e não conseguiu consultar as variáveis do repositório; não presumir que foram cadastradas automaticamente.

`BACKUP_AUTOMATION_ENABLED` continua controlando a agenda existente. `BACKUP_S3_ENABLED` controla somente a cópia extra no S3. Deixá-la ausente ou `false` mantém o fluxo do Drive. A adição do S3 não exige desativar o Drive.

## 3. Validar antes de considerar o S3 um backup utilizável

1. Em **Actions → Backup privado Supabase → Run workflow**, selecione `main` e modo `check`. Confira a etapa S3 com `private_bucket_checked: true`, `region: sa-east-1` e `retention_days: 7`. Esse modo não grava arquivos e ainda não comprova a permissão de upload.
2. Execute novamente no modo `backup`. O pacote é exportado e criptografado uma vez. O upload do Drive ocorre antes das etapas S3, para uma falha no S3 não impedir a cópia existente. Se o Drive falhar depois da exportação, o S3 ainda tenta receber o pacote já criptografado. Qualquer falha mantém o workflow com erro, exigindo conferir o resultado de cada destino.
3. Confira o resultado S3 com `download_verified: true`. O programa verifica a região real, a conta proprietária, proteção pública, criptografia, versionamento e retenção. Cria um objeto sem sobrescrever uma versão existente e baixa a **versão específica** para comparar SHA-256 e tamanho.
4. Esse resultado informa `decryption_verified: false`: possuir somente a chave pública não permite comprovar descriptografia. No seu computador, baixe a cópia pelo console privado do S3, descriptografe com a chave privada guardada separadamente e confira o pacote. Exemplo, substituindo os caminhos:

```sh
gpg --output "/pasta-privada/teste-recuperacao.tar.gz" --decrypt "/pasta-privada/backup.tar.gz.gpg"
python tools/operations/backup.py --verify "/pasta-privada/teste-recuperacao.tar.gz"
```

5. Faça o ensaio de restauração em um ambiente separado, seguindo [RECOVERY.md](RECOVERY.md). Confira usuários, bibliotecas, horas, conquistas, permissões e arquivos de mídia. Registre a data e o resultado. Não restaurar sobre produção para testar.
6. Só depois desse ensaio considerar a nova cópia adequada para recuperação e atualizar o inventário público com a região comprovada. A cópia do Drive continua tendo localização física não confirmada.

## Operação e limites

A agenda continua no GitHub Actions. Limites de minutos, indisponibilidade e atrasos do GitHub podem interromper a criação de cópias; mudar o destino para S3 não remove essa dependência. Conferir diariamente a data da última cópia validada e as notificações de falha. Se for necessário garantir uma janela de recuperação mais rígida, avaliar separadamente backups gerenciados do Supabase e um executor com monitoramento independente.

O limite atual do exportador é de 256 MiB para mídias; um pacote incompleto falha. O upload S3 simples limita cada pacote criptografado a 5 GiB. Crescimento além desses limites exige revisar a configuração, os custos e o método de transferência.

Região do bucket não significa que todo o processamento fica no Brasil: a exportação usa arquivos temporários no runner GitHub antes da criptografia e o Drive tem localização própria. Esta etapa não muda o país do runner, os fornecedores de produção ou as cópias antigas. Não alterar o aviso para afirmar que todos os dados ficam exclusivamente no Brasil.

Para suspender novos envios ao S3, altere `BACKUP_S3_ENABLED` para `false`. Isso não apaga cópias existentes. Mantenha a chave privada GPG e sua senha fora do GitHub e do próprio bucket e acompanhe a validade da chave pública indicada em `RECOVERY.md`.

# Recuperação no plano gratuito

O teste em dois computadores foi concluído com sucesso pelo responsável em 18/10/2026. Ele cobre layout e sessão no uso real informado, não substitui um teste de restauração do banco.

## Situação e limites

No Free, não presumir disponibilidade dos backups diários dos planos pagos. O procedimento abaixo faz uma exportação própria, somente de leitura, sem pausar o projeto e sem restaurar nada em produção. Acesso autenticado ao CLI e ao Storage precisa ser configurado pelo responsável. Nenhuma senha ou chave deve ser enviada em chat, issue, commit ou log.

`tools/operations/backup.py` exporta roles, esquema, dados, histórico de migrações, uma referência dos esquemas gerenciados auth/storage e os objetos do Storage. Faz inventário com hashes, criptografa com GnuPG/AES-256 e pede uma verificação de descriptografia. A cópia final é salva fora do repositório. O limite inicial de download de mídias é 256 MiB e uma exportação incompleta falha; ele pode ser ajustado explicitamente. O inventário conferido nesta revisão tinha 65 objetos, aproximadamente 63 MiB, mas o tamanho muda com o uso.

Arquivos SQL do banco não contêm os bytes das imagens e vídeos. Por isso o script também copia o Storage. Segredos das Edge Functions, SMTP, Firebase, chaves de assinatura dos clientes e a chave raiz de criptografia do Supabase Vault precisam de guarda separada e segura. As exportações do banco e das mídias não formam um snapshot atômico entre serviços. Planejar uma janela com pouca escrita e conferir os vínculos entre registros e objetos no ensaio. Não confundir esse pacote com um clone integral e automaticamente restaurável de toda a infraestrutura Supabase.

## Preparar no computador do responsável

Instalar Python 3, Docker Desktop, Supabase CLI e GnuPG/Gpg4win de fontes oficiais. A revisão verificou a interface do CLI 2.121.0. O CLI e o Docker precisam funcionar no terminal antes de iniciar.

Dentro do repositório:

```text
supabase login
supabase link --project-ref luoqlhgfmixvfqbfcdoc
python tools/operations/backup.py --output CAMINHO_FORA_DO_REPOSITORIO/BatCaverna-AAAA-MM-DD.tar.gz.gpg
```

O login do CLI ocorre pelo mecanismo oficial. Se ele pedir a senha do banco, informe apenas no terminal oficial. O script pede a chave administrativa do Storage com entrada oculta; ela permanece no processo local e não é incluída no inventário. A alternativa `BATCAVERNA_BACKUP_SERVICE_KEY` é destinada a um ambiente seguro já configurado, não a um arquivo versionado. Não coloque credenciais em comandos de exemplo.

O GnuPG pede uma senha de criptografia: guarde-a em um gerenciador de senhas separado do arquivo. Sem ela, a cópia não poderá ser recuperada. O script pede também a descriptografia para conferir o pacote. Só considerar a execução concluída se a saída final informar `encrypted_backup`, `sha256`, `verified_files` e `storage_objects` sem erro. Falha de download, autenticação ou integridade impede essa confirmação.

Manter a cópia criptografada fora do computador de trabalho em um destino privado escolhido pelo responsável. O script não transmite arquivos a nenhum destino de backup. Não programar execuções desassistidas antes de verificar credenciais, armazenamento, retenção e recuperação. Apagar cópias antigas de modo consistente com pedidos de exclusão; o prazo de retenção dessas cópias ainda precisa ser decidido pelo responsável e refletido no aviso público.

## Ensaio de recuperação

O workflow `Segurança e recuperação beta` usa PostgreSQL 17 em um contêiner isolado, dados sintéticos, exportação `pg_dump`, restauração em um segundo banco e repetição das verificações de permissões e bloqueios. O teste Python verifica criptografia/descriptografia e rejeição de arquivos corrompidos ou incompletos. Nenhum dado de usuário é exportado pelos testes.

A verificação do pacote também rejeita entradas duplicadas no manifesto, arquivos especiais no TAR, objetos repetidos no índice, dois objetos apontando para o mesmo arquivo, referências a SQL como mídia e arquivos de mídia ausentes do índice. Isso evita aceitar como completo um inventário internamente inconsistente. Hashes conferem integridade interna; não comprovam a origem de um pacote obtido de terceiros. Use o arquivo criptografado guardado no destino privado e confira seu hash registrado na exportação.

Isso valida o mecanismo e as migrações cobertas pelas fixtures. **Ainda é necessário fazer um backup real e ensaiar sua restauração em um ambiente Supabase de teste autorizado.** Não fazer esse ensaio em produção. Não criar um projeto ou uma branch com cobrança sem decisão do responsável.

Para uma recuperação real:

1. Registrar o incidente, identificar o último backup íntegro e preservar a produção para investigação. Desabilitar escritas, se necessário, por procedimento controlado.
2. Descriptografar em um diretório privado fora do repositório e verificar os hashes com `python tools/operations/backup.py --verify ARQUIVO_DESCRIPTOGRAFADO.tar.gz`.
3. Preparar um destino Supabase separado, compatível com PostgreSQL 17, extensões e serviços usados. Conferir previamente a configuração de Auth, SMTP, Storage, Realtime e Edge Functions.
4. Seguir o procedimento oficial de restauração para `roles.sql`, `schema.sql` e `data.sql`, com parada em erro e transação. Revisar `managed_schema.sql` para identificar as customizações próprias; não sobrescrever cegamente os esquemas gerenciados de uma instalação nova. Restaurar o histórico de migrações separadamente.
5. Se houver Vault ou colunas cifradas, seguir a instrução oficial de preservação da chave raiz antes de pausar ou excluir o projeto de origem. Não colocar essa chave no pacote compartilhado.
6. Recriar buckets com as configurações do inventário e reenviar os objetos para os nomes originais constantes em `storage-index.json`. As chaves `.bin` do pacote são nomes locais de segurança, não os nomes finais no Storage. Conferir contagem e hashes. Não tornar buckets privados públicos.
7. Reaplicar segredos pelo armazenamento seguro, conferir publicações Realtime, Auth/SMTP, políticas e regiões. Testar login, recuperação de senha, busca de pessoas, bloqueios, biblioteca, mensagens, uploads e atualizações em contas de teste.
8. Só alterar o destino dos clientes após a validação. Não restaurar sessões antigas indiscriminadamente: pedidos de exclusão e revogação posteriores ao backup precisam ser respeitados antes de reabrir acesso.

## Referências oficiais

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://www.gnupg.org/documentation/

## Pendente para fechar a recuperação

Configurar o acesso seguro do responsável, executar a primeira exportação real, definir destino/retenção privados e registrar um ensaio real de restauração autorizado. Os acessos disponíveis nesta sessão não oferecem a conexão SQL autenticada exigida pelo CLI nem a chave administrativa para exportar os objetos pelo cliente. Nenhum backup real foi declarado como concluído.

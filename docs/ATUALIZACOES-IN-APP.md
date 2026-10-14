# Atualizações in-app

## Estado atual

- **Windows:** o cliente Tauri, endpoint GitHub Releases, workflow de release por tag e geração do manifest estão implementados. A verificação é manual em **Configurações → Aplicativo**, a instalação exige confirmação e Tauri verifica a assinatura antes de executar o bundle. A publicação permanece bloqueada até que a chave pública e o secret da chave privada sejam configurados.
- **Android:** `.github/workflows/android-native.yml` compila e disponibiliza um APK de debug para validação. Não há publicação de APK de produção, feed de atualizações ou mecanismo de instalação in-app configurado. O tipo de assinatura de produção e a chave compatível com instalações existentes não estão definidos neste repositório.

Não se deve exibir um estado de atualizações ativas nem oferecer instalação antes de completar os itens de configuração abaixo.

## Windows: GitHub Releases

Configuração única antes da primeira release:

1. No diretório `desktop`, gere uma chave localmente com `npm run tauri -- signer generate -w "$HOME\.tauri\batcaverna-updater.key"`. Guarde a chave privada e a senha em um gerenciador seguro; não a envie em chat, não a versione e não a cole em logs.
2. Copie a chave pública exibida pelo comando para `plugins.updater.pubkey` em `desktop/src-tauri/tauri.conf.json`, substituindo `REPLACE_WITH_TAURI_UPDATER_PUBLIC_KEY`.
3. Cadastre `TAURI_SIGNING_PRIVATE_KEY` nos secrets do GitHub Actions com o conteúdo da chave privada ou um caminho acessível ao runner (prefira o conteúdo do secret). Cadastre `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` se a chave tiver senha. Não configure esses valores em `.env` nem no repositório.
4. Atualize as versões para a mesma versão SemVer em `desktop/package.json`, `desktop/package-lock.json`, `desktop/src-tauri/Cargo.toml` e `desktop/src-tauri/tauri.conf.json`; então crie uma tag `desktop-vX.Y.Z` correspondente. O workflow valida igualdade e exige o signing secret antes de compilar.
5. Com `createUpdaterArtifacts: true`, o Tauri assina o próprio instalador NSIS (`*-setup.exe` e `*-setup.exe.sig`). O workflow copia esses ativos e publica o manifest `latest.json` em uma GitHub Release. O endpoint HTTPS já está configurado para a release mais recente deste repositório.

O botão **Verificar atualizações** consulta o manifest; se houver uma versão nova, apresenta versão/notas e solicita confirmação. A instalação verifica novamente se aquela versão continua disponível e deixa a verificação criptográfica do bundle ao plugin Tauri. O instalador NSIS usa o modo passivo. Nenhuma release foi publicada nesta alteração.

## Android: APK direto pelo site/servidor

Antes de habilitar a atualização:

1. Definir o endereço HTTPS permanente do feed de versões e da hospedagem dos APKs. O feed precisa identificar versão/código e URL de download; nenhum endpoint de atualização existe hoje.
2. Confirmar o application ID que será distribuído. A variante debug usa o sufixo `.preview`; ela não é substituta de um APK release para os usuários de produção.
3. Confirmar que existe uma keystore de produção controlada pelo responsável pelo app e que a mesma chave pode ser usada em todas as versões futuras. Não é possível atualizar uma instalação assinada com outro certificado; perder/trocar a chave impede atualizações diretas sobre essa instalação.
4. Configurar os dados da keystore como secrets do CI e compilar APK release assinado. Publicar o APK e atualizar o feed somente após verificar a assinatura, o application ID e o incremento de `versionCode`.
5. Implementar a consulta ao feed e o fluxo de download/instalação do Android, respeitando a permissão do sistema para instalar apps desta origem e pedindo consentimento do usuário.

**Ainda necessário para concluir:** URL HTTPS do feed, decisão do pacote de produção, confirmação/acesso à keystore de produção compatível com as instalações existentes e secrets de assinatura. O workflow atual gera somente APK debug, então não há atualização direta segura que possa ser habilitada agora.

Os dois canais são independentes: publicar uma GitHub Release para Windows não disponibiliza automaticamente um APK Android. Nenhum dos fluxos deve executar migrações do Supabase durante a atualização.

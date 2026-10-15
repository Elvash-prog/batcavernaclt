# BatCaverna Android 1.0.0

Aplicativo Android TWA gerado com Bubblewrap 1.25.0 a partir do site existente.

- Pacote: `dev.gamersclt.batcaverna`
- Site: `https://batcavernaclt.gamersclt.workers.dev/`
- SDK alvo: 36; Java 17; Gradle 8.11.1; Android Gradle Plugin 8.9.1.
- Vínculo da assinatura: `public/.well-known/assetlinks.json`. Contém somente o certificado público.
- A chave privada e sua senha ficam no backup entregue ao proprietário, fora do repositório. É necessário usar a mesma chave para atualizar instalações existentes.

## Atualizações

Mudanças do site continuam pelo Cloudflare, sem recompilar o APK. Mudanças do pacote Android (ícone, permissões, versão, domínio) exigem recompilação e incremento de versionCode.

Para regenerar o projeto usando esta configuração, instale `@bubblewrap/cli@1.25.0`, copie `twa-manifest.json` para uma pasta separada e execute `bubblewrap update --skipVersionUpgrade`. A compilação/assinatura exige o backup original da chave.

A primeira versão deve ser testada em aparelho Android real: login, navegação, upload de imagens/vídeos, chat, teclado e notificações. A compilação e a assinatura não substituem esses testes.

## Atualizações dentro do APK

O APK ainda não tem verificação, download ou instalação de atualizações dentro do aplicativo. Atualizações do site aparecem normalmente na TWA; mudanças no pacote Android continuam exigindo uma nova instalação distribuída pelo canal escolhido.

Há duas configurações Android neste repositório, e elas não são intercambiáveis:

- `android/twa-manifest.json` descreve a TWA `dev.gamersclt.batcaverna` e aponta para um keystore externo ao repositório. É necessário confirmar que esse keystore original está disponível e corresponde ao APK instalado.
- `android-native` é um aplicativo separado. O workflow atual só compila `assembleDebug` e entrega `BatCaverna-Android-1.7.1-ci.apk`; o build `debug` acrescenta `.preview` ao application ID (`dev.gamersclt.batcaverna.nativeapp.preview`). Esse artefato de teste não atualiza a TWA nem uma instalação nativa de produção.

Para habilitar um updater seguro para a distribuição direta de APK, ainda são necessários: identificar qual dessas aplicações é a versão de produção que será atualizada; confirmar o application ID e o certificado de assinatura da instalação atual e recuperar o keystore original correspondente; configurar uma variante `release` assinada, com `versionCode` crescente e credenciais guardadas fora do repositório; e definir a URL HTTPS do feed de atualização e do APK no site/servidor escolhido. O Android deve validar a origem e a assinatura compatível antes de oferecer a instalação, que requer confirmação do usuário. Sem esses dados não é seguro gerar um updater, e o APK `debug` do workflow não pode servir como atualização de produção.

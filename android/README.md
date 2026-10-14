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

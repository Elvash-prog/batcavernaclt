# BatCaverna para iOS — versão 0.2.0

Aplicativo nativo SwiftUI, iOS 17+, com a paleta Caverna, cartões, resumos e organização por status do Android. Esta versão oferece login por usuário, sessão no Keychain, renovação de tokens, logout confirmado no servidor, biblioteca sincronizada de jogos e mídias, cadastro, edição e remoção de títulos, busca nos catálogos IGDB/TMDB, filtros interativos, descrições do catálogo e coleção RetroAchievements com conquistas coloridas/cinzas, mudança de status e remoção da coleção. As alterações da biblioteca verificam o proprietário e a versão original do registro para evitar sobrescrever uma edição feita em outro dispositivo.

O acesso usa a chave publicável e as mesmas permissões RLS e funções Supabase do APK. Não inclui chave privilegiada nem exceção ao HTTPS. As descrições traduzidas dependem da configuração descrita em `docs/CATALOG_TRANSLATION.md`.

## Compilação

Em um Mac com Xcode e um simulador iOS instalado:

```sh
brew install xcodegen
cd ios-native
python3 prepare-assets.py
xcodegen generate
open BatCaverna.xcodeproj
```

Escolha o esquema BatCaverna e um simulador. A ação `iOS nativo` compila e testa em macOS e guarda aplicativo de simulador, resultado dos testes e captura do login. O artefato de simulador não pode ser instalado em um iPhone.

Para um iPhone físico, configure a conta Apple e o Team em Signing & Capabilities no Xcode. A publicação via TestFlight/App Store exige a configuração da distribuição Apple; nenhum certificado ou perfil de distribuição foi criado nesta etapa.

## Próximas etapas de paridade

Ainda não inclui amigos/chat, indicações, progresso de episódios, notificações push, recuperação/cadastro de conta ou atualização via App Store. Estes fluxos precisam de implementação e testes próprios antes de chamar a versão iOS de completa. O aplicativo inicial não exibe botões para funções ausentes.

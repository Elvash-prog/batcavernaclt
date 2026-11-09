# Atualizações Android — canal oficial

Em Configurações → Atualizações, o aplicativo consulta versões, baixa com progresso e abre o instalador do Android. A consulta automática ao abrir pode ser desativada e respeita um intervalo de 30 minutos entre verificações bem-sucedidas. Falhas automáticas não interrompem a navegação.

As releases estáveis usam tags `android-vX.Y.Z`. O aplicativo ignora rascunhos e pré-lançamentos, valida o manifesto `android-update.json` e compara `versionCode` com a instalação atual. Releases Windows não são usadas como atualizações Android.

O download usa HTTPS e verifica SHA-256, pacote, versão e certificado compatível antes de abrir o instalador. A instalação depende de confirmação do Android. Quando for necessário autorizar aplicativos desta origem, volte ao aplicativo e toque em Instalar atualização após conceder a permissão.

A distribuição oficial 2.0.0 usa código 109 e mantém `dev.gamersclt.batcaverna.nativeapp.preview` e a keystore já utilizada. O identificador interno é mantido para atualizar as instalações existentes. Não troque o pacote nem a assinatura para retirar o nome `preview`.

## Publicação

O workflow `Android nativo` testa, compila e executa o lint, assina com os secrets de produção existentes e valida o APK antes de gerar o feed. O APK assinado e o manifesto são publicados na release Android; o arquivo correspondente no Drive é atualizado pelo mesmo fluxo.

Cada versão exige `versionName`, `versionCode` maior que o da anterior e `release-notes-X.Y.Z.txt`. O script `scripts/prepare-update.py` verifica o pacote e a assinatura estrutural e prepara os artefatos. As chaves permanecem fora do repositório e dos relatórios.

O Android publica com `make_latest: false`. O fluxo `Conferir downloads oficiais` verifica os arquivos e a página pública depois da publicação. Veja [a documentação de atualizações](../docs/ATUALIZACOES-IN-APP.md) e [o lançamento 2.0.0](../docs/RELEASE-2.0.0.md).

# Atualizações nos aplicativos

## Windows

O canal de produção usa releases `desktop-vX.Y.Z` com instalador NSIS, assinatura Tauri e manifesto `latest.json`. A chave pública está no cliente; a chave privada permanece nos secrets de assinatura do GitHub Actions.

Em **Configurações → Aplicativo → Verificar atualizações**, o aplicativo consulta o canal, mostra a versão e as notas e pede confirmação antes de baixar. A janela acompanha os bytes recebidos e a porcentagem quando o servidor informa o tamanho; sem tamanho conhecido, usa progresso indeterminado. Depois do download, informa a verificação e preparação do instalador. O plugin Tauri verifica a assinatura antes de instalar. A versão escolhida é reconfirmada no servidor antes de cada tentativa.

Falhas permitem tentar novamente na mesma janela. O comando nativo impede instalações concorrentes entre janelas e libera a próxima tentativa ao terminar ou falhar. A preservação protegida da sessão durante a atualização permanece em `session_persistence`; nenhuma senha é enviada ao instalador.

## Android

O aplicativo consulta as releases Android estáveis, lê `android-update.json` e compara `versionCode` com a instalação atual. A consulta automática ao abrir pode ser desativada na tela de atualizações; a verificação manual continua disponível.

O download mostra a quantidade recebida e a porcentagem quando o tamanho é conhecido. Downloads concorrentes são bloqueados, pois compartilham os arquivos temporários. Uma falha remove o arquivo incompleto e oferece nova tentativa. Antes de abrir o instalador, o cliente confere SHA-256, pacote, código de versão e certificado compatível com a instalação atual. O Android pede autorização para instalar aplicativos desta origem quando necessário; a instalação continua dependendo da confirmação do usuário no sistema.

Os APKs de produção são assinados no CI com a keystore existente. Não trocar a chave: outra assinatura impede a atualização sobre instalações anteriores. A variante de debug usa outro pacote e não substitui a instalação de produção.

## Publicação e conferência

Windows usa `make_latest: true`; Android usa `make_latest: false`, preservando o endpoint Windows `/releases/latest/download/latest.json`. O fluxo `Conferir downloads oficiais` verifica feeds, arquivos do GitHub e do Drive e o download público Windows antes de atualizar os links do site. Depois confere a página publicada e guarda a evidência. Detalhes em [tools/releases/README.md](../tools/releases/README.md).

Para uma versão Windows, manter a mesma versão em `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock` e `tauri.conf.json`, e incluir `desktop/release-notes-X.Y.Z.txt`. Uma branch `release-desktop-X.Y.Z` ou tag `desktop-vX.Y.Z` aciona o fluxo assinado. Para Android, incrementar `versionCode`, atualizar `versionName` e incluir as notas da versão antes da integração em `main`.

Esses fluxos atualizam os aplicativos e os downloads; não executam migrações do banco.

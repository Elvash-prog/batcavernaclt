# Lançamento oficial 2.0.0

O Windows e o Android passam a usar a mesma versão pública, 2.0.0. O número avança tanto o Windows 0.17.116 quanto o Android 1.7.61, permitindo que os canais existentes identifiquem o lançamento como atualização.

| Plataforma | Versão | Identificador preservado | Canal |
| --- | --- | --- | --- |
| Windows | 2.0.0 | `dev.gamersclt.batcaverna.desktop` | `desktop-v2.0.0`, `latest.json`, instalador NSIS e assinatura Tauri |
| Android | 2.0.0, código 109 | `dev.gamersclt.batcaverna.nativeapp.preview` | `android-v2.0.0`, `android-update.json`, APK com a keystore existente |

O sufixo interno `preview` do pacote Android é preservado por compatibilidade com os aplicativos instalados. Ele não define o canal público de distribuição. Alterá-lo criaria outro aplicativo e impediria a atualização direta sobre as instalações atuais.

As releases são publicadas sem rascunho e sem marca de pré-lançamento. O Windows conserva `make_latest: true`; o Android usa `make_latest: false`, preservando o endpoint do atualizador Windows. A promoção para versão oficial não altera permissões, autenticação, políticas de dados nem a lógica dos recursos.

## Verificação da entrega

A geração dos pacotes continua condicionada aos testes e verificações existentes. Windows usa assinatura Tauri; Android valida pacote, código crescente, SHA-256 e certificado. O fluxo `Conferir downloads oficiais` compara os artefatos com o Drive, confere o download público Windows e atualiza as versões e links do site após as verificações. O relatório final deve conter `site_verified: true`.

A apresentação do lançamento no site é publicada depois de ambos os canais 2.0.0 estarem disponíveis. A publicação oficial identifica a versão do projeto; as integrações continuam sujeitas à disponibilidade, privacidade e condições de cada fornecedor.

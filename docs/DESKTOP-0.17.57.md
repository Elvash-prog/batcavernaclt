# Desktop 0.17.57

Em Configurações → Aplicativo → Windows e segundo plano:

- Som de notificação, ativado por padrão. Solicita o som padrão do Windows para as notificações em segundo plano; ao desligar, o toast fica silencioso. O modo Não incomodar, volume e permissões do Windows continuam valendo.
- Iniciar com o Windows, desativado por padrão. Registra somente o usuário atual, sem administrador. Desativar remove a entrada da BatCaverna.
- Iniciar minimizado na bandeja, desativado por padrão. A janela nasce oculta, sem piscar; o ícone da bandeja abre a janela. Abrir o aplicativo novamente manualmente também o traz à frente. Uma segunda chamada automática não rouba o foco.

As escolhas são locais ao computador, preservadas entre sessões e atualizações. Não ativam inicialização automática em outros computadores da conta. Configurações antigas preservam as escolhas anteriores de notificações/segundo plano e recebem som habilitado, sem habilitar início automático ou minimizado.

Salvar aplica a entrada do Windows e o arquivo local; falha na gravação do arquivo reverte a entrada anterior. O fluxo de atualização automática preserva uma autorização existente, e o desinstalador remove a entrada ao desinstalar normalmente. Reinstalar após uma desinstalação manual pode exigir ativar novamente o início com o Windows. Uma instalação nova não cria autorização automática.

Testes: migração/serialização das preferências, comando com caminho Unicode e espaços, ida/volta no Registro em chave isolada de teste, fluxo de salvar os três controles na interface. CI Windows valida Rust, instalador NSIS e abertura real do aplicativo, incluindo início oculto e restauração por abertura manual de uma segunda instância. A execução automatizada não comprova áudio audível nem um logon real no computador do usuário; validar esses dois cenários após instalar.

## Verificação da publicação — 19/10/2026

- Fonte do instalador assinado: `b8aeaa292c864104c27fc7920c51c6f4800296c8`.
- PR 58: https://github.com/Elvash-prog/batcavernaclt/pull/58
- Publicação assinada aprovada: https://github.com/Elvash-prog/batcavernaclt/actions/runs/39218630769
- Interface/APIs e dependências aprovadas no mesmo código: `39218326362` e `39218326264`. Repetições depois das alterações de testes: `39219875649` e `39219875591`, também aprovadas.
- A execução Windows `39218326260` aprovou 29 testes Rust, a compilação NSIS e a abertura normal. O teste inicial da bandeja falhou por considerar a janela auxiliar `dev.gamersclt.batcaverna.desktop-siw` como janela principal. O teste corrigido enumera janelas nativas por processo e pelo título exato da janela principal.
- O instalador publicado foi baixado e instalado silenciosamente em Windows no CI. A execução `39220066016` foi aprovada, confirmando boot oculto e abertura manual restaurando a mesma instância. Console: `TRAY_STARTUP_OK`.
- As alterações posteriores à fonte do instalador afetam somente testes, workflow e documentação; o código do aplicativo publicado é o mesmo validado no teste de instalação real.

Release: https://github.com/Elvash-prog/batcavernaclt/releases/tag/desktop-v0.17.57

Instalador: 5.624.459 bytes; SHA-256 `031728acf0b6b98db17b0b24049a684b7aa335b0691cc5c18acf9109f308b893`.

Foram baixados EXE, `.sig` e `latest.json` publicados. A assinatura Ed25519/BLAKE2b-512, a assinatura do comentário de versão 0.17.57 e a consistência do manifesto foram verificadas com a chave pública do cliente. Bytes alterados foram rejeitados. Isso verifica integridade relativa à chave configurada, não audição física no dispositivo nem execução real no próximo logon do usuário.

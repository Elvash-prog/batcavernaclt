# Desktop 0.17.57

Em Configurações → Aplicativo → Windows e segundo plano:

- Som de notificação, ativado por padrão. Solicita o som padrão do Windows para as notificações em segundo plano; ao desligar, o toast fica silencioso. O modo Não incomodar, volume e permissões do Windows continuam valendo.
- Iniciar com o Windows, desativado por padrão. Registra somente o usuário atual, sem administrador. Desativar remove a entrada da BatCaverna.
- Iniciar minimizado na bandeja, desativado por padrão. A janela nasce oculta, sem piscar; o ícone da bandeja abre a janela. Abrir o aplicativo novamente manualmente também o traz à frente. Uma segunda chamada automática não rouba o foco.

As escolhas são locais ao computador, preservadas entre sessões e atualizações. Não ativam inicialização automática em outros computadores da conta. Configurações antigas preservam as escolhas anteriores de notificações/segundo plano e recebem som habilitado, sem habilitar início automático ou minimizado.

Salvar aplica a entrada do Windows e o arquivo local; falha na gravação do arquivo reverte a entrada anterior. O instalador preserva uma autorização existente nas atualizações e o desinstalador remove a entrada ao desinstalar normalmente. Uma instalação nova não cria autorização automática.

Testes: migração/serialização das preferências, comando com caminho Unicode e espaços, ida/volta no Registro em chave isolada de teste, fluxo de salvar os três controles na interface. CI Windows valida Rust, instalador NSIS e abertura real do aplicativo, incluindo início oculto e restauração por abertura manual de uma segunda instância. A execução automatizada não comprova áudio audível nem um logon real no computador do usuário; validar esses dois cenários após instalar.

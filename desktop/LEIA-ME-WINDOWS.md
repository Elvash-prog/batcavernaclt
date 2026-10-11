# BatCaverna CLT para Windows — 0.2.1

Aplicativo Tauri com interface própria instalada localmente. Ele não abre nem empacota o site e não depende do endereço `workers.dev`.

Esta versão corrige a exibição simultânea da tela de login e da área autenticada.

## Já funciona nesta base

- login por usuário ou e-mail diretamente no Supabase;
- renovação de sessão e opção de protegê-la no Gerenciador de Credenciais do Windows;
- painel inicial e contadores;
- bibliotecas de jogos, filmes, séries e animes;
- leitura e criação de publicações de texto;
- lista de amigos;
- central de notificações e marcar todas como lidas;
- ícone na bandeja e instalador NSIS por usuário.

O site e o APK Android permanecem separados e não são alterados pelo build desktop.

## Gerar no GitHub

Abra **Actions → Gerar programa Windows EXE → Run workflow**. Depois da execução verde, baixe o artefato **BatCaverna-CLT-Windows-EXE**.

## Gerar no Windows

Instale Node.js LTS, Rust MSVC e Visual Studio Build Tools com Desktop development with C++. Depois execute `GERAR-EXE.cmd`.

## Segurança

- somente a chave pública/publishable do Supabase fica no aplicativo;
- a `service_role` nunca deve ser adicionada ao código;
- o renderer não possui acesso direto à rede;
- tokens persistentes ficam no armazenamento seguro do Windows;
- RLS do Supabase continua protegendo todos os dados.

## Próximas etapas

- chat individual e grupos;
- criação e edição de títulos;
- progresso de episódios e estatísticas;
- notificações nativas do Windows;
- uploads moderados via Supabase Edge Function;
- updater assinado pelo GitHub Releases.

# BatCaverna CLT para Windows — 0.17.31

Aplicativo Tauri com interface própria instalada localmente. Ele não abre nem empacota o site e não depende do endereço `workers.dev`.

Esta versão inaugura a interface completa: ícone oficial, biblioteca editável, feed interativo, chat privado, busca e convites de amizade, notificações acionáveis e estatísticas.

## Já funciona nesta base

- login por usuário ou e-mail diretamente no Supabase;
- renovação de sessão e opção de protegê-la no Gerenciador de Credenciais do Windows;
- painel inicial e contadores;
- bibliotecas de jogos, filmes, séries e animes;
- cards da biblioteca e do início em formato vertical ou horizontal, com largura configurável em **Aparência → Layout**;
- leitura e criação de publicações de texto;
- lista de amigos;
- central de notificações e marcar todas como lidas;
- ícone na bandeja e instalador NSIS por usuário.
- instalador em português com identidade visual BatCaverna e atalho organizado no Menu Iniciar.

O site e o APK Android permanecem separados e não são alterados pelo build desktop.

O instalador é por usuário e não precisa de privilégios de administrador. O idioma acompanha o Windows (com português como única opção disponível), e o aplicativo fica agrupado em **BatCaverna CLT** no Menu Iniciar.

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

## Atualizações automáticas

O cliente já verifica, confirma e instala bundles assinados pelo Tauri em **Configurações → Aplicativo**. A publicação está preparada no workflow `.github/workflows/desktop-release.yml`, acionado por tags `desktop-vX.Y.Z`; cada release inclui o instalador NSIS assinado (`.exe` e `.exe.sig`) e `latest.json`.

**Antes da primeira publicação**, gere a chave de assinatura do updater, substitua a chave pública de placeholder em `src-tauri/tauri.conf.json` e salve a chave privada como secret `TAURI_SIGNING_PRIVATE_KEY` no GitHub Actions. `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` é opcional. O workflow falha explicitamente se a chave pública ainda for placeholder ou a chave privada não estiver configurada. Não perca nem compartilhe a chave privada: releases futuras precisam da mesma chave.

O feed HTTPS já aponta para `https://github.com/Elvash-prog/batcavernaclt/releases/latest/download/latest.json`. Siga [docs/ATUALIZACOES-IN-APP.md](../docs/ATUALIZACOES-IN-APP.md) para gerar e armazenar as chaves, publicar uma versão e verificar o feed. Nenhuma release é publicada por alterações comuns ou por este documento.

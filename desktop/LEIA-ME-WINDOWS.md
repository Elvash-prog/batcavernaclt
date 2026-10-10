# BatCaverna CLT para Windows — 0.1.0

Este pacote contém o código da primeira versão desktop e o processo para gerar
um instalador `.exe`. **Não contém um EXE já compilado.** A compilação nativa e
os testes com uma conta real ainda precisam ser executados no Windows.

## O que foi preparado

- Projeto independente em `desktop/`, usando Tauri 2 e instalador NSIS por usuário.
- Interface do ZIP original empacotada localmente, sem abrir o site numa janela remota.
- Janela inicial de 1360 × 860, redimensionável, com mínimo de 980 × 640.
- Tela de conexão com opção de tentar novamente quando o backend não responde.
- Mesmos serviços do Supabase e do Cloudflare; nenhuma migração de banco aplicada.
- Login protegido, catálogos, Steam e uploads encaminhados às rotas existentes por uma ponte HTTPS nativa com destino fixo.
- Menu na bandeja: abrir, ocultar e sair. O X da janela encerra o programa.
- Links HTTPS externos abertos no navegador padrão.
- Ícone existente reaproveitado no programa e no instalador.
- Opções de instalação PWA e registro de push web removidas da interface desktop.
- Site, Android e arquivos originais preservados byte a byte.

## Caminho 1 — gerar no GitHub, sem instalar ferramentas no PC

1. No repositório `Elvash-prog/batcavernaclt`, adicione a pasta `desktop/` deste pacote
   e o arquivo `.github/workflows/desktop-windows.yml`. Mantenha `public/` e
   `image-assets.js` do ZIP enviado: são a base da interface. Se a versão no GitHub
   tiver mudado, revise a diferença antes de substituir qualquer arquivo.
2. Abra **Actions → Gerar programa Windows EXE → Run workflow**.
3. Aguarde todas as etapas ficarem verdes. Falhas interrompem o processo e não
   significam que o instalador foi gerado.
4. Abra a execução e baixe o artefato **BatCaverna-CLT-Windows-EXE**.
5. Extraia o ZIP baixado. O arquivo com final **`-setup.exe`** é o instalador.

O workflow é manual, não publica releases nem faz deploy do site. Ele executa os
10 testes existentes, os testes desktop e os testes Rust antes da compilação.
Também guarda os arquivos de versões resolvidas das dependências para revisão.
O workflow foi escrito, mas não foi enviado nem executado no seu GitHub.

## Caminho 2 — gerar no próprio Windows

Preparação, uma única vez:

1. Instale Node.js LTS: https://nodejs.org/
2. Instale Visual Studio Build Tools com **Desktop development with C++** e
   Windows SDK: https://visualstudio.microsoft.com/visual-cpp-build-tools/
3. Instale Rust usando o alvo padrão MSVC: https://rustup.rs/
4. Feche e reabra os terminais; reinicie o PC se os instaladores pedirem.

Depois:

1. Extraia todo este ZIP para uma pasta comum, por exemplo `C:\BatCaverna`.
2. Abra a pasta **desktop**.
3. Dê dois cliques em **GERAR-EXE.cmd**. A primeira execução baixa dependências e
   pode demorar. Precisa de internet.
4. Ao concluir, o script abre **src-tauri\target\release\bundle\nsis**.
5. Execute o arquivo com final **`-setup.exe`** para instalar.

Se houver erro, guarde a mensagem exibida; não há instalador pronto até a
compilação terminar com sucesso. O script não instala pré-requisitos sozinho.
O instalador está configurado para obter o WebView2 caso necessário.

## Validação feita neste ambiente

- Preparação da interface desktop: passou.
- Quatro testes desktop: passaram (corpo binário dos uploads, credenciais de sessão
  nos cabeçalhos, roteamento de chamadas, cancelamento, sintaxe dos scripts e leitura
  segura da configuração pública).
- Testes existentes que passaram: account-chat, app-navigation, avatar-access,
  bright-api-security, fluid-shell e performance-client.
- Não executados por falta de dependências: features-database, features-ui,
  journey-database e journey-ui. Os pacotes jsdom e PGlite não estavam disponíveis,
  e o acesso ao registro npm retornou HTTP 403.
- Nenhum arquivo original foi alterado.
- Rust/Tauri, NSIS e execução no Windows: não testados; este ambiente não possui
  Rust, as ferramentas Windows nem acesso ao registro npm para instalá-las.
- Login real, dados remotos, envio real de arquivos, bandeja e instalação/desinstalação:
  precisam de validação depois de compilar. Nenhuma credencial foi solicitada.

## Limites desta primeira versão

- Internet necessária: autenticação, dados, catálogos e algumas fontes/bibliotecas
  externas continuam online. O aplicativo não é uma biblioteca offline.
- O Cloudflare ainda é necessário para `/config.js` e `/api/*`. Não desative o
  Worker/site nesta etapa. As chaves privadas ficam no servidor.
- Notificações estão na central interna. Toasts nativos do Windows e recebimento
  com o aplicativo encerrado ainda não foram implementados.
- Atualização automática ainda não está implementada; nesta fase, distribua um
  novo instalador, incrementando as versões em package.json, Cargo.toml e
  tauri.conf.json. Uma próxima etapa deve adicionar assinatura e updater.
- O instalador não tem certificado de assinatura de código configurado.
- Recuperação de senha e confirmação de e-mail continuam abrindo o site no
  navegador. Após concluir, entre novamente no programa. Deep links ficam para
  uma próxima etapa. Não há integração OAuth desktop nova.
- Uma sessão já aberta no navegador não é transferida automaticamente: faça login
  no programa. A persistência de sessão segue o armazenamento da interface original.
- Limite da ponte: até 26 MiB por envio. O servidor pode impor limites menores.
- Dependências usam faixas de versão compatíveis nesta base inicial. Antes de
  publicar a primeira release, revise e versione package-lock.json e Cargo.lock
  gerados na compilação bem-sucedida.

## Antes de distribuir para outros usuários

No Windows, confira instalação, abertura, login, logout, reabertura com sessão,
catálogos, chat, perfis, uploads, recuperação de senha, bandeja e desinstalação.
Teste também queda de internet e o funcionamento do backend sem alterar RLS.
As pendências de migrações e funcionalidades do contexto original não foram
tratadas nem consideradas resolvidas por esta adaptação.

## Arquivos novos

- `desktop/src/`: inicialização e ponte JavaScript.
- `desktop/scripts/`: preparação e testes da adaptação.
- `desktop/src-tauri/`: código Rust, configuração, permissões e ícones.
- `desktop/GERAR-EXE.cmd`: compilação local no Windows.
- `.github/workflows/desktop-windows.yml`: compilação manual no GitHub.

Referências técnicas:
https://v2.tauri.app/distribute/windows-installer/
https://v2.tauri.app/develop/calling-rust/
https://v2.tauri.app/start/prerequisites/

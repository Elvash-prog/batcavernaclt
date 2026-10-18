# BatCaverna CLT

Aplicativo para organizar jogos, filmes, séries e animes, acompanhar progresso e compartilhar indicações com amigos. Disponível para Windows e Android, com dados da conta sincronizados pelo Supabase.

## Downloads

| Plataforma | Versão publicada | Download |
| --- | --- | --- |
| Windows | 0.17.54 | [Instalador Windows](https://github.com/Elvash-prog/batcavernaclt/releases/latest/download/BatCaverna-CLT-Windows-setup.exe) |
| Android | 1.7.17 | [APK Android](https://github.com/Elvash-prog/batcavernaclt/releases/download/android-v1.7.17/BatCaverna-1.7.17.apk) |

Android 6.0 ou superior. No Android, pode ser necessário autorizar a instalação do APK pelo navegador. Os aplicativos têm avisos de atualização; o Windows verifica pacotes assinados.

Consulte o [histórico de versões](https://github.com/Elvash-prog/batcavernaclt/releases) para notas de atualização e arquivos publicados.

## Recursos

- Biblioteca de jogos, filmes, séries e animes com categorias, listas, notas e status.
- Integrações com Steam e RetroAchievements para acompanhar os dados disponíveis de progresso e conquistas.
- Comunidade com publicações, imagens, curtidas e comentários.
- Amigos, mensagens privadas, grupos e indicações com busca e filtros por categoria.
- No Windows, detecção de jogos configurados pelo executável e registro de tempo enquanto o aplicativo estiver aberto.
- Personalização da interface e acesso à coleção pela mesma conta no Windows e no Android.

A sincronização depende da privacidade do perfil e dos dados disponibilizados pelos serviços vinculados. Detectar um executável permite registrar tempo; conquistas precisam de uma integração compatível. O BatCaverna organiza a coleção e não distribui jogos, filmes ou outros conteúdos.

## Site de apresentação

O [site público](https://batcavernaclt.gamersclt.workers.dev/) apresenta o programa, explica seus recursos e oferece downloads. O acesso à conta e às funções do produto acontece nos aplicativos.

A versão publicada pelo Sites pode ser consultada [neste endereço](https://batcaverna-clt-apresentacao.el-vash.chatgpt.site). As alterações no Sites não são sincronizadas automaticamente com este repositório.

## Estrutura do projeto

| Caminho | Responsabilidade |
| --- | --- |
| `desktop/` | Aplicativo Windows com Tauri e interface própria |
| `android-native/` | Aplicativo Android nativo |
| `supabase/functions/` | Funções de backend e integrações |
| `supabase/migrations/` | Migrações do banco de dados |
| `public/index.html` | Página pública de apresentação e downloads |
| `public/marketing/` | Estilos, imagens e script da apresentação |
| `worker.js` | Entrega da página e bloqueio dos antigos endpoints web |
| `tests/` | Verificações de backend e dependências dos aplicativos |
| `docs/` | Documentação técnica e notas de versões |

Os aplicativos acessam o Supabase diretamente e não dependem da hospedagem do site. O Worker permite somente a página pública e seus assets; as antigas rotas de configuração, login, APIs e scripts web retornam HTTP 410.

## Implantação no Cloudflare

No projeto **Workers & Pages → batcavernaclt → Settings → Builds**, conecte este repositório com:

- Branch de produção: `main`.
- Diretório raiz: raiz do repositório (`/`).
- Comando de build: vazio; a apresentação não precisa de compilação.
- Comando de deploy: `npx wrangler@4 deploy`.

O `wrangler.toml` define o Worker `batcavernaclt`, o entrypoint `worker.js` e os arquivos estáticos de `public/`. Depois de configurar a integração, pushes na branch de produção acionam a publicação. Confira o resultado do deploy no painel antes de considerar o endereço atualizado.

## Validação

Na raiz do repositório:

```bash
node tests/native-dependencies.mjs
node tests/igdb.mjs
node tests/native-api.mjs
node tests/bright-api-security.mjs
```

A interface Windows tem verificações adicionais em `desktop/` e os builds Windows e Android são executados pelos workflows de `.github/workflows/`.

## Integrações e uso comercial

Os catálogos e integrações incluem IGDB, TMDB, AniList, Steam e RetroAchievements. As marcas pertencem aos respectivos titulares; o projeto é independente e não implica afiliação ou endosso. Consulte [a documentação de APIs e uso comercial](docs/API-COMMERCIAL.md) antes de distribuir uma oferta comercial: disponibilidade de uma API não substitui a licença exigida por cada fornecedor.

## Problemas e sugestões

Use as [issues do GitHub](https://github.com/Elvash-prog/batcavernaclt/issues) para relatar problemas. Inclua a versão, a plataforma e os passos para reproduzir, sem publicar senhas, tokens ou dados pessoais.

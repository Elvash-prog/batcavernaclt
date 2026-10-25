[← Voltar à apresentação](../README.md)

# Desenvolvimento e operação

| Caminho | Responsabilidade |
| --- | --- |
| `desktop/` | Aplicativo Windows com Tauri e interface própria |
| `android-native/` | Aplicativo Android nativo |
| `ios-native/` | Versão inicial iOS com SwiftUI |
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

## Segurança

Consulte a [avaliação de segurança](PENTEST-2026-10-18.md), as [correções complementares verificadas](SECURITY-FOLLOWUP-2026-10-18.md) e o [procedimento de recuperação](RECOVERY.md). Os documentos registram o escopo e as limitações de cada verificação; consulte também o procedimento de recuperação para os cuidados com backup e restauração.

## Integrações e uso comercial

Os catálogos e integrações incluem IGDB, TMDB, AniList, Steam e RetroAchievements. As marcas pertencem aos respectivos titulares; o projeto é independente e não implica afiliação ou endosso. Consulte [a documentação de APIs e uso comercial](API-COMMERCIAL.md) antes de distribuir uma oferta comercial: disponibilidade de uma API não substitui a licença exigida por cada fornecedor.

## Problemas e sugestões

Use as [issues do GitHub](https://github.com/Elvash-prog/batcavernaclt/issues) para relatar problemas. Inclua a versão, a plataforma e os passos para reproduzir, sem publicar senhas, tokens ou dados pessoais.

## Capturas de apresentação

O workflow **Capturas de apresentação** pode ser executado manualmente no GitHub Actions. Ele compila a interface atual e executa `tools/presentation/screenshots.mjs`, que usa uma ponte isolada com dados de demonstração, sem conta real ou credenciais de backend.

As imagens ficam no artefato `BatCaverna-apresentacao`. As capas da coleção ilustrativa são obtidas nos endereços públicos de imagens da Steam. Depois de revisar as capturas, atualize os arquivos otimizados em `docs/images/` e mantenha no README a identificação de que os dados são demonstrativos.

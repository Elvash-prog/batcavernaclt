# BatCaverna dos CLTs — Patch 1.20

Base importada do projeto publicado no Sites, conectada ao Supabase existente.

## Publicação automática no Cloudflare

No Worker `batcavernaclt`, abra **Settings → Builds → Connect** e conecte este repositório.

- Branch de produção: `main`
- Diretório raiz: `/`
- Comando de build: vazio (site sem compilação)
- Comando de deploy: `npx wrangler@4 deploy`

Cada push em `main` aciona uma publicação após a conexão ser ativada.
O nome do Worker deve corresponder a `name` em `wrangler.toml`.

## Arquivos

- `public/index.html`: interface e aplicação.
- `public/sw.js`: service worker.
- `public/manifest.webmanifest`: configuração PWA.
- `worker.js`: rotas e entrega de imagens.
- `image-assets.js`: ícones PNG originais codificados em base64, servidos pelo Worker nos mesmos caminhos.

As imagens são armazenadas como texto para permitir o envio pela integração GitHub disponível. O navegador recebe os bytes PNG originais.

As atualizações no Sites não são sincronizadas automaticamente com este repositório. Envie a versão desejada para `main` para publicar no Cloudflare.

## Aplicativo para Windows

A versão `0.17.2` amplia a área útil do perfil, evita cortes na progressão e nas abas e reorganiza o cartão do perfil em telas estreitas. Os jogos em destaque passam a aproveitar melhor a largura disponível.

O aplicativo verifica atualizações assinadas em **Configurações → Aplicativo → Verificar atualizações**. As versões do Windows são distribuídas pelas [releases do GitHub](https://github.com/Elvash-prog/batcavernaclt/releases).

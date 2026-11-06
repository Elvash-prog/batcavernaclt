# Revisão das integrações e permissões — 6 de novembro de 2026

Escopo: código e documentação do projeto, com base em `483f613a8acfb78e2e48e76c73769273e3cf6166`. O texto da resposta da Steam foi apresentado pelo responsável nesta revisão; as respostas integrais dos demais fornecedores não foram consultadas. Os registros estão em [API-COMMERCIAL.md](API-COMMERCIAL.md). Este documento não constitui nova autorização de nenhum fornecedor.

## Correções realizadas

O aviso de privacidade e os créditos do Windows e Android ainda apresentavam Sightengine como serviço ativo, embora sua integração de classificação de mídia tenha sido retirada. A referência foi removida. O aviso agora identifica DeepL (tradução de descrições públicas) e SteamGridDB (busca de artes por título/App ID), e os créditos incluem SteamGridDB. Login, permissões e validação de arquivos não foram alterados.

## Condições registradas e pendências

- **IGDB:** há registro de autorização informada pelo responsável em 29/10. Preservar a resposta original e conferir suas condições particulares; isso não transfere direitos sobre imagens de terceiros.
- **Steam:** o texto apresentado confirma expressamente que esse tipo de aplicativo pode ser desenvolvido sob os termos da Web API, com limites firmes e respeito à privacidade dos perfis. A ressalva sobre scraping prevê possível bloqueio se houver prejuízo à plataforma; não concede autorização adicional para essa prática. Os endpoints de metadados da loja foram retirados; biblioteca, presença e conquistas permanecem. Há controle compartilhado de orçamento e tratamento de limites. A política informa Brasil para o banco e Estados Unidos para B2; a localização física das cópias no Drive continua sem confirmação.
- **RetroAchievements:** a resposta registrada é favorável à integração, condicionada a não guardar lógica de conquistas de emuladores e a respeitar limites variáveis. As rotas revisadas selecionam campos de apresentação e o controle de requisições trata recusas e cooldown. Isso não comprova licença comercial irrestrita.
- **AniList:** o inventário ainda não registra autorização específica para o caso de listas/acompanhamento de animes. A gratuidade por receita não resolve, por si só, a restrição a serviços concorrentes descrita nos termos. Conferir eventual resposta recebida antes de considerar a pendência resolvida.
- **TMDB:** manter logo e aviso de ausência de endosso. Reavaliar licença se houver monetização.
- **DeepL e SteamGridDB:** incluídos no inventário; manter atribuição aplicável e avaliar condições do plano e direitos das imagens. Sua inclusão nos créditos não equivale a autorização comercial.

Referências: [Steam](https://steamcommunity.com/dev/apiterms), [IGDB](https://api-docs.igdb.com/#business-related-faq), [AniList](https://docs.anilist.co/guide/terms-of-use), [TMDB](https://developer.themoviedb.org/docs/faq), [RetroAchievements](https://api-docs.retroachievements.org/), [DeepL](https://www.deepl.com/en/pro-license), [SteamGridDB](https://www.steamgriddb.com/terms).

## Verificação

A suíte desktop e os testes de segurança de requisições, limites de login, Edge/native API e bright-api passaram nesta revisão. Após as alterações, passaram também os sete testes do controlador de requisições, os testes IGDB e o teste visual do aviso de privacidade em desktop e celular. A sintaxe do JavaScript e `git diff --check` passaram. A alteração Android é textual; não foi gerado nem validado um novo APK nesta etapa.

Os testes não comprovam cumprimento de condições particulares ausentes dos documentos, nem ausência de todos os erros do projeto. Estas alterações estão no workspace; este relatório não atesta publicação no site, Drive ou aplicativos.

## Publicação posterior à revisão — 6 de novembro de 2026

O [PR 178](https://github.com/Elvash-prog/batcavernaclt/pull/178) integrou as correções de créditos e privacidade, os refinamentos visuais da biblioteca/navegação e o menu Windows compacto opcional. Todas as validações do PR passaram, incluindo compilação/testes Windows reais, Android e capturas dos componentes nativos.

- Windows **0.17.100**: [release assinada](https://github.com/Elvash-prog/batcavernaclt/releases/tag/desktop-v0.17.100), com instalador, assinatura e manifesto do atualizador. [Fluxo 42221115436](https://github.com/Elvash-prog/batcavernaclt/actions/runs/42221115436) aprovado, inclusive envio ao Google Drive. A árvore de código dessa release corresponde à do commit integrado `7964bb0a961a2dda4618f8dd0baf778a7e19d1b1`.
- Android **1.7.47 (94)**: [release assinada](https://github.com/Elvash-prog/batcavernaclt/releases/tag/android-v1.7.47). [Fluxo 42222356326](https://github.com/Elvash-prog/batcavernaclt/actions/runs/42222356326) aprovado, incluindo testes, lint, assinatura, feed e envio ao Google Drive.

O aviso de privacidade foi implantado no site após a integração do PR. A atualização dos links/versões da página de downloads acompanha este registro. A localização física do Drive permanece sem confirmação, conforme decisão de manter esse destino sem presumir um país.

# Créditos e preparação para uso comercial

Revisão: 6 de novembro de 2026. Os créditos ficam em Configurações → Créditos e serviços, no Windows e no Android. Eles identificam os fornecedores; não representam autorização comercial nem transferem direitos de imagens.

| Serviço | Exigência / próximo passo |
|---|---|
| IGDB | O responsável informou em 29/10/2026 que recebeu autorização de uso da IGDB. Guardar o e-mail e cumprir as condições recebidas, incluindo a atribuição aplicável. Este registro não amplia o escopo da autorização além da resposta recebida. https://api-docs.igdb.com/#business-related-faq |
| TMDB | Obter licença comercial antes de monetizar. Informar que o projeto é brasileiro. O app inclui o logo oficial sem alterações e o aviso obrigatório: “This product uses the TMDB API but is not endorsed or certified by TMDB.” https://developer.themoviedb.org/docs/faq |
| AniList | Há gratuidade comercial abaixo de US$150/mês de receita, mas a restrição a serviços concorrentes de listas e acompanhamento também se aplica, independentemente da receita. A BatCaverna organiza animes: pedir autorização expressa para esse caso a contact@anilist.co e esclarecer o enquadramento no limite. https://docs.anilist.co/guide/terms-of-use |
| RetroAchievements | Confirmar com a equipe se a integração, dados e imagens podem integrar o produto comercial. A documentação técnica consultada não comprova uma licença comercial. https://api-docs.retroachievements.org/ |
| Steam | Cumprir os termos da Web API: chave confidencial, uso solicitado pelo usuário, política de privacidade com os dados armazenados e países de armazenamento, ausência de endosso e dados sem garantia. https://steamcommunity.com/dev/apiterms |
| Supabase e Firebase | Conferir contratos, limites do plano contratado, tratamento e retenção dos dados, subprocessadores e transferências internacionais. O plano gratuito não comprova autorização sobre conteúdo de terceiros. https://supabase.com/terms — https://firebase.google.com/terms |

## Informações a enviar aos fornecedores

Nome e responsável pelo produto; descrição e capturas; plataformas Windows e Android; público e países atendidos; monetização prevista (venda, assinatura, publicidade ou doações); receita e volume de usuários estimados; campos e imagens usados; frequência e cache; local dos créditos; contato do responsável e política de privacidade. Não enviar chaves ou segredos.

## Pendências antes de monetizar

Guardar as autorizações comerciais e licenças no controle do responsável; publicar política de privacidade com identidade e contato do controlador, finalidades, fornecedores, países reais de armazenamento, retenção, exclusão de conta e direitos dos titulares; disponibilizar termos e canal para remoção de conteúdo protegido. Conferir contratos diretamente com cada fornecedor antes do lançamento comercial. Nenhuma autorização externa foi solicitada automaticamente.

## Atualização de 29 de outubro de 2026 — Steam e RetroAchievements

O responsável forneceu respostas de Steam Support e RAAdmin favoráveis à integração de acompanhamento, com condições. RAAdmin destacou não guardar em cache a lógica de conquistas executada pelos emuladores e informou que o limite da API é dinâmico. Steam Support remeteu aos termos da Web API, às cotas e à privacidade; informou que scraping de metadados da loja não está coberto por esses termos. Essas respostas não estabelecem, por si só, autorização específica para metadados JSON da loja, monetização ou todos os direitos de imagens.

A revisão e as correções técnicas estão documentadas em [Provider API controls](PROVIDER-API-CONTROLS.md) e [Revisão Steam/Retro](REVISAO-APIS-STEAM-RETRO-2026-10-29.md). Por decisão posterior do responsável, os endpoints JSON da loja e a descoberta de jogos grátis foram removidos. As versões novas usam IGDB para metadados e associação do App ID, preservando a Steam Web API para biblioteca, presença e conquistas. Não dependem mais de confirmação específica dos endpoints da loja. O banco principal foi confirmado em São Paulo; a localização física das cópias criptografadas do Google Drive continua sem confirmação. A segunda cópia B2 foi confirmada em 29/10/2026 na região `us-east-005`, nos Estados Unidos; checksum e download foram conferidos, mas a restauração desta cópia ainda está pendente.

## Atualização de 6 de novembro de 2026 — inventário de fornecedores

O Sightengine foi retirado do envio de mídia por decisão do responsável. Não é mais um serviço ativo de classificação automática; login, permissões e validações de arquivo continuam aplicáveis. Os créditos e o aviso de privacidade foram corrigidos para refletir essa retirada.

DeepL traduz descrições públicas do catálogo, com atribuição ao serviço. SteamGridDB fornece artes pesquisadas por título ou App ID. Ambos devem integrar o inventário de fornecedores e a revisão das condições de uso; atribuição não transfere os direitos de imagens. Consultar https://www.deepl.com/en/pro-license e https://www.steamgriddb.com/terms.

A autorização específica para a integração de acompanhamento de animes com AniList continua sem comprovação neste documento. Os registros de IGDB e RetroAchievements acima resumem respostas anteriores; o texto integral dessas respostas é necessário para confirmar outras condições particulares. O texto da Steam foi fornecido novamente pelo responsável em 6/11/2026, conforme registro abaixo.

## Resposta da Steam apresentada em 6 de novembro de 2026

O responsável apresentou o texto da resposta de Steam Support, assinada por Tavish. A data original do e-mail não foi informada. O suporte afirma expressamente que o responsável pode desenvolver esse tipo de aplicativo e que seu uso estará sujeito aos [termos da Steam Web API](https://steamcommunity.com/dev/apiterms). A resposta destaca limites firmes de requisições e a disponibilidade reduzida de dados devido às configurações de privacidade dos perfis.

O suporte também esclarece que scraping de metadados da loja não está coberto pelos termos da API e pode ser bloqueado unilateralmente se prejudicar a plataforma. Isso não é uma proibição geral de desenvolver o aplicativo nem uma autorização adicional para scraping. A decisão já implementada de retirar a consulta de metadados da loja e manter a Web API oficial para biblioteca, presença e conquistas é compatível com essa orientação. Perfis privados e respostas limitadas devem ser respeitados sem tentativas de contornar a privacidade.

Essa resposta confirma a permissão para desenvolver o aplicativo sob os termos citados. Ela não informa países de armazenamento de backups, não concede acesso a perfis privados e não substitui as condições dos demais fornecedores.

# Créditos e preparação para uso comercial

Revisão: 17 de outubro de 2026. Os créditos ficam em Configurações → Créditos e serviços, no Windows e no Android. Eles identificam os fornecedores; não representam autorização comercial nem transferem direitos de imagens.

| Serviço | Exigência / próximo passo |
|---|---|
| IGDB | O responsável informou em 29/10/2026 que recebeu autorização de uso da IGDB. Guardar o e-mail e cumprir as condições recebidas, incluindo a atribuição aplicável. Este registro não amplia o escopo da autorização além da resposta recebida. https://api-docs.igdb.com/#business-related-faq |
| TMDB | Obter licença comercial antes de monetizar. Informar que o projeto é brasileiro. O app inclui o logo oficial sem alterações e o aviso obrigatório: “This product uses the TMDB API but is not endorsed or certified by TMDB.” https://developer.themoviedb.org/docs/faq |
| AniList | Há gratuidade comercial abaixo de US$150/mês de receita, mas a restrição a serviços concorrentes de listas e acompanhamento também se aplica, independentemente da receita. A BatCaverna organiza animes: pedir autorização expressa para esse caso a contact@anilist.co e esclarecer o enquadramento no limite. https://docs.anilist.co/guide/terms-of-use |
| RetroAchievements | Confirmar com a equipe se a integração, dados e imagens podem integrar o produto comercial. A documentação técnica consultada não comprova uma licença comercial. https://api-docs.retroachievements.org/ |
| Steam | Cumprir os termos da Web API: chave confidencial, uso solicitado pelo usuário, política de privacidade com os dados armazenados e países de armazenamento, ausência de endosso e dados sem garantia. https://steamcommunity.com/dev/apiterms |
| Supabase, Firebase e Sightengine | Conferir contratos, limites do plano contratado, tratamento e retenção dos dados, subprocessadores e transferências internacionais. O plano gratuito não comprova autorização sobre conteúdo de terceiros. https://supabase.com/terms — https://firebase.google.com/terms — https://sightengine.com/terms |

## Informações a enviar aos fornecedores

Nome e responsável pelo produto; descrição e capturas; plataformas Windows e Android; público e países atendidos; monetização prevista (venda, assinatura, publicidade ou doações); receita e volume de usuários estimados; campos e imagens usados; frequência e cache; local dos créditos; contato do responsável e política de privacidade. Não enviar chaves ou segredos.

## Pendências antes de monetizar

Guardar as autorizações comerciais e licenças no controle do responsável; publicar política de privacidade com identidade e contato do controlador, finalidades, fornecedores, países reais de armazenamento, retenção, exclusão de conta e direitos dos titulares; disponibilizar termos e canal para remoção de conteúdo protegido. Conferir contratos diretamente com cada fornecedor antes do lançamento comercial. Nenhuma autorização externa foi solicitada automaticamente.

## Atualização de 29 de outubro de 2026 — Steam e RetroAchievements

O responsável forneceu respostas de Steam Support e RAAdmin favoráveis à integração de acompanhamento, com condições. RAAdmin destacou não guardar em cache a lógica de conquistas executada pelos emuladores e informou que o limite da API é dinâmico. Steam Support remeteu aos termos da Web API, às cotas e à privacidade; informou que scraping de metadados da loja não está coberto por esses termos. Essas respostas não estabelecem, por si só, autorização específica para metadados JSON da loja, monetização ou todos os direitos de imagens.

A revisão e as correções técnicas estão documentadas em [Provider API controls](PROVIDER-API-CONTROLS.md) e [Revisão Steam/Retro](REVISAO-APIS-STEAM-RETRO-2026-10-29.md). Por decisão posterior do responsável, os endpoints JSON da loja e a descoberta de jogos grátis foram removidos. As versões novas usam IGDB para metadados e associação do App ID, preservando a Steam Web API para biblioteca, presença e conquistas. Não dependem mais de confirmação específica dos endpoints da loja. O banco principal foi confirmado em São Paulo; a localização física das cópias criptografadas do Google Drive continua sem confirmação.

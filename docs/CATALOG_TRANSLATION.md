# Descrições em português do Brasil

O backend prioriza a descrição pt-BR do TMDB. Quando ela não existe, consulta a versão inglesa e tenta traduzi-la. Descrições IGDB são traduzidas ao abrir detalhes, não a cada resultado de busca. As bibliotecas existentes também consultam o catálogo ao abrir detalhes: não é necessário apagar e adicionar novamente.

A tradução usa a API oficial **DeepL API Free**, exclusivamente no Supabase. Para ativar:

1. Crie uma conta DeepL API Free, separada da assinatura comum do tradutor.
2. No projeto Supabase, abra **Edge Functions → Secrets**.
3. Adicione `DEEPL_API_KEY` com a chave dessa conta. Não cole a chave no chat, no código ou em aplicativos.
4. Publique a função `native-api` com os arquivos desta alteração.
5. Abra um jogo com descrição inglesa em cada aplicativo e confira o resultado. Consultar o mesmo texto em outro dispositivo deve reutilizar o cache.

O endpoint está fixado em `https://api-free.deepl.com/v2/translate`; ele não muda automaticamente para um plano pago. A franquia e os termos devem ser conferidos no painel DeepL. Na documentação consultada em 24/10/2026, o plano Free permite 500.000 caracteres/mês.

Somente descrições públicas buscadas do catálogo são enviadas ao tradutor. Senhas, conversas, avaliações pessoais, anotações e dados da conta não são enviados. Não existe endpoint que aceite texto arbitrário do cliente para tradução.

As traduções são reutilizadas por 7 dias no cache de catálogo existente, com chave derivada do hash do conteúdo e idioma; alterações no texto original geram uma nova chave. Chamadas simultâneas compartilham a solicitação. O acesso ao catálogo continua exigindo autenticação e o limitador distribuído existente. Textos acima de 16.000 caracteres não são enviados.

Se a chave estiver ausente, a franquia acabar ou o serviço falhar, o aplicativo preserva a descrição original. Não se deve afirmar que a tradução está ativa antes de configurar e testar uma chave real. Descrições Steam já localizadas são mantidas; quando houver tradução IGDB pt-BR, o desktop a utiliza com os demais dados da Steam.

Referências: https://developers.deepl.com/api-reference/translate/request-translation e https://support.deepl.com/hc/pt-br/articles/360021200939-Planos-da-API-do-DeepL

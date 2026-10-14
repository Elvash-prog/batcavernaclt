# Patch 1.42 — zoom, figurinhas e reações

- Foto e capa permitem zoom de 25% a 250%. A posição e o zoom da capa são preservados. O recorte da foto existente resolve a URL privada antes de editar.
- Figurinhas são salvas por conta no Supabase, disponíveis no desktop e mobile. PNG, JPG e WebP, até 5 MB por arquivo e 60 por conta. As imagens passam pela moderação existente antes de gravar os metadados; buckets permanecem privados.
- Ao abrir o menu, as figurinhas antigas deste aparelho são migradas. Só remove a cópia local após confirmação do banco; uma falha mantém a original e mostra o erro. Imagens da conta são baixadas sob demanda ao selecionar para envio.
- Reações são compartilhadas nas conversas privadas e de grupo. Mostram quantidade e destacam a reação do usuário. Reações antigas locais migram ao abrir a conversa, preservando mensagens fixadas. Atualização automática a cada 5 segundos apenas com a conversa aberta e a página visível. Sem novos canais públicos de eventos de exclusão.
- Trocas de conta/conversa descartam respostas pendentes de outra sessão. Exclusão de mensagem remove suas reações por chave estrangeira.

## Ativação

Execute `supabase/patch-1.42-conta-chat.sql` inteiro no SQL Editor do Supabase como administrador. O script é transacional e pode ser reaplicado. A consulta final deve retornar `true` nas três colunas. Depois recarregue o site nos dispositivos.

Sem o SQL, o zoom funciona; os botões de reação e sincronização apresentam erro informando a pendência. As figurinhas antigas não são apagadas.

## Verificação

`node tests/account-chat.mjs`, `node tests/performance-client.mjs`, `node tests/avatar-access.mjs`. Todos os scripts inline passam por análise de sintaxe; SQL analisado com pglast. Testes de cliente e acesso de mídia usam mocks. Sem acesso administrativo ao banco nem navegador de testes nesta sessão: executar o SQL e verificar entre duas contas ainda depende do ambiente real.

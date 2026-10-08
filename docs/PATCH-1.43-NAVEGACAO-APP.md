# Patch 1.43 — navegação mobile

Botão Voltar do Android/gesto do navegador usa o histórico para fechar janelas e retornar da conversa à lista de chats, depois à tela inicial. Perfil, amigos e demais abas retornam à tela inicial da própria conta. O Voltar na tela inicial continua permitindo sair do aplicativo. Fechar uma janela por um botão também remove o nível do histórico, evitando cliques repetidos. Confirmações são canceladas, nunca confirmadas pelo Voltar. Desktop preserva seu histórico.

O script acompanha somente atributos dos contêineres de navegação; não observa a árvore inteira, não guarda conteúdo de conversas e não escreve no histórico a cada tecla.

Ativo no site e no APK TWA existente, sem novo SQL ou necessidade de reinstalação para a navegação. Feche e reabra o aplicativo para carregar o novo documento. A imagem personalizada do logo precisa do arquivo original para atualizar o ícone do APK; ela não está na configuração pública global.

Verificação: 9 testes de navegação em VM, além dos 44 testes locais anteriores. Teste de botão/gesto em aparelho real permanece necessário.

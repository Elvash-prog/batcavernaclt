# Conversas e envios no Windows 2.1.14

A troca de conversa prepara mensagens, grupos, membros e leitura em paralelo. O painel novo só substitui o anterior após essa preparação. A lista de contatos é preservada, incluindo pesquisa, rolagem e imagens quando os contatos não mudaram. Durante a leitura, a conversa antiga fica sem interação, mas a lista permite escolher outro destino. A transição de 220 ms usa somente o painel da conversa; não há captura de tela pelo View Transitions. As preferências de reduzir movimento continuam válidas.

Cada renderização e leitura identifica conta, destino, tipo privado/grupo, geração e painel. Uma leitura pendente de A não bloqueia B; sua resposta não pode atualizar B. Consultas repetidas da mesma conversa são agrupadas. As reações são carregadas depois da primeira apresentação e aplicadas somente ao contexto ainda atual.

O envio cria imediatamente uma mensagem local com o mesmo UUID utilizado pelo contrato de envio idempotente. Ela informa envio, upload, falha ou confirmação. O histórico remoto e a saída local são reconciliados por ID. Uma leitura iniciada antes da confirmação não remove a mensagem local. A saída é mantida na memória da sessão até a observação do ID remoto; não é uma fila persistente nem reenvia mensagens automaticamente. Falhas mantêm o rascunho e oferecem nova tentativa. A nova tentativa usa o mesmo ID e reutiliza a mídia enviada. Figurinhas usam o mesmo mecanismo sem limpar o texto do compositor.

Confirmações de envio conferem a revisão do rascunho. Uma confirmação antiga não limpa texto digitado depois de sair e voltar à conversa. Cada escrita depois de uma operação assíncrona confere novamente a conta. Logout invalida leituras e limpa tentativas, saída local e posições da sessão. Nenhuma permissão, política de banco ou função de backend foi modificada.

O histórico usa reconciliação por chave de mensagem/dia. Mensagens inalteradas mantêm os nós; recibos e reações atualizam somente seus trechos. Imagens com a mesma mídia não são buscadas novamente e menus permanecem abertos durante atualizações; escolher responder, editar ou reagir fecha o menu. A rolagem usa a primeira mensagem visível como âncora, ou acompanha o final quando o usuário já está nele. Ao abrir uma conversa que estava no final, novas mensagens não lidas têm prioridade sobre a posição salva. Inserir o próprio envio leva ao final; a confirmação posterior preserva a posição atual. Rascunhos continuam no armazenamento local por conta e destino.

Validação: `npm test` cobre identidade de tentativa, conciliação com confirmação remota, estados locais e separação de conta/tipo/destino. `npm run test:ui` inclui mensagens e figurinhas imediatas, resposta perdida antes/depois da gravação, uma leitura antiga após confirmação, estabilidade de imagem/menu/rolagem, troca rápida entre contatos com resposta fora de ordem, reações demoradas, rascunhos, confirmação tardia, grupos e logout. A suíte também cobre os fluxos existentes, seis temas e resoluções HD, Full HD e QHD com APIs simuladas. A publicação repete as verificações no Windows e os testes Rust.

Android permanece em 2.1.8 (117).

## Windows 2.1.16

O compositor libera o campo de texto durante um envio, mantendo um envio por formulário em andamento. O envio limpa a prévia do compositor sem remover o rascunho persistido antes da confirmação. Digitar incrementa a revisão e mantém o novo texto protegido da confirmação anterior. Uma falha restaura texto, resposta e anexo quando a revisão não mudou; caso contrário, a mensagem com falha continua disponível no histórico para reenvio. A saída permanece em memória, sem reenvio automático.

Os formatadores de dia, horário e data completa são criados uma vez. A reconciliação compara a marcação desejada por mensagem e retorna os nós novos/modificados para hidratação e eventos. Mensagens inalteradas não recebem mutações nem reinstalação de manipuladores. Uma atualização idêntica também evita capturar medidas de rolagem. A transição de conversa usa 140 ms e deslocamento de 2 px, mantendo as preferências de reduzir movimento.

A preferência de fonte usa famílias locais de uma lista permitida, separada por conta e aparelho. Não altera o serviço de sincronização de layout ou o backend.

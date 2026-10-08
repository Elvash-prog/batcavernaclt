# Patch 1.44 — fluidez no aplicativo

A central gerava seu próprio X além do controle padrão do modal. Agora há apenas o controle padrão, preservando os handlers de fechar e Voltar.

Cards e gráficos não repetem animações de entrada a cada reconstrução. Retirados o véu fixo de tela inteira e os desfoques dos overlays e barras fixas, preservando layout, cores e fundos personalizados. Entrada de painéis usa apenas opacidade por 140ms; respeita redução de movimento e opção de desativar animações. Sem interceptar touch/wheel, travar rolagem ou aplicar transform/contain aos ancestrais dos modais.

Na abertura fria, uma superfície com a marca substitui a tela preta enquanto a sessão é restaurada. Dados privados continuam ocultos até essa restauração.

Service Worker v144 entrega do cache apenas a estrutura pública conhecida e atualiza em segundo plano, sem recarregar nem interromper a conversa. A abertura seguinte recebe a atualização. APIs, arquivos privados, links de autenticação com query e rotas fora da estrutura não usam o novo caminho rápido. Erros e redirecionamentos não substituem o cache. Não há novo cache de dados da conta.

Validação: testes locais de cache, transições, controle único de fechar e regressões de navegação, mídia, sessão e desempenho. Não houve medição de FPS nem teste visual em aparelho real. Não exige SQL, Secrets ou novo APK.

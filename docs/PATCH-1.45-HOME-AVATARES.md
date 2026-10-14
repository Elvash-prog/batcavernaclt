# Patch 1.45 — avatares na página inicial mobile

A página inicial coloca avatarHtml dentro de .mh-friend-av. O componente interno ganhou posicionamento relativo e imagens absolutas no Patch 1.41, mas o frame interno não recebeu largura/altura nesse contexto. O wrapper de 34px mantinha espaço reservado, com conteúdo interno de tamanho zero.

O frame interno agora ocupa 100% da largura e altura, com iniciais visíveis enquanto a foto carrega ou quando estiver indisponível. Aplica-se aos amigos online e à atividade recente. Mantidas a liberação de mídias pelo servidor e as restrições de acesso. Sem liberar buckets ou imagens privadas.

Service Worker v145 atualiza a estrutura pública. Não há SQL nem alteração de Secrets.

Separadamente, APK Android 1.0.2 usa recorte circular transparente do logo na abertura e nos ícones, com a mesma assinatura para atualização da instalação existente.

Validação local: sintaxe, regressões de acesso a avatares, navegação, cache e desempenho. Aparência em aparelho real deve ser conferida pelo proprietário.

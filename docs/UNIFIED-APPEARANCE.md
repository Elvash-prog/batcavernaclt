# Temas e fundo unificado no Windows

A versão 2.1.10 usa uma base de cores comum em todos os temas. O fundo central segue `--bg`; barras, painéis, controles, linhas e textos seguem os tokens da conta. O tema Claro usa uma base próxima do branco, sem o gradiente escuro fixo do layout anterior. Contas com a antiga cor de fundo padrão do Claro recebem a nova base; outras cores personalizadas são preservadas. O texto dos botões usa a cor com maior contraste em relação ao destaque.

Há uma imagem de fundo para todo o aplicativo, inclusive ao visitar perfis. A configuração fica em Configurações → Aparência → Fundo do aplicativo. O editor de perfil oferece um atalho para essa mesma configuração; foto e capa continuam sendo editadas no perfil.

Compatibilidade: uma imagem antiga salva na aparência do aplicativo tem precedência e continua aparecendo. Se ela não existe, a imagem de `profile.fundo` da própria conta é utilizada globalmente. Ao escolher uma nova imagem, o cliente a redimensiona até 1920 px, envia WebP pelo contrato existente de upload de perfil e salva a URL pelo contrato existente `update_profile_background`. Depois do sucesso, remove a preferência antiga de imagem da aparência. Remover o fundo limpa as duas referências. Não há migração destrutiva nem alteração de esquema ou permissões.

A camada única fica em `body::before`. O antigo fundo exclusivo de perfil e o efeito de capa como fundo da página foram retirados. A camada usa apenas uma suavização leve de 18%; os antigos valores de escurecimento/desfoque do perfil não são aplicados ao fundo global. Painéis usam 72% de superfície, barras 80% e agrupamentos 72% quando há imagem. Sem imagem, as superfícies voltam a ser sólidas. Diálogos mantêm superfície sólida para leitura. A preferência do sistema por reduzir transparência mantém painéis sólidos.

O controlador reutiliza a resolução da mesma imagem. Navegações não a substituem. Uma geração e o identificador da conta impedem que resoluções antigas pintem um fundo após logout ou troca de conta. Uploads e salvamentos verificam a conta antes das requisições seguintes. Falhas preservam a seleção anterior; somente a operação de upload pode deixar um arquivo ainda sem referência caso o salvamento seguinte falhe, como nos demais envios de perfil.

Validação: `npm test` inclui precedência legada, fonte única, deduplicação, remoção, falhas recuperáveis, concorrência, logout e contraste do destaque. `npm run test:ui` verifica os seis temas, contraste dos textos e botões, transparência, telas claras, fundo estável entre abas, atalho do perfil e falhas no upload/salvamento. Também executa os fluxos existentes em HD, Full HD e QHD com APIs simuladas. A publicação repete os testes de interface e Rust no Windows.

Android permanece em 2.1.8 (117).

A versão 2.1.11 completa o tratamento de cabeçalhos de mídia: a camada sobre a capa do Meu Retrô usa a cor do painel do tema, com 96% próximo aos textos e 35% no lado da arte. Os agrupamentos e cabeçalhos da coleção também seguem as superfícies translúcidas. O teste visual verifica a mesma capa nos temas Claro e Caverna.

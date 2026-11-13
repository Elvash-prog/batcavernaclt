# Transições de abas no Windows

A versão 2.1.9 remove os cartões vazios de carregamento. A navegação mantém o DOM anterior visível, com `inert` e `aria-busy`, até o próximo renderer concluir. Os dados continuam sendo consultados normalmente; não há cache adicional de informações da conta.

O indicador compacto aparece fora de `#content` depois de 180 ms. Leituras rápidas não o exibem. Depois da primeira substituição dos filhos de `#content`, o renderer em preparação fica oculto até terminar toda a cadeia de ajustes. As classes de apresentação anteriores são preservadas durante a leitura e limpas apenas quando a navegação atual termina. A largura da página e o painel de amigos também são atualizados ao concluir.

Cada navegação recebe um identificador. Uma conclusão ou um timer antigo não pode remover o indicador nem liberar a interação da navegação mais recente. Logout cancela o indicador. Recarregamentos diretos de início, biblioteca, perfil, Minha Steam e configurações usam o mesmo mecanismo. Novas tentativas de leitura continuam disponíveis após erros; nenhum salvamento é repetido.

A navegação não usa a animação escalonada dos cartões na apresentação final. O indicador respeita movimento reduzido e a preferência de desativar animações.

## Validação

- `npm test`: navegação rápida/lenta, concorrência, cancelamento, timer antigo já enfileirado e conclusão sem mudança prematura de layout.
- `npm run test:ui`: ausência de skeletons e de indicador em leituras rápidas, geometria preservada do início enquanto a biblioteca carrega, indicador compacto atrasado, movimento reduzido, nova tentativa após falha e conclusão antiga durante nova leitura pendente. A suíte também cobre os fluxos existentes e resoluções HD, Full HD e QHD com APIs simuladas.
- A publicação Windows executa novamente as suítes, os testes Rust e a geração do instalador com assinatura do atualizador.

O Android permanece na versão 2.1.8 (117).

## Movimento na versão 2.1.12

A conclusão de uma troca real de tela usa uma única animação Web Animations no `#content`: opacidade de 0,4 a 1 e deslocamento vertical de 6 px a zero, durante 220 ms, com desaceleração. Não há desfoque, escala ou animação escalonada de cartões. O efeito não faz parte da promessa de leitura e não bloqueia a interação; novos pedidos começam imediatamente.

A identidade da tela inclui categoria da biblioteca, seção de configurações, aba de descoberta e usuário do perfil. Recarregar a mesma identidade não repete a entrada. Uma nova revelação cancela a anterior, e sua conclusão antiga não interfere no efeito atual. Logout, aba oculta, preferência do sistema por movimento reduzido e `no-animations` cancelam o efeito. Se Web Animations não estiver disponível, a tela é apresentada normalmente.

Leituras longas mantêm o indicador de 180 ms e passam a reduzir gradualmente a opacidade da tela anterior para 0,84 em 140 ms. O marcador do menu respeita a preferência de desativar animações.

Validação adicional: testes de efeitos sobrepostos, conclusão antiga e cancelamento; teste visual de uma entrada em andamento, interação desbloqueada, busca imediata durante a animação anterior, troca entre categorias, atualização da mesma tela e cancelamento pelos dois modos de reduzir movimento. A suíte completa mantém a verificação de geometria durante a leitura, erros, concorrência, temas e resoluções.

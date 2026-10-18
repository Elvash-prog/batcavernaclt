# Windows 0.17.51

Reúne as mudanças da 0.17.49 e corrige o encaixe da janela de indicação.

- Indicações com busca por título ou pessoa, categoria e contador de resultados.
- Envio em duas colunas, com busca na biblioteca e prévia do título selecionado.
- Janela externa dimensionada para o formulário, sem corte horizontal.
- Associação de executáveis com busca de jogos e programas abertos, atualização de processos e revisão/remoção de vínculos.
- Um executável não fica associado simultaneamente a dois jogos.
- Horas exibidas em pt-BR com até uma casa decimal; soma numérica ignora valores inválidos e exclui mídias que não sejam jogos.
- Entrada de horas aceita valores sincronizados com mais precisão sem impedir a edição do jogo.

Nenhum histórico foi apagado ou reescrito. A consulta agregada de diagnóstico não mostrou títulos com mais de 100 mil horas; a apresentação excessiva de casas decimais foi corrigida. Steam continua sendo a fonte de horas dos itens Steam; jogos de outras lojas usam o registro idempotente enquanto o BatCaverna está aberto.

A versão 0.17.50 não chegou a ser publicada: a validação detectou uma variável duplicada no script de testes. A 0.17.51 corrige o teste e verifica que o formulário cabe no diálogo.

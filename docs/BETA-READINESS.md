# Prontidão da beta — 18/10/2026

## Concluído e confirmado

- O responsável confirmou teste bem-sucedido em dois PCs após Windows 0.17.52.
- Diretório público separado dos dados privados de perfil. A view usa SECURITY INVOKER; a tabela contém somente id, slug, nome, avatar e código de convite. Busca entre não amigos continua possível e bloqueios são respeitados.
- Funções de gatilho públicas não têm execução concedida a PUBLIC, anon ou authenticated. Os gatilhos continuam funcionando e usam caminho de busca explícito.
- Métricas novas guardam apenas números e rótulos fixos, sem identificadores pessoais, consultas, payloads, IPs ou tokens. Têm retenção de 30 dias e acesso exclusivo do servidor/administrador.
- Métricas de serviço contam respostas bem-sucedidas, com média, máximo e número acima de um segundo. Chamadas de health, preflight e erros de autenticação não geram gravações. Não representam tráfego total nem taxa de falhas. Consultar os logs próprios do Supabase para erros, limites e invocações completas. Pode haver perda de contagem se a gravação em segundo plano falhar.
- Contadores de hit/miss representam a camada persistente do IGDB, incluindo a sonda de conectividade. O cache em memória pode responder sem consultar essa camada; não somar esses eventos ao número de solicitações.
- Logs locais existentes permitem investigar inicialização, telas lentas e comandos lentos. Não há monitoramento remoto de CPU/RAM nos clientes; medições reais desse tipo ainda precisam de coleta consentida ou reprodução local.
- Aviso de privacidade beta disponível em `/privacidade`, com contato do responsável, fluxos identificados, fornecedores, cache, diagnóstico e pendências de localização/retenção.
- Procedimento de exportação criptografada e testes isolados de integridade/recuperação preparados. Consultar RECOVERY.md para os limites e o que ainda depende de acesso seguro e ensaio real.

## Medir antes de otimizar

Executar `tools/operations/report.sql` como administrador após alguns dias de uso. Comparar latência média/máxima e chamadas acima de um segundo por categoria, contagem/cache, tamanho do banco e mídias com a cota mostrada no painel Supabase. Investigar amostras dos logs locais antes de alterar interface ou sincronização. A presença de métricas não significa que medições reais de vários dias já existam.

## Alertas que não devem ser removidos cegamente

Funções SECURITY DEFINER usadas por APIs autenticadas precisam de revisão individual de autorização; mudar todas para INVOKER pode quebrar operações sociais e não comprova segurança. Funções internas de leitura de tabelas privadas e tabelas só de servidor têm justificativa específica. A função de fundo do login é intencionalmente pública e retorna apenas configuração pública. Alertas informativos de RLS sem política em tabelas só do servidor são esperados.

A proteção de senhas vazadas do Supabase depende da disponibilidade no plano/configuração; não foi ativado um plano pago. A localização detalhada e retenção dos fornecedores externos e a avaliação jurídica do aviso ainda estão em conclusão. Não declarar conformidade integral ou aprovação de uso comercial.

## Autorizações externas

IGDB: solicitações enviadas pelo responsável, conforme os blocos de e-mail mais recentes. Não reenviar automaticamente. Outras autorizações e respostas devem ser registradas com evidência antes de ampliar o uso ou mudar a monetização. Atribuição e cache não substituem a autorização dos fornecedores ou titulares das imagens.

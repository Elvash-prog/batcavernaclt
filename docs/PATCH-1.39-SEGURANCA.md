# Patch 1.39 — Ativação e limites da segurança

Site: https://batcavernaclt.gamersclt.workers.dev/
Base anterior: Patch 1.38. Referência estável solicitada: Patch 1.36, commit bd77360131db45a36162e5849571a3f4215d6b31.

## Já incluído no código

- CSP com nonce por resposta, bloqueio de atributos executáveis, proteção contra páginas incorporadas, HTTPS, bloqueio de MIME inesperado e Referrer-Policy sem referrer.
- Nenhuma credencial privilegiada é enviada por config.js. Chaves RAWG/TMDB permanecem no Worker.
- Limites no Cloudflare de 240 consultas/IP/minuto, 120 operações/usuário/minuto e 10 tentativas de login/IP/minuto. São limites aproximados por localização do Cloudflare, não contagem global exata.
- Filtragem no servidor dos catálogos RAWG/TMDB; anime exclui conteúdo adulto e Ecchi na consulta e na resposta. Classificações e palavras dos catálogos podem ser incompletas.
- Senhas novas exigem 12 caracteres na interface. Regras definitivas devem ser ativadas também no Supabase Auth.
- A biblioteca deixa de ser guardada no localStorage; logout remove cópias antigas e URLs temporárias. Sessão persistente permanece apenas quando o usuário escolhe permanecer conectado.
- Push abre apenas caminhos do próprio site.
- Novos uploads ficam bloqueados enquanto a moderação não está configurada.

## Ativar o banco e a moderação automática

1. No SQL Editor do projeto correto, execute `supabase/patch-1.37-grupos.sql` se os convites ainda não foram ativados.
2. Execute `supabase/patch-1.39-seguranca.sql`. É uma transação: erro cancela o conjunto. Preserve uma cópia/backup antes de alterações de produção. O patch torna os cinco buckets da aplicação privados; arquivos antigos precisam passar pela análise antes de aparecer. Políticas RESTRICTIVE limitam as existentes e não concedem acesso adicional às tabelas.
3. No Cloudflare, em Workers > batcavernaclt > Settings > Variables and Secrets, cadastre como **Secrets**, nunca como texto público:
   - `SUPABASE_SERVICE_ROLE_KEY`: chave privilegiada do projeto Supabase correto. Usada somente no Worker para login protegido, armazenamento e registro da análise.
   - `SIGHTENGINE_API_USER`: identificador de API do serviço Sightengine.
   - `SIGHTENGINE_API_SECRET`: segredo de API do Sightengine.
4. Publique/aplique a configuração e recarregue o site. Confirme que o login por usuário/e-mail funciona pelo endpoint `/api/account/login`.
5. Só depois, execute `supabase/patch-1.39-login-privado.sql`. Isso retira do navegador a consulta direta do e-mail por usuário. Até essa etapa, a função antiga ainda pode expor o e-mail; o fluxo de compatibilidade não constitui proteção completa desse dado.
6. Rode `supabase/patch-1.39-auditoria.sql` para conferir RLS, políticas, buckets e funções no estado real. Funções SECURITY DEFINER existentes precisam ser examinadas no Supabase; o código delas não estava disponível nesta sessão.

As chaves não devem ser enviadas por chat, colocadas no HTML ou commitadas no GitHub. O serviço de moderação tem limites/plano próprios; confira a disponibilidade da análise de imagens e vídeos na sua conta antes da ativação. Nenhuma conta ou assinatura foi criada automaticamente.

## Como os arquivos são analisados

Imagens: o servidor valida usuário, pasta de destino, MIME real e tamanho; consulta o modelo `nudity-2.1`; só depois grava o arquivo. SVG, HTML, executáveis e imagens com assinaturas incompatíveis são rejeitados. As regras bloqueiam os níveis sexual_activity, sexual_display, erotica e very_suggestive a partir de 0,25. Resultado ausente, serviço indisponível ou resposta inesperada impede a liberação.

Vídeos: upload resumível em bucket privado `clt-quarantine`, até 200 MB sujeito ao limite real do Supabase. O servidor verifica propriedade, formato e tamanho, bloqueia substituição do arquivo, solicita análise do vídeo em intervalos de 0,5 segundo e só então transfere o arquivo aprovado ao bucket privado de feed. Análises que ultrapassem 90 segundos ou os limites do provedor falham sem publicar. Arquivos de quarentena não aparecem para usuários; limpeza periódica deve ser feita pelo administrador depois de verificar uploads abandonados.

Fotos, banners, imagens do chat, figurinhas importadas e mídia de feed são enviados ao Sightengine para análise. A política de privacidade do site deve informar esse processamento por terceiro. Credenciais não saem do servidor. A interface de comentários continua usando apenas a coleção de figurinhas definida no código.

Arquivos aprovados têm URLs assinadas curtas de até cinco minutos. Aprovação visual não concede acesso: também é exigida a relação adequada de amizade, participação na conversa/grupo ou propriedade. Links antigos que já foram emitidos/cacheados podem permanecer válidos até expirarem; mudar o bucket não apaga cópias já baixadas.

## Configuração que depende dos painéis

No Supabase Auth, ative confirmação de e-mail, confirmação segura de mudança de e-mail, proteção contra senhas vazadas se disponível no plano e a exigência de senha adotada. Restrinja URLs de redirecionamento ao endereço real do site. Ative proteção contra automação/CAPTCHA no cadastro/recuperação e limites de Auth conforme os controles disponíveis; estes painéis não foram acessados daqui.

Proteja as contas administrativas de GitHub, Cloudflare e Supabase com MFA. Restrinja acesso ao repositório e aos painéis e revise/rotacione qualquer segredo que já tenha sido divulgado. Não houve inspeção de históricos de segredos nem confirmação de rotação.

A função Supabase `bright-api` recebe agora o JWT do usuário, mas precisa verificar esse JWT **no próprio servidor** antes de atender ações privadas. O código da função implantada e as políticas atuais não foram acessados. Limites do Worker não protegem endpoints Supabase chamados diretamente; o SQL cobre as operações descritas, e Auth/Edge Functions devem ser configurados nos respectivos painéis.

## Validação realizada

Sintaxe JavaScript, testes com respostas simuladas de autenticação/provedor/Storage e checagens de propriedade, caminho, MIME, CSP, bloqueio antes do upload e filtro de catálogo. SQL revisado, porém não executado contra o banco real. Credenciais reais e moderação de arquivos reais não foram testadas. Não houve teste visual em navegador.

Não existe garantia de risco zero nem de detecção perfeita de conteúdo adulto. A análise automática de vídeos usa quadros amostrados e pode não detectar trechos curtos; o serviço também pode produzir falsos positivos/negativos. Incidentes e denúncias ainda precisam de revisão humana. Este patch não constitui auditoria externa, pentest ou certificação de segurança.

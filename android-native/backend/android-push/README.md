# Push Android — integração preparada, ainda não ativada

O APK 0.22 já contém o `app/google-services.json` enviado. O cliente Firebase está configurado; o envio pelo servidor ainda precisa ser ativado. A central mostra mensagens e outras atividades. Para entregar com o aplicativo fechado, configure o Firebase e o servidor abaixo. Não substitui o push do site.

1. Esta etapa já foi feita para a prévia: no Firebase, registre o Android com o pacote `dev.gamersclt.batcaverna.nativeapp.preview`. Baixe o arquivo de configuração do aplicativo `google-services.json`, coloque em `app/` e recompile. Para uma futura distribuição de produção, registre também o pacote sem `.preview`.
2. Revise e aplique `01-tokens.sql`. É uma tabela nova com RLS; cada conta só cadastra/lê/remove seus próprios dispositivos. Não muda políticas existentes.
3. Copie `index.ts` para uma Edge Function Supabase chamada `android-push`. Configure somente no servidor `FIREBASE_SERVICE_ACCOUNT` (JSON da conta de serviço Firebase) e `ANDROID_PUSH_WEBHOOK_SECRET` (segredo aleatório forte). As variáveis Supabase padrão são usadas no servidor. Ative a API Firebase Cloud Messaging HTTP v1 e dê à conta de serviço a permissão de envio de mensagens no projeto correto.
4. Publique essa função com verificação JWT desativada. Ela exige o cabeçalho secreto; não aceita chamadas públicas sem autenticação. A chave administrativa e a chave privada Firebase nunca entram no aplicativo.
5. No Supabase Database Webhooks, crie um webhook para INSERT em `public.notificacoes`, apontando para `/functions/v1/android-push`. Configure `Content-Type: application/json` e `x-android-push-secret` com o mesmo segredo. Não coloque esse segredo em SQL, APK ou repositório. Configure timeout adequado ao volume de dispositivos.
6. Instale o APK recompilado, faça login, ative alertas e conceda permissão Android. Verifique o registro do dispositivo. Envie uma mensagem e outra atividade a partir de uma segunda conta autorizada, com o app destinatário fechado. Confirme entrega e abertura da central.

A função lê novamente a notificação no banco e usa o destinatário real. Envia somente mensagens FCM de dados; o Android verifica conta ativa e preferência antes de exibir o texto. Tokens inválidos são removidos. Ao desativar alertas ou sair, o app revoga o token FCM e bloqueia exibição local. Ao retornar, registra um token atual.

A origem de eventos é `notificacoes`: eventos que o backend não registra nessa tabela não serão enviados por este webhook. Verifique se o fluxo de mensagens cria `chat_message`/`chat_group_message`; não crie um segundo disparador duplicado sem conferir o atual. A função não foi publicada nem testada com credenciais reais. Não há fila persistente/repetição automática de falhas nesta implementação; use uma fila de entrega se precisar dessa garantia. O Android também pode impedir entrega após “Forçar parada”, até o usuário reabrir o app.

Referências: https://firebase.google.com/docs/cloud-messaging/android/get-started, https://firebase.google.com/docs/cloud-messaging/send/v1-api, https://supabase.com/docs/guides/database/webhooks.

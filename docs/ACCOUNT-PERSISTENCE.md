# Persistência — Windows 0.17.52 / Android 1.7.16

O catálogo IGDB usa cache compartilhado no Supabase: buscas por 6 horas, detalhes por 7 dias e descoberta por 1 hora. São prazos escolhidos para o aplicativo, não uma exigência de prazo da IGDB. O servidor armazena somente respostas públicas, com limite de 512 entradas e 16 MiB de JSON. Erros não são gravados. O bloqueio temporário evita consultas simultâneas idênticas entre instâncias.

Capas públicas de images.igdb.com ficam no cache privado do aplicativo por até 7 dias, limitadas a 64 MiB no Windows e 32 MiB no Android. O sistema pode limpar esse cache. Avatares, mensagens, imagens privadas e credenciais não entram nele.

A aparência do Windows fica em clt_desktop_layout, protegida por RLS e vinculada ao UUID da conta: cores, tema, largura, escala, formato e tamanho de cards, fundo e redução de animações. Alterações são mescladas por chave. A cópia local e as alterações ainda não enviadas são separadas por conta. Reconexão, novo login e novas alterações retomam a sincronização.

O refresh token do Windows é protegido pelo Windows Credential Manager. A renovação é serializada e o token renovado substitui o anterior imediatamente. Erros de conexão não apagam a credencial. A atualização interna preserva a sessão inclusive quando Manter conectado está desmarcado, usando uma credencial temporária de transição que é removida após restauração; falhas na instalação removem essa transição. Sair remove ambas as credenciais.

A versão 0.17.51 não habilitava o backend nativo do keyring; pode ser necessário entrar uma vez após migrar. A nova versão verifica em CI a leitura de uma credencial sintética por outro processo Windows. Revogação pelo servidor e saída explícita continuam exigindo novo login.

Validação: testes de cache e frontend, testes de layout entre contas e falhas de rede, build Vite, mesclagem SQL e tentativa de gravação cruzada negada por RLS. Os testes legados da antiga aplicação web em tests/ continuam dependendo de scripts removidos quando o site virou apresentação; não são testes do desktop/APK atual.

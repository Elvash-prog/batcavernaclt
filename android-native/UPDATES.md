# Atualizações Android — 1.7.5

Configurações → Atualizações permite consultar versões, baixar com progresso e abrir o instalador do Android. A consulta automática ocorre no máximo uma vez por dia e pode ser desativada. Falhas automáticas não interrompem a navegação.

O aplicativo consulta releases públicas com tags `android-v*`, ignora rascunhos e prévias e escolhe o maior `versionCode` compatível. Cada release deve conter `android-update.json` e o APK indicado nele. Releases do Windows são ignoradas.

O download usa HTTPS, verifica SHA-256, pacote, versão e a mesma assinatura do aplicativo instalado antes de abrir o instalador. Instalação depende de confirmação do Android. Ao conceder a permissão de instalação, volte ao aplicativo e toque em Instalar atualização. Uma assinatura incompatível bloqueia a atualização sem sugerir desinstalar.

## Preparar uma publicação

1. Execute o workflow Android nativo e obtenha o APK validado.
2. Assine com a mesma chave da prévia já instalada, guardada fora do repositório. Não distribua o APK com a chave debug temporária de um runner CI. O ID deve continuar `dev.gamersclt.batcaverna.nativeapp.preview`.
3. Execute `scripts/prepare-update.py APK --aapt CAMINHO_AAPT --apksigner CAMINHO_APKSIGNER --notes NOTAS.txt`. O script verifica a assinatura estrutural, extrai versão e pacote e prepara os dois arquivos em `build/update-release`. A compatibilidade com a chave anterior é verificada pelo app.
4. Publique ambos os arquivos em uma release pública com tag `android-v1.7.5`. A publicação é uma etapa separada; este script não publica nem guarda chaves.
5. Instale a primeira versão com atualizador manualmente. Para validar ponta a ponta, publique uma versão posterior assinada com a mesma chave, verifique consulta, progresso, autorização do Android e preservação dos dados.

A compilação existente continua entregando APK de CI para assinatura posterior. Não há assinatura automática com chave persistente configurada neste patch.

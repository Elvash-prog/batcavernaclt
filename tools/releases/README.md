# Conferência dos downloads oficiais

O fluxo `Conferir downloads oficiais` é acionado após publicações de produção Windows e Android bem-sucedidas. Também permite execução manual em `main` para conferir ou retomar uma entrega.

- Windows usa `make_latest: 'true'`; Android usa `make_latest: 'false'`.
- As versões estáveis são escolhidas por canal e número de versão, sem depender da posição do Android na lista de releases.
- O script verifica os feeds e seus destinos, assinatura Windows correspondente, SHA-256 do APK e tamanhos/digests dos artefatos do GitHub.
- Tamanho e MD5 dos três arquivos no Drive devem corresponder aos artefatos publicados. O download público do instalador Windows também precisa entregar os mesmos bytes.
- A página só recebe versões já conferidas. Versões anteriores, releases incompletas, links inesperados e checksums divergentes não passam pela conferência.
- Após o commit automático, a página pública é consultada até mostrar os links e versões esperados. A evidência fica no artefato `official-delivery-evidence` e no resumo do job.

A assinatura criptográfica continua sendo produzida pelo processo de release e verificada pelo atualizador do aplicativo; esta conferência verifica a correspondência dos arquivos e do manifesto após a entrega.

O trabalho privilegiado usa somente `main` e releases originadas no próprio repositório. Pull requests executam apenas os testes sem acesso aos segredos. O acesso do verificador ao Drive é somente de leitura. Publicações simultâneas são serializadas, e falhas transitórias de propagação são tentadas novamente por até cinco minutos por fase.

O script exige as variáveis existentes `GDRIVE_WINDOWS_FILE_ID`, `GDRIVE_WINDOWS_SIG_FILE_ID`, `GDRIVE_APK_FILE_ID` e os tokens temporários obtidos pelo fluxo. Nenhum valor de credencial é salvo no relatório. A atualização da página é um commit restrito a `public/index.html`; conflitos com outras alterações não são resolvidos à força.

Teste local, sem serviços externos:

```sh
python3 -m unittest discover -s tools/releases -p 'test_*.py' -v
```

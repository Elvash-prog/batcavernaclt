# Windows 0.17.52 e Android 1.7.16

- Cache público IGDB persistente e compartilhado no Supabase, com validade e limites de armazenamento.
- Cache em disco de capas públicas nos dois clientes; conteúdo privado continua excluído.
- Aparência do desktop sincronizada por conta, com RLS, mesclagem de alterações e recuperação local.
- Cofre nativo Windows ativado; renovação serializada e sessão preservada na atualização interna.
- Novo ícone e novas artes do instalador NSIS, com identidade geométrica original.

A primeira migração da versão 0.17.51 pode exigir novo login, pois o backend nativo do cofre não estava habilitado. Manter conectado preserva a sessão nas reaberturas; sair e revogação pelo servidor continuam removendo o acesso.

## Verificação

Fonte das releases: `8e1fad06b1a7cdd6e7e90ed8f2461d68ef66b4fb`; PR #53 integrado.

- Windows CI: 39154324126, incluindo abertura real do Tauri.
- Release assinada do updater: 39154572672.
- Android CI: 39154324143, testes, compilação e Android Lint aprovados.
- Interface Linux: 39154324116; 54 testes frontend e 25 testes Rust aprovados.
- Teste Windows confirma leitura de uma credencial sintética por outro processo.
- Banco: mesclagem/exclusão de preferências, leitura isolada e gravação cruzada negada por RLS, sem persistir dados dos testes.
- Backend `native-api` versão 15; health confirma IGDB conectado e cache real preenchido.

SHA-256 Windows: `24544bf565160bfa923d531fbd80cfd5d2893d865a0c5b436777e76993ecd911`.
SHA-256 Android: `7dc41dd085a48fa73b17bc3ca4a89740f8741d0e3266b46852e7265f2baf1270`.
Certificado Android preservado: `9e15f32a3a091fc877940bf7fc6f74b73f7377ac57033aabc64dccb2e042c963`.

A migração local usa o mesmo identificador aplicado pelo Supabase: `20261018182205_persistent_catalog_and_account_layout.sql`. Não reaplicar o conteúdo da migração com um novo identificador.

Os testes legados da antiga aplicação web dependem de scripts removidos quando o site passou a ser uma apresentação. Os fluxos desktop, Android e backend acima foram verificados separadamente.

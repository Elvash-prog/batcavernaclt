# Confirmação e recuperação nos aplicativos

Windows 0.17.39 e Android 1.7.7 verificam códigos e links originais do Supabase via POST /auth/v1/verify. Não navegam para o link colado nem usam seu redirect_to. Links precisam pertencer ao projeto, à rota verify e ao propósito correto. Senhas e provas não são registradas ou salvas como sessão normal. A sessão temporária é encerrada com logout local ao final (melhor esforço).

## Configuração pendente no Supabase

No painel Authentication → Email Templates, aplicar confirmation.html em Confirm signup e recovery.html em Reset password. Preservar as demais configurações e provedores de e-mail. Estas alterações não foram aplicadas ao projeto por este patch.

Os apps também aceitam links originais dos e-mails atuais: copiar o endereço do botão e colar no campo, sem abrir. Links já consumidos ou expirados exigem novo envio. Links reescritos por rastreadores de e-mail não são aceitos: usar o código dos novos modelos. Não colar URLs com access_token de um link já aberto.

Aplicar os modelos somente quando Windows e Android com estes recursos estiverem distribuídos. Versões antigas e o site podem ainda depender de links de confirmação. Enquanto houver clientes antigos, o administrador pode preservar também o link padrão no e-mail e adicionar o código como alternativa.

## Validação antes de retirar o site

1. Cadastro de conta de teste: receber código, confirmar dentro de cada app, entrar e verificar o perfil.
2. Recuperação: solicitar e-mail, salvar nova senha dentro do app, entrar com a nova senha. Confirmar que uma senha antiga não autentica.
3. Rejeitar código incorreto, expirado, reutilizado, de outro propósito, link de outro projeto e e-mail que não corresponde ao link.
4. Senhas diferentes devem falhar antes de consumir o código. Após erro de rede durante a gravação, pode ser necessário solicitar novo código.
5. Fechar/cancelar janela não salva credenciais nem muda a sessão normal do aplicativo.

Testes automatizados cobrem parsing, rejeição de links e fluxo de interface simulado. Recebimento real dos e-mails e mudança de senha de conta de teste ainda precisam de validação com o usuário. Nenhum e-mail foi enviado automaticamente nesta implementação.

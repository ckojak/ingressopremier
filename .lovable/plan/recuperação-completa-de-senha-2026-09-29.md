# Recuperação completa de senha

## Aplicação
- Adicionar “Esqueci minha senha” na tela de entrada, preservando todo o restante do login.
- Criar a página pública `/esqueci-senha`, com validação de e-mail, resposta neutra e intervalo antes de reenviar.
- Criar a página pública `/redefinir-senha`, reconhecendo a recuperação, validando as duas senhas e encerrando a sessão após a troca.
- Adicionar as duas rotas sem proteger ou alterar checkout e administração.

## E-mail e autenticação
- Criar o e-mail de recuperação em português com a identidade Premier Pass, logo, botão de redefinição e avisos de segurança.
- Confirmar as URLs permitidas para o domínio atual e validar o envio e a troca de senha.
- Antes de qualquer configuração remota, confirmar que a conexão é o backend definitivo do projeto. Se a conexão disponível estiver em outro backend, não aplicar nada nela e indicar a reconexão necessária.

## Validação
- Corrigir o erro de compilação atual sem alterar o comportamento de pagamento.
- Testar em computador e celular: solicitação, resposta neutra, link inválido, senhas divergentes e sucesso.
- Testar o fluxo real por e-mail somente quando a conexão autorizada apontar para o backend definitivo.

## Limites
- Não alterar `.env`, fluxo normal de login/cadastro, checkout, pagamentos, webhooks ou painel administrativo.

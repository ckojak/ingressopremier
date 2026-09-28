# Exigir nome completo e CPF na cortesia

## Página do evento
- Remover “(opcional)” do título dos dados do comprador no carrinho totalmente gratuito.
- Exigir nome e sobrenome e adicionar CPF com a mesma máscara e validação usadas no checkout pago.
- Exibir o erro do CPF ao sair do campo ou quando os 11 dígitos forem preenchidos.
- Bloquear “Pegar Cortesia” até nome e CPF estarem válidos.
- Validar novamente antes da chamada e enviar nome sem espaços externos e CPF somente com números.

## Função de cortesia
- Validar nome e sobrenome sem recorrer aos dados do perfil ou ao e-mail.
- Validar os 11 dígitos do CPF, incluindo sequências repetidas e dígitos verificadores.
- Manter o CPF normalizado no pedido e retornar as mensagens solicitadas para dados inválidos.
- Publicar somente `create-free-ticket` no backend de produção confirmado.

## Limites e validação
- Alterar apenas `src/pages/EventDetails.tsx` e `supabase/functions/create-free-ticket/index.ts`.
- Não alterar `.env`, pagamentos, webhooks, migrações ou outros arquivos.
- Conferir a compilação relevante e testar o formulário de cortesia.

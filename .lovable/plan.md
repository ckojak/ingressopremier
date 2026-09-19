# Ingresso cortesia sem pagamento

## Implementação
- Criar a função `create-free-ticket` com autenticação, validação de que todos os itens são cortesias de preço zero, reserva de estoque, pedido pago de valor zero, geração dos ingressos e envio do e-mail existente.
- Adicionar ao painel de ingressos a escolha entre venda e cortesia, zerando e bloqueando o preço para cortesias e exibindo a identificação correspondente na listagem.
- No carrinho, reconhecer compras compostas somente por cortesias, mostrar total grátis e substituir PIX/cartão pelo botão “Pegar meu Ingresso”, mantendo o retorno após login.

## Validação
- Conferir tipos e compilação do frontend sem alterar checkout pago, PIX, cartão, webhook, banco ou ambiente.
- Validar que a função recusa tipos pagos e só conclui pedidos integralmente gratuitos.

## Limite de publicação
- O código será preparado no projeto, mas a função não será publicada enquanto a conexão disponível apontar para o projeto interno incorreto. O `.env` também está divergente e permanecerá intocado conforme solicitado.

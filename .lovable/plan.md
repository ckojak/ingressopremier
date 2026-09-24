# Seleção por quantidade e avanço de lotes

## Implementação
- Alterar somente a área de ingressos em `EventDetails.tsx`, mantendo o restante da página e os fluxos PIX/cartão intactos.
- Trocar “Selecionar” por controles `− quantidade +`, com mínimo 0 e máximo igual ao menor entre estoque restante, limite do lote e 10 por compra.
- Agrupar lotes pelo nome-base do ingresso, reconhecendo sufixos usuais como “1º lote”, “Lote 2” e variações; exibir apenas o menor lote com estoque. Ingressos sem indicação de lote, como Camarote, permanecem cards únicos.
- Quando todos os lotes de um tipo acabarem, manter um único card desabilitado como “Esgotado”.
- Exibir “🔥 Últimas unidades” abaixo do preço em todos os cards visíveis.
- Atualizar os estoques periodicamente e reconciliar o carrinho: reduzir quantidades acima do novo saldo, remover itens zerados e avisar o comprador.

## Segurança e atualização antes da compra
- Antes de iniciar PIX, cartão ou cortesia, buscar novamente os lotes selecionados e validar quantidade, atividade e estoque.
- Se houver mudança, interromper a ação, atualizar os cards/carrinho e mostrar um aviso; a reserva atômica já existente no servidor continua sendo a proteção final contra venda acima do estoque.

## Validação
- Conferir seleção de múltiplos tipos, limite de 10, cálculo quantidade × preço, troca automática de lote, estado esgotado e restauração da compra salva.
- Verificar a tela em computador e celular, sem editar funções de pagamento, webhook, banco ou outros layouts.

## Premissa
- O tipo será obtido removendo apenas a indicação numérica de lote do nome; nomes sem essa indicação serão tratados como tipos independentes.

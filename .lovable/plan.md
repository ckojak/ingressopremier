# Ingressos por lote e KYC administrativo

## Tela de ingressos
- Trocar “Selecionar” por controles `− quantidade +`, entre zero e o menor valor entre estoque restante, limite do lote e 10.
- Agrupar nomes com indicação numérica de lote e mostrar apenas o primeiro lote com estoque; itens sem lote, como Camarote, permanecem independentes.
- Quando um lote acabar, atualizar silenciosamente a lista e exibir o próximo; quando o tipo inteiro acabar, manter um card “Esgotado”.
- Mostrar “🔥 Últimas unidades” em todos os cards visíveis e manter o total baseado em quantidade × preço.
- Antes de PIX, cartão ou cortesia, consultar novamente os itens e interromper com aviso se o estoque mudou. A reserva atômica existente no servidor continuará como proteção final, sem alterações no pagamento.

## KYC administrativo
- Buscar todas as verificações pendentes, independentemente do status dos eventos, junto dos dados do produtor.
- Criar a seção “Verificações de Identidade” com abertura do documento, aprovação e recusa com motivo, reutilizando as ações existentes.
- Preservar a lista e o comportamento atuais dos eventos pendentes.

## Notificações
- Adicionar funções e gatilhos para criar alertas administrativos quando um documento entra em análise e quando um evento é enviado para aprovação.
- Não alterar regras de acesso existentes.

## Validação e limites
- Testar os controles, avanço de lote e estados esgotados em computador e celular.
- Conferir a nova seção administrativa e validar os gatilhos.
- Não editar `.env`, telas de criação de evento, painel do produtor, PIX, cartão ou webhook.
- Só aplicar a mudança do banco se a conexão confirmada for a de produção correta; caso contrário, interromper essa etapa e avisar.

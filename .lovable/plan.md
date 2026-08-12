# Plano de Auditoria Final — Premier Pass (Deploy Hoje)

Objetivo: deixar o site pronto para produção cobrindo as 4 missões (faxina visual, fluxos Cliente/Produtor/Admin, blindagem Webhook+RLS, preparação App-ready), com correções pontuais e baixo risco de regressão.

---

## Missão 1 — Faxina Visual e Assets

Varredura em `public/`, `src/assets/` e componentes de marca:

- Listar todos os arquivos em `public/` e `src/assets/` (imagens, ícones, logos).
- Remover qualquer asset não-Premier Pass: resquícios "Quintal Barra", logo "Q", placeholders genéricos não referenciados, imagens de demo de outras marcas.
- Conferir referências antes de deletar (`rg` por nome do arquivo) — só remove o que não tem import/uso.
- Garantir favicon, og-image e logo no header/footer apontando para assets Premier Pass.
- Revisar `index.html` (title, meta description, OG tags, theme-color) para reforçar identidade Premier Pass.

Entrega: codebase enxuto, sem assets órfãos nem marcas estranhas.

---

## Missão 2 — Simulação e Correção dos 3 Fluxos

### Cliente
- `Auth.tsx` → `Events.tsx` → `EventDetails.tsx` → `CheckoutPix.tsx` / Cartão → `PaymentSuccessMercadoPago.tsx` → `MyTickets.tsx`.
- Validar: redirect pós-login para `/painel`, exigência de telefone no checkout, sticky CTA mobile, exibição do QR Code do ingresso em `MyTickets`.
- Corrigir qualquer botão sem `min-h-12` (toque 48px), estados de loading com Skeleton, e mensagens de erro silenciosas via ErrorBoundary.

### Produtor
- `ProducerDashboard.tsx`, `admin/Events.tsx`, `admin/Tickets.tsx`.
- Validar criação de evento com múltiplos lotes/tipos de ingresso, datas, preços; status inicial `pending`.
- Garantir invalidação de cache do React Query após mutate (refetch automático no dashboard de vendas).
- Verificar que produtor só vê os próprios eventos (filtro por `organizer_id = auth.uid()`).

### Admin
- `SuperAdminDashboard.tsx`, `EventApprovals.tsx`, `Users.tsx`, `PaymentSettings.tsx`, `WebhookLogs.tsx`.
- Garantir bypass: aprovar/suspender eventos, alterar status de pedido manualmente, gerenciar roles na `user_roles`.
- Confirmar guard de rota `/admin/*` usando `has_role(auth.uid(),'admin')` no client e RLS no banco.

---

## Missão 3 — Blindagem Webhook + RLS

### Webhook Mercado Pago (`supabase/functions/mercadopago-webhook`)
- Confirmar verificação HMAC SHA256 obrigatória (rejeitar 401 se secret configurado e assinatura inválida — já existe, revisar caminho de fallback quando secret ausente: logar WARN e seguir só em sandbox).
- Idempotência: já existe checagem de tickets existentes; reforçar com `upsert` ou bloqueio por `mp_payment_id` único para evitar corrida entre 2 callbacks simultâneos.
- Atomicidade: encapsular criação de tickets + update de `quantity_sold` + update de `orders.status` em uma RPC `process_paid_order(order_id, payment_id)` com `SECURITY DEFINER` e transação única, substituindo o loop atual de inserts.
- Tratar status extras: `in_mediation`, `refunded`, `charged_back` → marcar `orders.status` adequadamente e (no caso de refund) revogar tickets.

### Edge function `create-pix-payment`
- Bug crítico: valor hardcoded `3.24` (linha "Valor de teste"). Calcular `total_amount` a partir de `items` × preço real do `ticket_types`, aplicar taxa PIX 8% e gravar `order_items` correspondentes. Sem isso o webhook não consegue gerar ingressos (não há `order_items`).
- Inserir `order_items` na mesma transação do `orders`.
- Persistir `mp_payment_id` no insert do pedido.

### RLS Supabase
SQL a rodar (entregue para o usuário executar):

- `events`: SELECT público apenas onde `status='published'`; INSERT/UPDATE/DELETE só onde `organizer_id = auth.uid()` OR `has_role(auth.uid(),'admin')`.
- `ticket_types`: mesma regra atrelada ao `events.organizer_id` via subquery/função `is_event_owner(event_id)`.
- `orders` e `order_items`: SELECT/UPDATE apenas onde `user_id = auth.uid()` OR admin; INSERT só com `user_id = auth.uid()`.
- `tickets`: SELECT onde `user_id = auth.uid()` OR organizer do evento OR admin. INSERT/UPDATE apenas via `service_role` (webhook).
- `user_roles`: SELECT `auth.uid() = user_id` OR admin; INSERT/UPDATE/DELETE apenas admin (impede escalonamento).
- `webhook_logs`: SELECT admin; INSERT service_role.
- Confirmar `GRANT`s explícitos para `authenticated`/`anon`/`service_role` em cada tabela.

---

## Missão 4 — Mobile-First & App-Ready

- Extrair lógica de pagamento dos componentes de página para hooks puros: `usePixCheckout`, `useCardCheckout`, `useTicketPurchase`, `useEventForm`. Páginas passam a ser apenas presentational + hook.
- Extrair serviços Supabase de páginas para `src/services/{events,orders,tickets,auth}.ts` (já existe `supabase-helpers`; expandir).
- Garantir que nenhum componente em `src/components/ui/*` ou `src/components/events/*` importe diretamente `@/integrations/supabase/client` — apenas via hooks/services.
- Confirmar manifest + theme-color + apple-touch-icon no `index.html` (manifest-only PWA, sem service worker, conforme skill PWA — não adicionar offline agora).
- Revisar viewport meta e que botões críticos de compra usam `min-h-12`.

---

## Entregáveis

1. PRs de código (faxina assets, hooks extraídos, fixes de checkout PIX, refatoração webhook para RPC).
2. Bloco SQL único para o usuário rodar no Supabase (RLS + função `process_paid_order` + `is_event_owner`).
3. Relatório final listando o que foi removido, o que foi corrigido, e o checklist verificado.

## Riscos / Pontos de Atenção

- Refatorar `create-pix-payment` para calcular valor real muda comportamento — precisa de teste end-to-end de PIX após deploy.
- Mudança de RLS pode quebrar queries existentes que dependem de policies frouxas — vou auditar todas as queries do front antes de propor o SQL final.
- Não vou adicionar Service Worker / offline (segue regra do projeto — manifest-only).

Confirma que posso seguir e implementar? Posso também priorizar só Missão 3 (a mais crítica para deploy hoje) se quiser cortar escopo.
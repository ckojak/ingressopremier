-- Criar evento de teste para pagamento Mercado Pago
INSERT INTO public.events (
  organizer_id,
  title,
  short_description,
  description,
  start_date,
  end_date,
  city,
  state,
  venue_name,
  venue_address,
  category,
  status
) VALUES (
  '5f7b01b8-bff9-4bc0-96ec-c3ba708057be',
  'Evento Teste - Mercado Pago',
  'Evento para testar integração com Mercado Pago',
  'Este é um evento de teste para validar a integração com o Mercado Pago. Após o teste, este evento pode ser removido.',
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '7 days' + INTERVAL '4 hours',
  'Rio de Janeiro',
  'RJ',
  'Local de Teste',
  'Rua de Teste, 123',
  'Teste',
  'published'
);

-- Criar tipo de ingresso de R$5
INSERT INTO public.ticket_types (
  event_id,
  name,
  description,
  price,
  quantity_available,
  quantity_sold,
  max_per_order,
  is_active
) VALUES (
  (SELECT id FROM public.events WHERE title = 'Evento Teste - Mercado Pago' LIMIT 1),
  'Ingresso Teste R$5',
  'Ingresso para teste de pagamento',
  5.00,
  100,
  0,
  10,
  true
);
# Roadmap

- [ ] Restaurar o `.env` para o projeto de produção informado.
- [ ] Criar e validar a função `create-free-ticket`.
- [ ] Adicionar tipo cortesia ao painel de ingressos.
- [ ] Adicionar resgate gratuito ao carrinho.
- [ ] Publicar `create-free-ticket` no projeto de produção indicado.

## Seleção e lotes na tela de ingressos
- [ ] Trocar seleção por controle de quantidade e limitar pelo estoque/10.
- [ ] Mostrar somente o lote atual de cada tipo e avançar automaticamente.
- [ ] Revalidar estoque antes de iniciar a compra sem alterar PIX/cartão.
- [ ] Testar em desktop e celular.

## KYC e notificações administrativas
- [ ] Listar verificações pendentes independentemente dos eventos.
- [ ] Reutilizar abertura, aprovação e recusa de documentos na nova seção.
- [ ] Adicionar notificações automáticas para novo KYC e evento enviado.
- [ ] Validar a tela administrativa e os gatilhos sem tocar no `.env`.

## Recuperação de senha
- [x] Adicionar acesso pela tela de login.
- [x] Criar solicitação neutra com intervalo de reenvio.
- [x] Criar redefinição pública com validação e encerramento da sessão.
- [ ] Configurar e publicar o e-mail personalizado no backend definitivo (bloqueado pela conexão atual incorreta).
- [ ] Testar o link real e a entrada com a nova senha no backend definitivo.

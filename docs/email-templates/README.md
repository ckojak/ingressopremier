# 📧 Templates de Email - Eventix

Este diretório contém todos os templates de email personalizados da Eventix.

## 🎨 Design System

Todos os templates seguem o design system da Eventix:

- **Background**: `#0a0a0a` (preto)
- **Card Background**: `#18181b` (cinza escuro)
- **Primary Color**: `#06b6d4` (cyan)
- **Success Color**: `#10b981` (verde)
- **Error Color**: `#ef4444` (vermelho)
- **Text Primary**: `#ffffff` (branco)
- **Text Secondary**: `#d4d4d8` (cinza claro)
- **Text Muted**: `#a1a1aa` (cinza)
- **Border/Accent**: `#27272a` (cinza escuro)

## 📋 Templates Disponíveis

### Templates para Supabase Dashboard (Authentication > Email Templates)

| Arquivo | Descrição | Template no Supabase |
|---------|-----------|---------------------|
| `01-confirm-signup.html` | Confirmação de email no cadastro | **Confirm signup** |
| `02-magic-link.html` | Login sem senha via link | **Magic Link** |
| `03-reset-password.html` | Redefinição de senha | **Reset Password** |
| `04-invite-user.html` | Convite para novo usuário | **Invite user** |
| `05-change-email.html` | Confirmação de alteração de email | **Change Email Address** |

### Templates em Edge Functions

| Função | Descrição |
|--------|-----------|
| `send-ticket-email` | Email de confirmação de compra com ingressos |
| `send-notification` | Notificações (transferência aceita/recusada, cupom aplicado) |
| `send-transfer-email` | Convite de transferência de ingresso |

## 🔧 Como Usar nos Templates do Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard/project/rbkuplzntpayendbfzud/auth/templates)
2. Vá em **Authentication** → **Email Templates**
3. Selecione o template que deseja editar
4. Copie o conteúdo do arquivo HTML correspondente
5. Cole no campo **Body** do template
6. Ajuste o **Subject** (assunto) se necessário
7. Clique em **Save**

## 📝 Variáveis Disponíveis

### Templates de Autenticação (Supabase)

| Variável | Descrição |
|----------|-----------|
| `{{ .ConfirmationURL }}` | Link de confirmação/ação |
| `{{ .Email }}` | Email do usuário |
| `{{ .SiteURL }}` | URL do site configurado |
| `{{ .Token }}` | Token de confirmação |
| `{{ .TokenHash }}` | Hash do token |

## ✨ Características dos Templates

- ✅ Design responsivo
- ✅ Compatível com todos os clientes de email
- ✅ Tema escuro seguindo a identidade da Eventix
- ✅ Botões de ação destacados
- ✅ Links alternativos para fallback
- ✅ Avisos de segurança
- ✅ Footer com copyright

## 🚀 Personalizações

Para personalizar os templates:

1. **Logo**: Substitua o texto "Eventix" por uma imagem se preferir
2. **Cores**: Mantenha consistência com o design system
3. **Textos**: Adapte as mensagens conforme necessário
4. **Links**: Certifique-se que os links apontam para as URLs corretas

## ⚠️ Importante

- O Resend usa `onboarding@resend.dev` por padrão. Para usar um domínio próprio, configure em [resend.com/domains](https://resend.com/domains)
- Teste os emails antes de ir para produção
- Verifique se todos os links estão funcionando

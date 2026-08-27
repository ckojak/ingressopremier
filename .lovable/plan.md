# Apontar o projeto para o Supabase definitivo (qkslezounrjzuvafirxo)

## Situação atual (verificada)

- A conexão de backend ativa deste app é gerenciada pelo Lovable Cloud e aponta para `duasvoeejubywzoyldoa`.
- Referências a esse projeto antigo existem em 4 lugares:
  - `.env` (auto-gerado pela conexão): `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, chave publicável
  - `supabase/config.toml`
  - `.lovable/mcp/manifest.json` (issuer OAuth)
  - `supabase/functions/mcp/index.ts` (`projectRef`)

Nenhum arquivo foi alterado até agora.

## Ponto de bloqueio (precisa de você)

O `.env` e o `config.toml` são escritos pela integração nativa. Eu **não consigo** trocar a conexão nativa do Lovable para o seu Supabase próprio a partir daqui — essa troca é feita por você nas configurações do projeto (Connectors / Supabase), desconectando o Cloud atual e conectando o projeto `qkslezounrjzuvafirxo` com a sua conta.

Enquanto essa reconexão não for feita, editar só o `config.toml` deixaria o repositório divergente do backend que o app usa em runtime (auth, pagamentos, ingressos quebrariam silenciosamente). Por isso, o plano é executado em duas etapas.

## Etapa 1 — Você reconecta o Supabase

1. Abrir as configurações do projeto → Supabase/Connectors.
2. Conectar a conta que possui `qkslezounrjzuvafirxo` e selecionar esse projeto.
3. Confirmar comigo quando estiver feito. A integração reescreve `.env` (URL, project id e chave publicável) automaticamente.

## Etapa 2 — Eu alinho o restante do código

Depois que a conexão estiver apontando para `qkslezounrjzuvafirxo`:

1. `supabase/config.toml` → `project_id = "qkslezounrjzuvafirxo"`.
2. `supabase/functions/mcp/index.ts` e `src/lib/mcp/index.ts` → `projectRef` para o novo ref (issuer OAuth do MCP).
3. `.lovable/mcp/manifest.json` → issuer `https://qkslezounrjzuvafirxo.supabase.co/auth/v1`.
4. Conferência somente de leitura: listar tabelas, políticas RLS e Edge Functions existentes no novo projeto e comparar com o que o app espera (events, ticket_types, tickets, orders, profiles, user_roles, organizer_verifications, etc.), e listar quais secrets de pagamento precisam existir lá.
5. Relatar o resultado. Nenhuma migration, nenhum deploy de Edge Function, nenhuma mudança de dados sem você aprovar antes.

## Regra permanente

O backend definitivo deste app é `qkslezounrjzuvafirxo`. Não trocarei de projeto Supabase por nenhum motivo. Se eu identificar qualquer inconsistência que pareça exigir outro projeto, eu paro e te aviso antes de mexer.

Posso registrar isso na memória do projeto para valer em todas as sessões futuras.

## Se você preferir a alternativa

Se quiser, eu edito apenas o `supabase/config.toml` agora, ciente de que ele ficará divergente do `.env` até a reconexão. Não recomendo, mas é uma opção de uma linha.

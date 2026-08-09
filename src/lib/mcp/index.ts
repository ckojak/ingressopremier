import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listEvents from "./tools/list-events";
import getEvent from "./tools/get-event";
import listMyTickets from "./tools/list-my-tickets";
import listMyOrders from "./tools/list-my-orders";
import listMyEvents from "./tools/list-my-events";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "premier-pass",
  title: "Premier pass",
  version: "0.1.0",
  instructions:
    "Ferramentas da PremierPass (plataforma de ingressos). Use `list_events` e `get_event` para consultar eventos publicados e seus ingressos; `list_my_tickets` e `list_my_orders` para os dados do usuário autenticado; `list_my_events` para eventos organizados por ele. Respostas em português.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listEvents, getEvent, listMyTickets, listMyOrders, listMyEvents],
});

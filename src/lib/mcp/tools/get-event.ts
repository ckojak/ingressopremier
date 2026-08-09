import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_event",
  title: "Detalhes do evento",
  description: "Retorna os detalhes de um evento e os seus tipos de ingresso ativos, por id ou slug.",
  inputSchema: {
    event_id: z.string().uuid().optional().describe("ID (UUID) do evento."),
    slug: z.string().trim().min(1).optional().describe("Slug do evento."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ event_id, slug }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    if (!event_id && !slug) return { content: [{ type: "text", text: "Informe event_id ou slug." }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase.from("events").select("*").limit(1);
    query = event_id ? query.eq("id", event_id) : query.eq("slug", slug!);
    const { data: event, error } = await query.maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!event) return { content: [{ type: "text", text: "Evento não encontrado." }], isError: true };
    const { data: ticketTypes, error: ttError } = await supabase
      .from("ticket_types")
      .select("id, name, description, price, quantity_available, quantity_sold, max_per_order, is_active, sale_start, sale_end")
      .eq("event_id", event.id)
      .eq("is_active", true)
      .order("position", { ascending: true });
    if (ttError) return { content: [{ type: "text", text: ttError.message }], isError: true };
    const payload = { event, ticket_types: ticketTypes ?? [] };
    return { content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload };
  },
});

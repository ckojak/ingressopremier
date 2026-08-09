import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_tickets",
  title: "Meus ingressos",
  description: "Lista os ingressos do usuário autenticado, com o evento correspondente.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(50).describe("Número máximo de ingressos retornados."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("tickets")
      .select("id, ticket_code, status, is_used, used_at, checked_in_at, is_complimentary, created_at, events(id, title, start_date, city, venue_name), ticket_types(id, name, price)")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data ?? []) }], structuredContent: { tickets: data ?? [] } };
  },
});

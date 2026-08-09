import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_events",
  title: "Eventos que eu organizo",
  description: "Lista os eventos criados pelo usuário autenticado (produtor/organizador), incluindo rascunhos e pendentes.",
  inputSchema: {
    status: z.string().trim().min(1).optional().describe("Filtrar por status do evento (ex.: draft, pending, published)."),
    limit: z.number().int().min(1).max(100).default(50).describe("Número máximo de eventos retornados."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("events")
      .select("id, title, slug, status, start_date, end_date, city, category, created_at")
      .eq("organizer_id", ctx.getUserId())
      .order("start_date", { ascending: false })
      .limit(limit ?? 50);
    if (status) query = query.eq("status", status as never);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data ?? []) }], structuredContent: { events: data ?? [] } };
  },
});

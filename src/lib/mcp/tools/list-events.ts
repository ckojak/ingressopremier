import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_events",
  title: "Listar eventos",
  description: "Lista eventos publicados da PremierPass, com busca opcional por título, cidade ou categoria.",
  inputSchema: {
    search: z.string().trim().min(1).optional().describe("Texto para buscar no título do evento."),
    city: z.string().trim().min(1).optional().describe("Filtrar por cidade."),
    category: z.string().trim().min(1).optional().describe("Filtrar por categoria."),
    limit: z.number().int().min(1).max(50).default(20).describe("Número máximo de eventos retornados."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, city, category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("events")
      .select("id, title, slug, status, start_date, end_date, city, state, category, is_online, venue_name, short_description")
      .eq("status", "published")
      .order("start_date", { ascending: true })
      .limit(limit ?? 20);
    if (search) query = query.ilike("title", `%${search}%`);
    if (city) query = query.ilike("city", `%${city}%`);
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { events: data ?? [] },
    };
  },
});

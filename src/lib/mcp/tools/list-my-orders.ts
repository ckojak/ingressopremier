import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_orders",
  title: "Meus pedidos",
  description: "Lista os pedidos de compra do usuário autenticado, com status de pagamento e valores.",
  inputSchema: {
    status: z.string().trim().min(1).optional().describe("Filtrar por status do pedido (ex.: pending, paid)."),
    limit: z.number().int().min(1).max(100).default(20).describe("Número máximo de pedidos retornados."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("orders")
      .select("id, status, total_amount, service_fee, payment_method, paid_at, created_at, events(id, title, start_date)")
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) query = query.eq("status", status as never);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data ?? []) }], structuredContent: { orders: data ?? [] } };
  },
});

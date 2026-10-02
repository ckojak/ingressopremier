// Classifica o ingresso pela área de acesso e diz se entrega pulseira.
// Regra à prova de falha: se o NOME do lote OU a categoria indicar VIP/camarote,
// o staff é avisado para entregar pulseira. Só vira "pista" se nenhum dos dois indicar.

export type TicketAreaKind = "camarote" | "vip" | "pista";

export interface TicketArea {
  kind: TicketAreaKind;
  label: string;
  wristband: boolean;
  /** Bloco grande no celular do staff */
  blockClass: string;
  /** Etiqueta no ingresso do cliente */
  badgeClass: string;
}

// Remove acentos, emojis invisíveis (zero-width) e caixa, pra comparar nomes de lote
const clean = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .toLowerCase();

export const getTicketArea = (
  typeName?: string | null,
  category?: string | null
): TicketArea => {
  const name = clean(typeName);
  const cat = clean(category);

  if (name.includes("camarote") || cat === "camarote") {
    return {
      kind: "camarote",
      label: "CAMAROTE",
      wristband: true,
      blockClass: "bg-amber-500 text-black",
      badgeClass: "bg-amber-500/20 text-amber-500 border border-amber-500/40",
    };
  }

  if (name.includes("vip") || cat === "vip") {
    return {
      kind: "vip",
      label: "ÁREA VIP",
      wristband: true,
      blockClass: "bg-purple-600 text-white",
      badgeClass: "bg-purple-500/20 text-purple-400 border border-purple-500/40",
    };
  }

  return {
    kind: "pista",
    label: "PISTA",
    wristband: false,
    blockClass: "bg-sky-600 text-white",
    badgeClass: "bg-sky-500/20 text-sky-400 border border-sky-500/40",
  };
};

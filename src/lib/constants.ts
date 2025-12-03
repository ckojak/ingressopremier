// Event categories - shared across the app
export const EVENT_CATEGORIES = [
  "Festival",
  "Show",
  "Stand-up",
  "Teatro",
  "Esportes",
  "Workshop",
  "Conferência",
  "Eletrônica",
  "Sertanejo",
  "Outros",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

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

// Contact — single source of truth for the brand WhatsApp/phone number
export const WHATSAPP_NUMBER = "5521979934676";
export const WHATSAPP_DISPLAY = "(21) 97993-4676";
export const buildWhatsAppUrl = (message: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

// Legal
export const COMPANY_CNPJ = "51.963.177/0001-24";
export const COMPANY_NAME = "PremierPass";

// Event approval SLA (hours) — keep every user-facing text in sync
export const APPROVAL_SLA_HOURS = 4;

// Emails that always get the admin role (must match the handle_new_user trigger)
export const ADMIN_EMAILS = ["bmw.reta@hotmail.com", "bmw.kojak@gmail.com"] as const;

export const isAdminEmail = (email?: string | null) =>
  !!email && (ADMIN_EMAILS as readonly string[]).includes(email.toLowerCase());

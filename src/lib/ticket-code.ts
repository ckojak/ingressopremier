export const TICKET_QR_PREFIX = "PREMIERPASS-";

export const buildTicketQrValue = (ticketCode: string) =>
  `${TICKET_QR_PREFIX}${ticketCode.trim().toUpperCase()}`;

export const normalizeTicketCode = (raw: string) => {
  const value = (raw || "").trim().toUpperCase();
  return value.startsWith(TICKET_QR_PREFIX)
    ? value.slice(TICKET_QR_PREFIX.length)
    : value;
};
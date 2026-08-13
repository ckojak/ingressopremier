export const generateTicketPDF = (ticketData: {
  eventName: string;
  attendeeName: string;
  ticketType: string;
  ticketCode: string;
  startDate?: string;
  venueName?: string;
}) => {
  // Dispara a impressão nativa otimizada para salvar como PDF no telemóvel/desktop
  window.print();
};

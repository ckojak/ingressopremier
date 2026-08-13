import jsPDF from "jspdf";
import QRCode from "qrcode";
import { buildTicketQrValue } from "@/lib/ticket-code";
import { COMPANY_CNPJ } from "@/lib/constants";

export interface TicketPdfData {
  eventTitle: string;
  dateTime: string;
  location: string;
  holderName: string;
  ticketTypeName: string;
  ticketCode: string;
}

export async function downloadTicketPdf(data: TicketPdfData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  const cardWidth = pageWidth - margin * 2;

  // Header (roxo PremierPass)
  doc.setFillColor(109, 63, 232);
  doc.rect(margin, 48, cardWidth, 78, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("PremierPass", margin + 20, 85);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Ingresso digital • Ingressos Premium", margin + 20, 105);

  // Corpo
  doc.setDrawColor(226, 222, 240);
  doc.setLineWidth(1);
  doc.rect(margin, 126, cardWidth, 440);

  let y = 168;
  doc.setTextColor(24, 22, 38);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(doc.splitTextToSize(data.eventTitle, cardWidth - 40), margin + 20, y);
  y += 40;

  const rows: [string, string][] = [
    ["Data e hora", data.dateTime],
    ["Local", data.location],
    ["Titular", data.holderName],
    ["Tipo de ingresso", data.ticketTypeName],
    ["Código do ingresso", data.ticketCode],
  ];

  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 116, 140);
    doc.text(label.toUpperCase(), margin + 20, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(24, 22, 38);
    const lines = doc.splitTextToSize(value || "-", cardWidth - 40);
    doc.text(lines, margin + 20, y + 16);
    y += 22 + lines.length * 14;
  });

  // QR Code
  const qrDataUrl = await QRCode.toDataURL(buildTicketQrValue(data.ticketCode), {
    width: 600,
    margin: 1,
    errorCorrectionLevel: "H",
  });
  const qrSize = 160;
  doc.addImage(qrDataUrl, "PNG", pageWidth / 2 - qrSize / 2, y + 6, qrSize, qrSize);
  y += qrSize + 26;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 116, 140);
  doc.text("Apresente este QR Code na entrada do evento para validação.", pageWidth / 2, y, {
    align: "center",
  });

  doc.setFontSize(8);
  doc.text(`PremierPass • CNPJ ${COMPANY_CNPJ}`, pageWidth / 2, 590, { align: "center" });

  doc.save(`ingresso-${data.ticketCode}.pdf`);
}

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

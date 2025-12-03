export function formatCurrencyBRL(value: string | number): string {
  // Remove non-digits
  const digits = String(value).replace(/\D/g, "");
  
  if (!digits) return "";
  
  // Convert to number (cents)
  const cents = parseInt(digits, 10);
  
  // Format as BRL
  const formatted = (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatted;
}

export function parseCurrencyBRL(value: string): number {
  // Remove non-digits
  const digits = value.replace(/\D/g, "");
  
  if (!digits) return 0;
  
  // Convert from cents to decimal
  return parseInt(digits, 10) / 100;
}

export function formatCurrencyInput(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, "");
  
  if (!digits) return "";
  
  // Pad with zeros if needed
  const padded = digits.padStart(3, "0");
  
  // Split into integer and decimal parts
  const integerPart = padded.slice(0, -2);
  const decimalPart = padded.slice(-2);
  
  // Remove leading zeros from integer part (but keep at least one digit)
  const cleanInteger = integerPart.replace(/^0+/, "") || "0";
  
  // Add thousand separators
  const formattedInteger = cleanInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  return `${formattedInteger},${decimalPart}`;
}

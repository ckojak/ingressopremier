/**
 * Fingerprint leve do dispositivo (evidência antifraude) + device_id do Mercado Pago.
 * Não coleta nada além do que o navegador já expõe em qualquer requisição.
 */

let cachedFingerprint: string | null = null;

export async function getDeviceFingerprint(): Promise<string | null> {
  if (cachedFingerprint) return cachedFingerprint;
  if (typeof window === "undefined") return null;

  try {
    const raw = [
      navigator.userAgent,
      String(window.screen?.width ?? ""),
      String(window.screen?.height ?? ""),
      Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
      navigator.language ?? "",
    ].join("|");

    if (!crypto?.subtle) return null;

    const bytes = new TextEncoder().encode(raw);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    cachedFingerprint = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return cachedFingerprint;
  } catch {
    return null;
  }
}

/**
 * device_id gerado pelo script de segurança do Mercado Pago (security.js),
 * carregado no index.html. Fica disponível em window.MP_DEVICE_SESSION_ID.
 */
export function getMpDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  const id = (window as unknown as { MP_DEVICE_SESSION_ID?: string }).MP_DEVICE_SESSION_ID;
  return id || null;
}

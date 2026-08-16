// Captura os parâmetros UTM da URL do anúncio (?utm_source=instagram&utm_campaign=...)
// e mantém guardados durante toda a visita, pra grudar no pedido na hora da compra.
// Também carrega o Pixel do Meta / Google Analytics QUE CADA PRODUTOR cadastrou
// no próprio evento — não é um pixel único da PremierPass, é o do produtor.

const UTM_STORAGE_KEY = "premierpass_utm";

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export const captureUtmParams = () => {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const utm: UtmParams = {};
  let hasAny = false;

  (["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const).forEach((key) => {
    const value = params.get(key);
    if (value) {
      utm[key] = value;
      hasAny = true;
    }
  });

  // Só sobrescreve o que já estava guardado se a URL atual realmente trouxer UTM novo
  // (assim o rastreio sobrevive à navegação entre páginas do site até finalizar a compra)
  if (hasAny) {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
  }
};

export const getStoredUtmParams = (): UtmParams => {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

// ── Meta Pixel (do produtor) ──

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

const loadedPixels = new Set<string>();
const loadedGa4 = new Set<string>();

export const loadMetaPixel = (pixelId: string | null | undefined) => {
  if (!pixelId || typeof window === "undefined") return;
  if (loadedPixels.has(pixelId)) {
    window.fbq?.("trackSingle", pixelId, "PageView");
    return;
  }

  // Snippet oficial do Meta Pixel
  (function (f: any, b: Document, e: string, v: string) {
    if (f.fbq) return;
    const n: any = (f.fbq = function (...args: any[]) {
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    const t = b.createElement(e) as HTMLScriptElement;
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode?.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

  window.fbq?.("init", pixelId);
  window.fbq?.("trackSingle", pixelId, "PageView");
  loadedPixels.add(pixelId);
};

export const trackMetaEvent = (pixelId: string | null | undefined, eventName: string, params?: Record<string, unknown>) => {
  if (!pixelId || typeof window === "undefined" || !window.fbq) return;
  window.fbq("trackSingle", pixelId, eventName, params || {});
};

// ── Google Analytics 4 (do produtor) ──

export const loadGa4 = (measurementId: string | null | undefined) => {
  if (!measurementId || typeof window === "undefined") return;
  if (loadedGa4.has(measurementId)) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: any[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId);

  loadedGa4.add(measurementId);
};

export const trackGa4Event = (measurementId: string | null | undefined, eventName: string, params?: Record<string, unknown>) => {
  if (!measurementId || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", eventName, params || {});
};

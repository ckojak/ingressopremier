// Página de evento COM as informações do evento já no HTML (título, descrição, imagem e dados
// estruturados). WhatsApp, Instagram, Facebook, Telegram e os robôs de IA não executam JavaScript:
// sem isto, todo link de evento aparece com a prévia genérica do site.
// O visitante recebe exatamente o mesmo site de sempre (index.html), só com o <head> do evento.
// Se qualquer coisa falhar, devolve o index.html sem alteração: o site nunca fica fora do ar por causa disto.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://qkslezounrjzuvafirxo.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrc2xlem91bnJqenV2YWZpcnhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNjIyNTMsImV4cCI6MjEwMTkzODI1M30.CM4Xp_SMIerrcFbbioi9pKWO5rx2a4Ih8BObLR4AdNg";
const SITE_URL = "https://premierpass.com.br";
const BRAND = "Premier Pass";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const jsonForHtml = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");

const withTimeout = async (url, init = {}, ms = 3000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
};

const rest = async (path) => {
  const res = await withTimeout(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`supabase ${res.status}`);
  return res.json();
};

const absolute = (url) => {
  if (!url) return `${SITE_URL}/og-image.png`;
  return /^https?:\/\//i.test(url) ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const buildHead = (ev, tickets) => {
  const slugOrId = ev.slug || ev.id;
  const url = `${SITE_URL}/evento/${slugOrId}`;
  const title = `${ev.title} | ${BRAND}`;
  const description = String(
    ev.description || `Compre ingressos para ${ev.title} no ${BRAND} com segurança e entrega digital imediata.`
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 155);
  const image = absolute(ev.image_url || ev.banner_url);
  const online = !!ev.is_online;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: ev.title,
    description,
    startDate: ev.start_date || undefined,
    endDate: ev.end_date || undefined,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: online
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    image: [image],
    url,
    location: online
      ? { "@type": "VirtualLocation", url: ev.online_url || url }
      : {
          "@type": "Place",
          name: ev.venue_name || ev.title,
          address: {
            "@type": "PostalAddress",
            streetAddress: ev.venue_address || undefined,
            addressLocality: ev.city || undefined,
            addressRegion: ev.state || undefined,
            addressCountry: "BR",
          },
        },
    organizer: { "@type": "Organization", name: BRAND, url: SITE_URL },
    offers: tickets.map((t) => ({
      "@type": "Offer",
      name: t.name,
      price: Number(t.price),
      priceCurrency: "BRL",
      availability:
        Number(t.quantity) - Number(t.quantity_sold || 0) > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      url,
    })),
  };

  // data-rh="true": quando o site carrega, o React Helmet troca estas tags pelas dele (sem duplicar).
  return [
    `<title data-rh="true">${esc(title)}</title>`,
    `<meta data-rh="true" name="description" content="${esc(description)}" />`,
    `<link data-rh="true" rel="canonical" href="${esc(url)}" />`,
    `<meta data-rh="true" property="og:type" content="event" />`,
    `<meta data-rh="true" property="og:url" content="${esc(url)}" />`,
    `<meta data-rh="true" property="og:title" content="${esc(title)}" />`,
    `<meta data-rh="true" property="og:description" content="${esc(description)}" />`,
    `<meta data-rh="true" property="og:image" content="${esc(image)}" />`,
    `<meta data-rh="true" property="og:locale" content="pt_BR" />`,
    `<meta data-rh="true" property="og:site_name" content="${esc(BRAND)}" />`,
    `<meta data-rh="true" name="twitter:card" content="summary_large_image" />`,
    `<meta data-rh="true" name="twitter:title" content="${esc(title)}" />`,
    `<meta data-rh="true" name="twitter:description" content="${esc(description)}" />`,
    `<meta data-rh="true" name="twitter:image" content="${esc(image)}" />`,
    `<script data-rh="true" type="application/ld+json">${jsonForHtml(schema)}</script>`,
  ].join("\n    ");
};

const stripGenericTags = (html) =>
  html
    .replace(/<title[^>]*>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[^>]*>/gi, "")
    .replace(/<meta\s+property="og:(title|description|type|image|url|site_name|locale)"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:(card|title|description|image)"[^>]*>/gi, "");

export default async function handler(req, res) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";

  let template;
  try {
    const t = await withTimeout(`${proto}://${host}/index.html`, {}, 4000);
    if (!t.ok) throw new Error(`index ${t.status}`);
    template = await t.text();
  } catch (_) {
    // Sem o template não dá para montar nada: manda o navegador para a raiz do site.
    res.statusCode = 302;
    res.setHeader("Location", "/");
    return res.end();
  }

  const send = (html, extra = {}) => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", extra.cache || "public, s-maxage=300, stale-while-revalidate=86400");
    if (extra.noindex) res.setHeader("X-Robots-Tag", "noindex");
    return res.end(html);
  };

  try {
    const param = String(req.query?.slug || "").trim();
    if (!param) return send(template, { cache: "public, s-maxage=60" });

    const filter = UUID_RE.test(param) ? `id=eq.${param}` : `slug=eq.${encodeURIComponent(param)}`;
    const events = await rest(
      `events?${filter}&status=eq.published&select=id,slug,title,description,image_url,banner_url,start_date,end_date,venue_name,venue_address,city,state,is_online,online_url&limit=1`
    );

    // Não achou (rascunho, em análise, link errado): entrega o site normal e pede para não indexar.
    if (!events.length) return send(template, { cache: "public, s-maxage=60", noindex: true });

    const ev = events[0];
    let tickets = [];
    try {
      tickets = await rest(
        `ticket_types?event_id=eq.${ev.id}&is_active=eq.true&select=name,price,quantity,quantity_sold&order=price.asc`
      );
    } catch (_) {
      tickets = [];
    }

    const html = stripGenericTags(template).replace("</head>", `    ${buildHead(ev, tickets)}\n  </head>`);
    return send(html);
  } catch (_) {
    return send(template, { cache: "public, s-maxage=30" });
  }
}

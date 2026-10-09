// Sitemap dos eventos (atualiza sozinho). As páginas fixas continuam no /sitemap.xml.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://qkslezounrjzuvafirxo.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrc2xlem91bnJqenV2YWZpcnhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNjIyNTMsImV4cCI6MjEwMTkzODI1M30.CM4Xp_SMIerrcFbbioi9pKWO5rx2a4Ih8BObLR4AdNg";
const SITE_URL = "https://premierpass.com.br";
const FALLBACK_DURATION_MS = 12 * 60 * 60 * 1000; // mesma regra do site: sem end_date, evento dura 12h

const xmlEsc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export default async function handler(req, res) {
  let events = [];
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/events?status=eq.published&select=id,slug,start_date,end_date,updated_at&order=start_date.asc&limit=1000`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!r.ok) throw new Error(`supabase ${r.status}`);
    events = await r.json();
  } catch (_) {
    res.statusCode = 503;
    res.setHeader("Retry-After", "300");
    return res.end("Sitemap temporariamente indisponível");
  }

  const now = Date.now();
  const urls = events
    .filter((e) => {
      const end = e.end_date
        ? new Date(e.end_date).getTime()
        : new Date(e.start_date).getTime() + FALLBACK_DURATION_MS;
      return Number.isFinite(end) && end > now; // só eventos que ainda não acabaram
    })
    .map((e) => {
      const loc = `${SITE_URL}/evento/${e.slug || e.id}`;
      const lastmod = e.updated_at ? new Date(e.updated_at).toISOString() : null;
      return `  <url>\n    <loc>${xmlEsc(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=3600");
  return res.end(xml);
}

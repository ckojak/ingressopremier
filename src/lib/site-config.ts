// Site configuration - determines redirect behavior and branding
// This file allows the same codebase to work for multiple sites sharing one Supabase

export type SiteId = "premierpass" | "quintal";

// Detect current site based on hostname
export const getCurrentSite = (): SiteId => {
  if (typeof window === "undefined") return "premierpass";
  
  const hostname = window.location.hostname.toLowerCase();
  
  if (hostname.includes("quintal")) {
    return "quintal";
  }
  
  // Default to premierpass for this deployment
  return "premierpass";
};

// Site-specific configuration
export const SITE_CONFIG: Record<SiteId, {
  name: string;
  tagline: string;
  adminRedirect: string;
  homeRedirect: string;
  authRedirect: string;
}> = {
  premierpass: {
    name: "PremierPass",
    tagline: "Ingressos Premium",
    adminRedirect: "/admin",
    homeRedirect: "/",
    authRedirect: "/auth",
  },
  quintal: {
    name: "Quintal",
    tagline: "Eventos",
    adminRedirect: "/admin",
    homeRedirect: "/",
    authRedirect: "/auth",
  },
};

// Get current site config
export const getSiteConfig = () => {
  const siteId = getCurrentSite();
  return { siteId, ...SITE_CONFIG[siteId] };
};

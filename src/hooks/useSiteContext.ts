import { useMemo } from "react";

export type SiteId = "premierpass" | "quintal";

// Detect current site based on hostname
export const detectSiteFromHostname = (): SiteId => {
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
  defaultAdminRedirect: boolean; // If true, admins go to /admin after login
}> = {
  premierpass: {
    name: "PremierPass",
    tagline: "Ingressos Premium",
    adminRedirect: "/admin",
    homeRedirect: "/",
    authRedirect: "/auth",
    defaultAdminRedirect: true, // PremierPass admins always go to admin panel
  },
  quintal: {
    name: "Quintal",
    tagline: "Eventos",
    adminRedirect: "/admin",
    homeRedirect: "/",
    authRedirect: "/auth",
    defaultAdminRedirect: false, // Quintal users go to home by default
  },
};

/**
 * Hook to get the current site context
 * Returns siteId, config, and helper functions for filtering
 */
export const useSiteContext = () => {
  const siteId = useMemo(() => detectSiteFromHostname(), []);
  const config = useMemo(() => SITE_CONFIG[siteId], [siteId]);

  return {
    siteId,
    config,
    name: config.name,
    tagline: config.tagline,
    adminRedirect: config.adminRedirect,
    homeRedirect: config.homeRedirect,
    authRedirect: config.authRedirect,
    defaultAdminRedirect: config.defaultAdminRedirect,
    
    // Helper to build filter object for queries
    getSiteFilter: () => ({ site_id: siteId }),
    
    // Helper to check if we should apply site filter
    shouldFilterBySite: () => true,
  };
};

// Export standalone function for non-React contexts
export const getCurrentSiteConfig = () => {
  const siteId = detectSiteFromHostname();
  return { siteId, ...SITE_CONFIG[siteId] };
};

import { useMemo } from "react";

export type SiteId = "premierpass";

// Detect current site based on hostname
export const detectSiteFromHostname = (): SiteId => {
  // Always return premierpass
  return "premierpass";
};

// Site-specific configuration
export const SITE_CONFIG: Record<SiteId, {
  name: string;
  tagline: string;
  adminRedirect: string;
  homeRedirect: string;
  authRedirect: string;
  defaultAdminRedirect: boolean;
  // New: controls event visibility logic
  showAllSiteEvents: boolean; // If true, shows events from all sites (PremierPass is universal)
}> = {
  premierpass: {
    name: "PremierPass",
    tagline: "Ingressos Premium",
    adminRedirect: "/admin",
    homeRedirect: "/",
    authRedirect: "/auth",
    defaultAdminRedirect: true,
    showAllSiteEvents: true, // PremierPass shows all events
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
    showAllSiteEvents: config.showAllSiteEvents,
    
    // Helper to build filter object for queries
    getSiteFilter: () => ({ site_id: siteId }),
    
    // Helper to check if we should apply site filter
    shouldFilterBySite: () => true,
    
    /**
     * Returns array of site_ids to include in event queries
     * Plataforma nacional single-tenant: sempre 'premierpass'
     */
    getVisibleSiteIds: (): SiteId[] => {
      return ["premierpass"]; // Only PremierPass
    },
    
    /**
     * Returns array of site_ids for statistics (always own site only)
     * Each site sees only its own statistics
     */
    getStatsSiteIds: (): SiteId[] => {
      return [siteId]; // Stats are always isolated per site
    },
  };
};

// Export standalone function for non-React contexts
export const getCurrentSiteConfig = () => {
  const siteId = detectSiteFromHostname();
  return { 
    siteId, 
    ...SITE_CONFIG[siteId],
    getVisibleSiteIds: (): SiteId[] => {
      return ["premierpass"];
    },
    getStatsSiteIds: (): SiteId[] => [siteId],
  };
};

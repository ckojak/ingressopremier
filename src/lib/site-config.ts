// Site configuration - determines redirect behavior and branding
// This file allows the same codebase to work for multiple sites sharing one Supabase
// Re-exports from the hook for backwards compatibility

export type { SiteId } from "@/hooks/useSiteContext";
export { 
  detectSiteFromHostname as getCurrentSite,
  getCurrentSiteConfig as getSiteConfig,
  SITE_CONFIG,
  useSiteContext,
} from "@/hooks/useSiteContext";

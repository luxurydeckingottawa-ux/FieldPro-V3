/**
 * Company Configuration — Centralized branding and contact info.
 *
 * ALL hardcoded "Luxury Decking" references across the codebase should
 * pull from here instead.  When FieldPro becomes multi-tenant, this
 * will read from the org's Supabase profile instead of constants.
 *
 * Phase 1: constants (now)
 * Phase 2: load from Supabase org_settings table on login
 */

export interface CompanyConfig {
  name: string;
  legalName: string;
  tagline: string;
  phone: string;
  email: string;
  officeEmail: string;
  website: string;
  city: string;
  province: string;
  country: string;
  fullAddress: string;
  googleReviewUrl: string;
  logo: {
    white: string;
    black: string;
    icon: string;
  };
}

/**
 * Default company config for Luxury Decking.
 * In the future, this will be loaded per-org from Supabase.
 */
export const COMPANY: CompanyConfig = {
  name: 'Luxury Decking',
  legalName: 'Luxury Decking Ottawa',
  tagline: 'Premium Outdoor Living',
  phone: '(613) 707-3060',
  email: 'jack@luxurydecking.ca',
  officeEmail: import.meta.env.VITE_OFFICE_EMAIL || 'luxurydeckingteam@gmail.com',
  website: 'luxurydecking.ca',
  city: 'Ottawa',
  province: 'ON',
  country: 'Canada',
  fullAddress: 'Ottawa, ON',
  googleReviewUrl: import.meta.env.VITE_GOOGLE_REVIEW_URL || 'https://g.page/r/CexyItAnWVxTEAI/review',
  logo: {
    white: '/assets/logo-white.png',
    black: '/assets/logo-black.png',
    icon: '/assets/logo-icon.png',
  },
};

/**
 * Helper to get the company name. Use this everywhere instead of
 * hardcoding "Luxury Decking".
 */
export const companyName = () => COMPANY.name;
export const companyPhone = () => COMPANY.phone;
export const companyEmail = () => COMPANY.email;

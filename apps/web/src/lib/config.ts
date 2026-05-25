/**
 * @module config
 * @description Centralized runtime configuration for the Standard web frontend.
 *
 * All environment-dependent values should be imported from here.
 * In production, VITE_API_URL is set via .env.production.
 */

/** Base URL for the Standard API Gateway */
export const API_URL =
  import.meta.env.VITE_API_URL || "https://standard-api.bekaa.eu";

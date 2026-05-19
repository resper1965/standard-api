/**
 * @module auth-client
 * @description Standard Auth client for the web frontend.
 *
 * Uses the centralized createStandardAuthClient from @standard/auth/client
 * which includes organization + admin plugins matching the server config.
 *
 * In production, VITE_API_BASE_URL points to the Cloudflare Worker gateway.
 * In dev, Vite proxy forwards /api → localhost:8787 so baseURL can be empty.
 */
import { createStandardAuthClient } from "@standard/auth/client";

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const authClient = createStandardAuthClient(API_BASE);

export const { useSession, signIn, signOut, signUp } = authClient;

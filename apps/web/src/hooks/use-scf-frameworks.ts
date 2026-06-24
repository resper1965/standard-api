/**
 * useScfFrameworks — fetches SCF frameworks with localStorage cache (24 h TTL).
 *
 * On first load the hook checks localStorage. If the cached data is still fresh
 * it returns immediately without hitting the network. Otherwise it fetches from
 * the API, updates the cache, and returns the result.
 *
 * This avoids the "loading SCF standard frameworks…" delay every time the
 * compliance-assessment modal is opened.
 */

import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

export interface ScfFramework {
  framework_id: string;
  framework_code: string;
  framework_name: string;
  publisher?: string;
  status: string;
}

interface ScfVersion {
  scf_version_id: string;
  version_label: string;
}

const CACHE_KEY = "aegis:scf_frameworks_v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  data: ScfFramework[];
  versions: ScfVersion[];
  cachedAt: number;
}

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writeCache(data: ScfFramework[], versions: ScfVersion[]) {
  try {
    const entry: CacheEntry = { data, versions, cachedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage might be full — silently ignore
  }
}

/**
 * Invalidate the SCF frameworks cache (call this after an SCF import).
 */
export function invalidateScfFrameworksCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

interface UseScfFrameworksResult {
  frameworks: ScfFramework[];
  versions: ScfVersion[];
  loading: boolean;
  fromCache: boolean;
  error: string | null;
}

export function useScfFrameworks(): UseScfFrameworksResult {
  const [frameworks, setFrameworks] = useState<ScfFramework[]>([]);
  const [versions, setVersions] = useState<ScfVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent double-fetch in StrictMode
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;

    // 1. Try cache first — instant load
    const cached = readCache();
    if (cached) {
      setFrameworks(cached.data);
      setVersions(cached.versions);
      setFromCache(true);
      setLoading(false);
      return;
    }

    // 2. Cache miss — fetch from API
    async function fetchAll() {
      try {
        const [fwRes, verRes] = await Promise.all([
          api<{ data: ScfFramework[] }>("/api/v1/scf/frameworks"),
          api<{ data: ScfVersion[] }>("/api/v1/scf/versions"),
        ]);
        const fw = fwRes?.data ?? [];
        const ver = verRes?.data ?? [];
        setFrameworks(fw);
        setVersions(ver);
        writeCache(fw, ver);
      } catch (err: any) {
        console.error("[useScfFrameworks] fetch failed:", err);
        setError(err?.message ?? "Failed to load SCF frameworks");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  return { frameworks, versions, loading, fromCache, error };
}

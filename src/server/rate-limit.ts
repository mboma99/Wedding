import { headers } from "next/headers";

/**
 * Counts attempts per visitor and blocks them once they go over a limit.
 *
 * Counts live in this server's memory: they reset when it restarts, and each
 * server instance keeps its own. That's enough to stop someone hammering the
 * admin login or the RSVP lookup from one place, without paying for a
 * database read on every try.
 */
type Window = { count: number; resetAt: number };

const buckets = new Map<string, Map<string, Window>>();

function bucket(name: string) {
  let found = buckets.get(name);
  if (!found) {
    found = new Map();
    buckets.set(name, found);
  }
  return found;
}

/** The visitor's address, as reported by the hosting proxy. */
export async function visitorKey() {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || list.get("x-real-ip") || "unknown";
}

type Limit = { name: string; max: number; windowMs: number };

/** Minutes until this visitor may try again, or 0 if they're allowed now. */
export function blockedFor({ name, max }: Limit, key: string) {
  const entry = bucket(name).get(key);
  if (!entry || entry.resetAt <= Date.now() || entry.count < max) return 0;
  return Math.ceil((entry.resetAt - Date.now()) / 60000);
}

/** Record one attempt. */
export function recordAttempt({ name, windowMs }: Limit, key: string) {
  const map = bucket(name);
  const now = Date.now();
  const entry = map.get(key);

  if (!entry || entry.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    entry.count += 1;
  }

  // Keep memory bounded: drop expired entries now and then.
  if (map.size > 5000) {
    for (const [k, v] of map) if (v.resetAt <= now) map.delete(k);
  }
}

export function clearAttempts({ name }: Limit, key: string) {
  bucket(name).delete(key);
}

/** Five wrong passwords in 15 minutes locks that visitor out for the rest of it. */
export const ADMIN_LOGIN_LIMIT: Limit = { name: "admin-login", max: 5, windowMs: 15 * 60 * 1000 };

/** Twenty lookups in 10 minutes is far more than a real guest needs. */
export const RSVP_LOOKUP_LIMIT: Limit = { name: "rsvp-lookup", max: 20, windowMs: 10 * 60 * 1000 };

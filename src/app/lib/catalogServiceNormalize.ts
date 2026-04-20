/**
 * Single normalization path for catalog services from `/public/*` JSON.
 * Keep in sync with `ADMIN/src/app/lib/catalogShapeTypes.ts` → `migrateServiceItem`.
 */

import type { ServiceItem } from './branchCatalogTypes';

function coalesceNonNegativeInt(n: unknown, fallback: number): number {
  if (typeof n === 'number' && Number.isFinite(n)) return Math.max(0, Math.floor(n));
  const p = parseInt(String(n), 10);
  if (!Number.isNaN(p)) return Math.max(0, p);
  return fallback;
}

function snapDurationMinutes(raw: unknown): number {
  let v =
    typeof raw === 'number' && Number.isFinite(raw) ? Math.round(raw) : parseInt(String(raw ?? 60), 10);
  if (!Number.isFinite(v) || v < 30) v = 60;
  const rem = v % 30;
  if (rem) v += 30 - rem;
  return Math.min(480, v);
}

function readBooleanField(
  x: Record<string, unknown>,
  camel: string,
  snake: string,
  defaultIfMissing: boolean
): boolean {
  const v = x[camel] ?? x[snake];
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') {
    if (v === 1) return true;
    if (v === 0) return false;
  }
  if (typeof v === 'string') {
    const t = v.trim().toLowerCase();
    if (t === 'true' || t === '1' || t === 'yes') return true;
    if (t === 'false' || t === '0' || t === 'no') return false;
  }
  return defaultIfMissing;
}

/** Normalize API / snapshot JSON into a `ServiceItem` (snake_case + camelCase + 0/1). */
export function normalizeCatalogServiceItem(s: unknown): ServiceItem {
  const x = s as Record<string, unknown>;
  const pts = x.descriptionPoints ?? x.description_points;

  let freeCoffeeCount = 0;
  const rawFc = x.freeCoffeeCount ?? x.free_coffee_count;
  if (rawFc !== undefined && rawFc !== null) {
    freeCoffeeCount = coalesceNonNegativeInt(rawFc, 0);
  } else if (x.includesFreeCoffee === true) {
    freeCoffeeCount = 1;
  }

  const eligibleForLoyaltyPoints = readBooleanField(
    x,
    'eligibleForLoyaltyPoints',
    'eligible_for_loyalty_points',
    true
  );
  const recommended = readBooleanField(x, 'recommended', 'recommended', false);
  const active = readBooleanField(x, 'active', 'active', true);

  const rawGid = x.catalogGroupId ?? x.catalog_group_id;
  const catalogGroupId =
    typeof rawGid === 'string' && rawGid.trim() ? String(rawGid).trim() : undefined;

  return {
    id: String(x.id ?? ''),
    name: String(x.name ?? ''),
    price: typeof x.price === 'number' ? x.price : parseFloat(String(x.price)) || 0,
    ...(catalogGroupId ? { catalogGroupId } : {}),
    freeCoffeeCount,
    eligibleForLoyaltyPoints,
    recommended,
    descriptionPoints: Array.isArray(pts)
      ? pts.map(String)
      : typeof pts === 'string'
        ? pts.split('\n').map((l) => l.trim()).filter(Boolean)
        : [],
    active,
    durationMinutes: snapDurationMinutes(x.durationMinutes ?? x.duration_minutes),
  };
}

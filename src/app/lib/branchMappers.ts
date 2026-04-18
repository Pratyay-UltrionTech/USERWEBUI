import type { AddonItem, ServiceItem, UserBranch } from './branchCatalogTypes';

export function mapBranch(raw: any): UserBranch {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    location: String(raw.location ?? ''),
    zipCode: String(raw.zip_code ?? raw.zipCode ?? ''),
    bayCount: Number(raw.bay_count ?? raw.bayCount ?? 1),
    openTime: String(raw.open_time ?? raw.openTime ?? '09:00'),
    closeTime: String(raw.close_time ?? raw.closeTime ?? '18:00'),
  };
}

export function mapService(raw: any): ServiceItem {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    price: Number(raw.price ?? 0),
    freeCoffeeCount: Number(raw.free_coffee_count ?? raw.freeCoffeeCount ?? 0),
    recommended: raw.recommended === true,
    descriptionPoints: Array.isArray(raw.description_points ?? raw.descriptionPoints)
      ? (raw.description_points ?? raw.descriptionPoints)
      : [],
    active: raw.active !== false,
  };
}

export function mapAddon(raw: any): AddonItem {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    price: Number(raw.price ?? 0),
    descriptionPoints: Array.isArray(raw.description_points ?? raw.descriptionPoints)
      ? (raw.description_points ?? raw.descriptionPoints)
      : [],
    active: raw.active !== false,
  };
}

import { fetchPublicJson } from './userPublicApi';

const MOBILE_SNAPSHOT_KEY = 'carwash_user_mobile_snapshot_v1';

type MobileServiceItem = {
  id: string;
  name: string;
  price: number;
  recommended?: boolean;
  description_points?: string[];
  active?: boolean;
};

type MobileAddonItem = {
  id: string;
  name: string;
  price: number;
  description_points?: string[];
  active?: boolean;
};

type MobileVehicleBlock = {
  id: string;
  vehicle_type: string;
  services: MobileServiceItem[];
  addons: MobileAddonItem[];
};

type MobilePromotion = {
  id: string;
  code_name: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  validity_start: string;
  validity_end: string;
  applicable_service_ids: string[];
  applicable_vehicle_types: string[];
};

type MobileDayRule = {
  id: string;
  title: string;
  description: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  applicable_service_ids: string[];
  applicable_vehicle_types: string[];
  applicable_days: string[];
  time_window_start: string;
  time_window_end: string;
  validity_start: string;
  validity_end: string;
};

type MobileSlotSettings = {
  slot_duration_minutes: number;
  open_time: string;
  close_time: string;
  slot_window_active_by_key: Record<string, boolean>;
};

type MobileServiceArea = {
  requested_pin_code: string;
  city_pin_code: string;
  manager_id: string;
  available_drivers: number;
};

export type MobileSnapshot = {
  service_area: MobileServiceArea;
  vehicle_blocks: MobileVehicleBlock[];
  /** When present, these add-ons apply to every vehicle (replaces per-block add-ons). */
  mobile_addons?: MobileAddonItem[];
  promotions: MobilePromotion[];
  day_time_rules: MobileDayRule[];
  slot_settings: MobileSlotSettings | null;
};

export type MobileServiceability = {
  serviceable: boolean;
  city_pin_code: string;
  available_drivers: number;
  requested_pin_code?: string;
};

export type MobileSlotOption = {
  startTime: string;
  endTime: string;
  label: string;
  capacity: number;
  booked: number;
  available: number;
};

function parseHHMM(v: string): number {
  const [hh, mm] = v.split(':');
  const h = Number.parseInt(hh ?? '0', 10);
  const m = Number.parseInt(mm ?? '0', 10);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function fmtHHMM(total: number): string {
  const mins = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function to12h(hhmm: string): string {
  const [hhRaw, mm] = hhmm.split(':');
  let hh = Number.parseInt(hhRaw ?? '0', 10);
  const suffix = hh >= 12 ? 'PM' : 'AM';
  if (hh === 0) hh = 12;
  else if (hh > 12) hh -= 12;
  return `${String(hh).padStart(2, '0')}:${mm ?? '00'} ${suffix}`;
}

function inDateRange(dateISO: string, start?: string, end?: string): boolean {
  if (start && dateISO < start) return false;
  if (end && dateISO > end) return false;
  return true;
}

function inTimeRange(timeHHMM: string, start?: string, end?: string): boolean {
  if (!start || !end) return true;
  const t = parseHHMM(timeHHMM);
  return t >= parseHHMM(start) && t < parseHHMM(end);
}

function dayShortName(dateISO: string): string {
  const date = new Date(`${dateISO}T00:00:00`);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export function getMobilePinFromBranchId(branchId?: string | null): string | null {
  if (!branchId) return null;
  if (!branchId.startsWith('mobile-')) return null;
  return branchId.slice('mobile-'.length) || null;
}

export function getCachedMobileSnapshot(): MobileSnapshot | null {
  try {
    const raw = sessionStorage.getItem(MOBILE_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MobileSnapshot;
  } catch {
    return null;
  }
}

function setCachedMobileSnapshot(snapshot: MobileSnapshot): void {
  try {
    sessionStorage.setItem(MOBILE_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore cache write errors
  }
}

export async function checkMobileServiceability(pinCode: string): Promise<MobileServiceability> {
  return fetchPublicJson<MobileServiceability>(
    `/public/mobile/serviceability/${encodeURIComponent(pinCode)}`
  );
}

export async function fetchMobileSnapshot(pinCode: string): Promise<MobileSnapshot> {
  const snapshot = await fetchPublicJson<MobileSnapshot>(
    `/public/mobile/snapshot?pin_code=${encodeURIComponent(pinCode)}`
  );
  setCachedMobileSnapshot(snapshot);
  return snapshot;
}

export function listMobileVehicleTypes(snapshot: MobileSnapshot): string[] {
  return snapshot.vehicle_blocks.map((b) => b.vehicle_type).filter(Boolean);
}

export function getMobileCatalogForVehicle(snapshot: MobileSnapshot, vehicleType: string): {
  services: Array<{ id: string; name: string; price: number; recommended: boolean; descriptionPoints: string[] }>;
  addons: Array<{ id: string; name: string; price: number; descriptionPoints: string[] }>;
} {
  const block = snapshot.vehicle_blocks.find((b) => b.vehicle_type === vehicleType);
  if (!block) return { services: [], addons: [] };
  const globalAddons = (snapshot.mobile_addons ?? []).filter((a) => a.active !== false);
  const legacyBlockAddons = (block.addons ?? []).filter((a) => a.active !== false);
  const addonRows = globalAddons.length > 0 ? globalAddons : legacyBlockAddons;
  return {
    services: (block.services ?? [])
      .filter((s) => s.active !== false)
      .map((s) => ({
        id: s.id,
        name: s.name,
        price: Number(s.price ?? 0),
        recommended: s.recommended === true,
        descriptionPoints: Array.isArray(s.description_points) ? s.description_points : [],
      })),
    addons: addonRows.map((a) => ({
      id: a.id,
      name: a.name,
      price: Number(a.price ?? 0),
      descriptionPoints: Array.isArray(a.description_points) ? a.description_points : [],
    })),
  };
}

export function listApplicableMobileDiscounts(
  snapshot: MobileSnapshot,
  dateISO: string,
  timeHHMM: string,
  serviceId: string,
  vehicleType: string
): Array<{ id: string; title: string; description: string; discountType: 'percentage' | 'flat'; discountValue: number }> {
  return (snapshot.day_time_rules ?? [])
    .filter((rule) => {
      const serviceOk =
        !rule.applicable_service_ids?.length || rule.applicable_service_ids.includes(serviceId);
      const vehicleOk =
        !rule.applicable_vehicle_types?.length || rule.applicable_vehicle_types.includes(vehicleType);
      const dateOk = inDateRange(dateISO, rule.validity_start, rule.validity_end);
      const dayOk =
        !rule.applicable_days?.length || rule.applicable_days.includes(dayShortName(dateISO));
      const timeOk = inTimeRange(timeHHMM, rule.time_window_start, rule.time_window_end);
      return serviceOk && vehicleOk && dateOk && dayOk && timeOk;
    })
    .map((rule) => ({
      id: rule.id,
      title: rule.title,
      description: rule.description,
      discountType: rule.discount_type,
      discountValue: Number(rule.discount_value ?? 0),
    }));
}

export function listMobilePromoCodes(
  snapshot: MobileSnapshot,
  dateISO?: string
): Array<{ id: string; codeName: string; discountType: 'percentage' | 'flat'; discountValue: number }> {
  return (snapshot.promotions ?? [])
    .filter((promo) => (dateISO ? inDateRange(dateISO, promo.validity_start, promo.validity_end) : true))
    .map((promo) => ({
      id: promo.id,
      codeName: promo.code_name,
      discountType: promo.discount_type,
      discountValue: Number(promo.discount_value ?? 0),
    }));
}

export function listMobileSlots(snapshot: MobileSnapshot): MobileSlotOption[] {
  const settings = snapshot.slot_settings;
  if (!settings) return [];
  const open = parseHHMM(settings.open_time);
  let close = parseHHMM(settings.close_time);
  if (close <= open) close += 24 * 60;
  const duration = Math.max(15, Number(settings.slot_duration_minutes ?? 60));
  const capacity = Math.max(0, Number(snapshot.service_area.available_drivers ?? 0));
  const out: MobileSlotOption[] = [];
  for (let t = open; t + duration <= close; t += duration) {
    const start = fmtHHMM(t);
    const end = fmtHHMM(t + duration);
    const key = `${start}|${end}`;
    const active = settings.slot_window_active_by_key?.[key] !== false;
    out.push({
      startTime: start,
      endTime: end,
      label: `${to12h(start)} - ${to12h(end)}`,
      capacity: active ? capacity : 0,
      booked: 0,
      available: active ? capacity : 0,
    });
  }
  return out;
}

export type MobileBookingCreateInput = {
  cityPinCode: string;
  customerName: string;
  phone: string;
  address: string;
  vehicleSummary: string;
  serviceId?: string | null;
  vehicleType: string;
  selectedAddonIds: string[];
  slotDate: string;
  startTime: string;
  endTime: string;
  notes?: string;
  tipCents?: number;
};

export type MobileBookingRow = {
  id: string;
  status: string;
  tip_cents?: number;
};

export async function fetchMobileBookingById(bookingId: string): Promise<MobileBookingRow | null> {
  try {
    return await fetchPublicJson<MobileBookingRow>(`/public/mobile/bookings/${bookingId}`);
  } catch {
    return null;
  }
}

export async function createMobileOnlineBooking(
  input: MobileBookingCreateInput
): Promise<{ ok: true; booking: MobileBookingRow } | { ok: false }> {
  try {
    const tip = Math.min(50_000, Math.max(0, Math.floor(Number(input.tipCents ?? 0))));
    const out = await fetchPublicJson<MobileBookingRow>('/public/mobile/bookings', {
      method: 'POST',
      body: JSON.stringify({
        city_pin_code: input.cityPinCode,
        customer_name: input.customerName,
        phone: input.phone,
        address: input.address,
        vehicle_summary: input.vehicleSummary,
        service_id: input.serviceId ?? null,
        vehicle_type: input.vehicleType,
        selected_addon_ids: input.selectedAddonIds,
        slot_date: input.slotDate,
        start_time: input.startTime,
        end_time: input.endTime,
        source: 'online',
        notes: input.notes ?? '',
        tip_cents: tip,
      }),
    });
    return { ok: true, booking: out };
  } catch {
    return { ok: false };
  }
}

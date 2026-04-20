import type {
  AddonItem,
  AdminState,
  BranchData,
  DayTimePriceRule,
  PromoCode,
  ServiceItem,
  UserBranch,
} from './branchCatalogTypes';
import { fetchPublicJson } from './userPublicApi';
import { getPublicCatalogState, hydratePublicCatalogFromApi } from './publicDataStore';

export type {
  AddonItem,
  AdminState,
  BranchData,
  DayTimePriceRule,
  PromoCode,
  ServiceItem,
  UserBranch,
} from './branchCatalogTypes';

function loadAdminState(): AdminState {
  return getPublicCatalogState();
}

export interface SlotOption {
  startTime: string;
  endTime: string;
  label: string;
  capacity: number;
  booked: number;
  available: number;
  /** Bays open by schedule (ignores existing bookings). 0 means window closed / not bookable. */
  scheduleOpenBays?: number;
  durationMinutes?: number;
  slotsNeeded?: number;
}

export interface CatalogForVehicle {
  services: ServiceItem[];
  addons: AddonItem[];
}

export interface BranchAddonItem {
  id: string;
  name: string;
  price: number;
  descriptionPoints?: string[];
}

export interface ApplicableDiscount {
  id: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
}

export interface BranchOfferCard {
  id: string;
  title: string;
  discountLabel: string;
  timeLabel: string;
  branches: string[];
  serviceType: 'branch' | 'mobile' | 'both';
}

export interface BookingWriteInput {
  branchId: string;
  customerName: string;
  phone: string;
  address: string;
  vehicleType: string;
  serviceSummary: string;
  /** Catalog service id — required for loyalty tracking on branch bookings. */
  serviceId?: string;
  selectedAddonIds?: string[];
  slotDate: string;
  startTime: string;
  /** Omit to let the API compute from service duration + add-ons. */
  endTime?: string;
  /** Optional gratuity in cents (stored on booking; max $500 server-side). */
  tipCents?: number;
}

export function estimateBranchBookingMinutes(
  service: Pick<ServiceItem, 'durationMinutes'> | null | undefined,
  addonCount: number
): number {
  let base = Math.max(30, Math.round(Number(service?.durationMinutes ?? 60) || 60));
  if (base % 30) base += 30 - (base % 30);
  base = Math.min(480, base);
  return base + Math.max(0, addonCount) * 30;
}

/** Shape returned by POST/GET public booking endpoints. */
export type PublicBookingRow = {
  id: string;
  branch_id?: string;
  status: string;
  tip_cents?: number;
  slot_date?: string;
  start_time?: string;
  end_time?: string;
  service_summary?: string;
  vehicle_type?: string;
};

export async function fetchPublicBookingById(
  branchId: string,
  bookingId: string
): Promise<PublicBookingRow | null> {
  try {
    return await fetchPublicJson<PublicBookingRow>(`/public/branches/${branchId}/bookings/${bookingId}`);
  } catch {
    return null;
  }
}

/** Refresh in-memory catalog from the API (database is source of truth). */
export async function syncAdminStateFromPortal(): Promise<boolean> {
  return hydratePublicCatalogFromApi();
}

export function listBranches(query = ''): UserBranch[] {
  const q = query.trim().toLowerCase();
  const branches = loadAdminState().branches;
  if (!q) return branches;
  return branches.filter(
    (b) =>
      b.name.toLowerCase().includes(q) ||
      b.location.toLowerCase().includes(q) ||
      b.zipCode.toLowerCase().includes(q)
  );
}

export function getBranchById(branchId: string): UserBranch | null {
  return loadAdminState().branches.find((b) => b.id === branchId) ?? null;
}

function getBranchData(branchId: string): BranchData | null {
  return loadAdminState().dataByBranchId[branchId] ?? null;
}

export function listVehicleTypes(branchId: string): string[] {
  const data = getBranchData(branchId);
  if (!data) return [];
  return data.vehicleServices.map((v) => v.vehicleType).filter(Boolean);
}

export function getCatalogForVehicle(branchId: string, vehicleType: string): CatalogForVehicle {
  const data = getBranchData(branchId);
  if (!data) return { services: [], addons: [] };
  const block = data.vehicleServices.find((v) => v.vehicleType === vehicleType);
  const branchWideAddons =
    (data.branchAddons ?? []).filter((a) => a.active !== false).length > 0
      ? (data.branchAddons ?? []).filter((a) => a.active !== false)
      : Array.from(
          new Map(
            data.vehicleServices
              .flatMap((v) => v.addons ?? [])
              .filter((a) => a.active !== false)
              .map((a) => [a.id, a])
          ).values()
        );
  if (!block) {
    return { services: [], addons: branchWideAddons };
  }
  return {
    services: (block.services ?? []).filter((s) => s.active !== false),
    addons: branchWideAddons,
  };
}

/**
 * Complimentary coffees for the selected catalog service (from API snapshot `free_coffee_count`).
 * Add-ons do not carry a coffee count in the public catalog.
 */
export function getFreeCoffeeCupsForLineItem(
  branchId: string,
  vehicleType: string | null | undefined,
  serviceId: string | null | undefined
): number {
  if (!branchId || !vehicleType || !serviceId) return 0;
  const { services } = getCatalogForVehicle(branchId, vehicleType);
  const svc = services.find((s) => s.id === serviceId);
  return Math.max(0, Math.floor(Number(svc?.freeCoffeeCount ?? 0)));
}

export function listBranchAddons(branchId: string): BranchAddonItem[] {
  const data = getBranchData(branchId);
  if (!data) return [];
  const branchLevel = (data.branchAddons ?? []).filter((a) => a.active !== false);
  if (branchLevel.length > 0) return branchLevel;
  return Array.from(
    new Map(
      data.vehicleServices
        .flatMap((v) => v.addons ?? [])
        .filter((a) => a.active !== false)
        .map((a) => [a.id, a])
    ).values()
  );
}

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map((x) => Number.parseInt(x, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function formatMinutesToHHMM(total: number): string {
  const m = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function format12h(hhmm: string): string {
  const [hRaw, m] = hhmm.split(':');
  let h = Number.parseInt(hRaw, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${String(h).padStart(2, '0')}:${m} ${suffix}`;
}

function slotWindowKey(startTime: string, endTime: string): string {
  return `${startTime}|${endTime}`;
}

function dayWindowKey(isoDate: string, windowKey: string): string {
  return `${isoDate}|${windowKey}`;
}

function generateOperatingDaySlots(
  openTime: string,
  closeTime: string,
  bayCount: number,
  durationMinutes: number
): Array<{ startTime: string; endTime: string }> {
  const open = parseTimeToMinutes(openTime);
  let close = parseTimeToMinutes(closeTime);
  if (close <= open) close += 24 * 60;
  const dur = Math.max(15, durationMinutes || 60);
  const slots: Array<{ startTime: string; endTime: string }> = [];
  for (let t = open; t + dur <= close; t += dur) {
    slots.push({
      startTime: formatMinutesToHHMM(t),
      endTime: formatMinutesToHHMM(t + dur),
    });
  }
  return slots;
}

function getOpenBaysForSlot(
  data: BranchData,
  dateISO: string,
  startTime: string,
  endTime: string,
  bayCount: number
): number {
  const wk = slotWindowKey(startTime, endTime);
  let slotActive = data.slotWindowActiveByKey?.[wk] !== false;
  let bays = Array.from({ length: Math.max(1, bayCount) }, () => true);
  const recurring = data.slotBayOpenByWindow?.[wk];
  if (Array.isArray(recurring)) {
    bays = bays.map((_, idx) => (idx < recurring.length ? recurring[idx] !== false : true));
  }
  const dayOverride = data.slotDayStates?.[dayWindowKey(dateISO, wk)];
  if (typeof dayOverride?.slotActive === 'boolean') slotActive = dayOverride.slotActive;
  if (Array.isArray(dayOverride?.baysOpen)) {
    bays = bays.map((open, idx) =>
      idx < dayOverride.baysOpen!.length ? open && dayOverride.baysOpen![idx] !== false : open
    );
  }
  if (!slotActive) return 0;
  return bays.filter(Boolean).length;
}

const SLOT_GRID_MINUTES = 30;

/** Longest continuous span inside branch hours (minutes). Used so slot listing never asks the API for an impossible duration. */
export function maxOperatingSpanMinutes(branch: Pick<UserBranch, 'openTime' | 'closeTime'>): number {
  const open = parseTimeToMinutes(branch.openTime);
  let close = parseTimeToMinutes(branch.closeTime);
  if (close <= open) close += 24 * 60;
  return Math.max(SLOT_GRID_MINUTES, close - open);
}

function snapDurationToSlotGridMinutes(minutes: number): number {
  const m = Math.max(SLOT_GRID_MINUTES, Math.round(Number(minutes) || 0));
  const rem = m % SLOT_GRID_MINUTES;
  return rem ? m + SLOT_GRID_MINUTES - rem : m;
}

/**
 * Offline slot list when the public slots API fails (uses last synced catalog).
 * Same 30-minute start grid and duration snapping as the server.
 */
export function listAvailableSlotsFromCache(
  branchId: string,
  dateISO: string,
  bookingDurationMinutes?: number
): SlotOption[] {
  const branch = getBranchById(branchId);
  const data = getBranchData(branchId);
  if (!branch || !data) return [];
  const raw =
    bookingDurationMinutes != null && Number.isFinite(bookingDurationMinutes)
      ? Math.round(Number(bookingDurationMinutes))
      : SLOT_GRID_MINUTES;
  const snapped = snapDurationToSlotGridMinutes(raw);
  const maxSpan = maxOperatingSpanMinutes(branch);
  const dur = Math.min(snapped, maxSpan);
  const open = parseTimeToMinutes(branch.openTime);
  let close = parseTimeToMinutes(branch.closeTime);
  if (close <= open) close += 24 * 60;
  const baysN = Math.max(1, branch.bayCount);
  const out: SlotOption[] = [];
  for (let t = open; t + dur <= close; t += SLOT_GRID_MINUTES) {
    const st = formatMinutesToHHMM(t);
    const et = formatMinutesToHHMM(t + dur);
    const openBays = getOpenBaysForSlot(data, dateISO, st, et, baysN);
    out.push({
      startTime: st,
      endTime: et,
      label: `${format12h(st)} – ${format12h(et)} (${dur} min)`,
      capacity: baysN,
      booked: Math.max(0, baysN - openBays),
      available: openBays,
      scheduleOpenBays: openBays,
      durationMinutes: dur,
    });
  }
  return out;
}

export async function listAvailableSlots(
  branchId: string,
  dateISO: string,
  bookingDurationMinutes?: number,
  opts?: { signal?: AbortSignal }
): Promise<SlotOption[]> {
  const raw =
    bookingDurationMinutes != null && Number.isFinite(bookingDurationMinutes)
      ? Math.round(Number(bookingDurationMinutes))
      : undefined;
  const branch = getBranchById(branchId);
  const capped =
    raw != null && branch != null ? Math.min(raw, maxOperatingSpanMinutes(branch)) : raw;

  const durQ =
    capped != null && Number.isFinite(capped)
      ? `&duration_minutes=${encodeURIComponent(String(capped))}`
      : '';

  const mapRow = (s: any): SlotOption => ({
    startTime: String(s.startTime ?? s.start_time ?? ''),
    endTime: String(s.endTime ?? s.end_time ?? ''),
    label: String(s.label ?? ''),
    capacity: Number(s.capacity ?? 0),
    booked: Number(s.booked ?? 0),
    available: Number(s.available ?? 0),
    scheduleOpenBays:
      s.scheduleOpenBays != null
        ? Number(s.scheduleOpenBays)
        : s.schedule_open_bays != null
          ? Number(s.schedule_open_bays)
          : undefined,
    durationMinutes: s.durationMinutes != null ? Number(s.durationMinutes) : undefined,
    slotsNeeded: s.slotsNeeded != null ? Number(s.slotsNeeded) : undefined,
  });

  try {
    const rows = await fetchPublicJson<any[]>(
      `/public/branches/${branchId}/slots?date=${encodeURIComponent(dateISO)}${durQ}`,
      opts?.signal ? { signal: opts.signal } : undefined
    );
    if (!Array.isArray(rows)) return [];
    return rows.map(mapRow);
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    if (e instanceof Error && e.name === 'AbortError') throw e;
    return listAvailableSlotsFromCache(branchId, dateISO, capped ?? raw);
  }
}

function inDateRange(dateISO: string, start?: string, end?: string): boolean {
  if (start && dateISO < start) return false;
  if (end && dateISO > end) return false;
  return true;
}

function inTimeRange(timeHHMM: string, start?: string, end?: string): boolean {
  if (!start || !end) return true;
  const t = parseTimeToMinutes(timeHHMM);
  return t >= parseTimeToMinutes(start) && t < parseTimeToMinutes(end);
}

function dayShortName(dateISO: string): string {
  const date = new Date(`${dateISO}T00:00:00`);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export function listApplicableDiscounts(
  branchId: string,
  dateISO: string,
  timeHHMM: string,
  serviceId: string,
  vehicleType: string
): ApplicableDiscount[] {
  const data = getBranchData(branchId);
  if (!data) return [];
  return (data.dayTimePricing ?? [])
    .filter((rule) => {
      const serviceOk =
        !rule.applicableServiceIds?.length || rule.applicableServiceIds.includes(serviceId);
      const vehicleOk =
        !rule.applicableVehicleTypes?.length || rule.applicableVehicleTypes.includes(vehicleType);
      const dateOk = inDateRange(dateISO, rule.validityStart, rule.validityEnd);
      const dayOk = !rule.applicableDays?.length || rule.applicableDays.includes(dayShortName(dateISO));
      const timeOk = inTimeRange(timeHHMM, rule.timeWindowStart, rule.timeWindowEnd);
      return serviceOk && vehicleOk && dateOk && dayOk && timeOk;
    })
    .map((rule) => ({
      id: rule.id,
      title: rule.title,
      description: rule.description,
      discountType: rule.discountType,
      discountValue: rule.discountValue,
    }));
}

export function listApplicablePromos(
  branchId: string,
  dateISO: string,
  serviceId: string,
  vehicleType: string
): PromoCode[] {
  const data = getBranchData(branchId);
  if (!data) return [];
  return (data.promotions ?? []).filter((promo) => {
    const serviceOk =
      !promo.applicableServiceIds?.length || promo.applicableServiceIds.includes(serviceId);
    const vehicleOk =
      !promo.applicableVehicleTypes?.length || promo.applicableVehicleTypes.includes(vehicleType);
    const dateOk = inDateRange(dateISO, promo.validityStart, promo.validityEnd);
    return serviceOk && vehicleOk && dateOk;
  });
}

export function listBranchPromoCodes(branchId: string, dateISO?: string): PromoCode[] {
  const data = getBranchData(branchId);
  if (!data) return [];
  return (data.promotions ?? []).filter((promo) => {
    if (!dateISO) return true;
    return inDateRange(dateISO, promo.validityStart, promo.validityEnd);
  });
}

export function listHomeOffers(): BranchOfferCard[] {
  const state = loadAdminState();
  const cards: BranchOfferCard[] = [];
  for (const branch of state.branches) {
    const data = state.dataByBranchId[branch.id];
    if (!data) continue;
    for (const d of data.dayTimePricing ?? []) {
      cards.push({
        id: `day_${branch.id}_${d.id}`,
        title: d.title || 'Day / Time Offer',
        discountLabel: d.discountType === 'percentage' ? `${d.discountValue}% OFF` : `$${d.discountValue} OFF`,
        timeLabel:
          d.timeWindowStart && d.timeWindowEnd
            ? `${d.timeWindowStart} - ${d.timeWindowEnd}`
            : d.applicableDays?.length
              ? d.applicableDays.join(', ')
              : 'Selected days',
        branches: [branch.name],
        serviceType: 'branch',
      });
    }
  }
  for (const d of state.mobileDayTimePricing ?? []) {
    cards.push({
      id: `mobile_day_${d.id}`,
      title: d.title || 'Day / Time Offer',
      discountLabel: d.discountType === 'percentage' ? `${d.discountValue}% OFF` : `$${d.discountValue} OFF`,
      timeLabel:
        d.timeWindowStart && d.timeWindowEnd
          ? `${d.timeWindowStart} - ${d.timeWindowEnd}`
          : d.applicableDays?.length
            ? d.applicableDays.join(', ')
            : 'Selected days',
      branches: ['Mobile wash'],
      serviceType: 'mobile',
    });
  }
  return cards;
}

export async function createOnlineBooking(
  input: BookingWriteInput
): Promise<{ ok: true; booking: PublicBookingRow } | { ok: false }> {
  try {
    const tip = Math.min(50_000, Math.max(0, Math.floor(Number(input.tipCents ?? 0))));
    const body: Record<string, unknown> = {
      customer_name: input.customerName,
      phone: input.phone,
      address: input.address,
      vehicle_type: input.vehicleType,
      service_summary: input.serviceSummary,
      service_id: input.serviceId ?? null,
      selected_addon_ids: input.selectedAddonIds ?? [],
      slot_date: input.slotDate,
      start_time: input.startTime,
      tip_cents: tip,
    };
    if (input.endTime) body.end_time = input.endTime;
    const out = await fetchPublicJson<PublicBookingRow>(`/public/branches/${input.branchId}/bookings`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    void hydratePublicCatalogFromApi();
    return { ok: true, booking: out };
  } catch {
    return { ok: false };
  }
}

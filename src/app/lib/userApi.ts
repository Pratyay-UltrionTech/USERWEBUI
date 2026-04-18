import { API_BASE } from './apiBase';

export type CustomerAuthResponse = {
  access_token: string;
  token_type: string;
  email: string;
  profile_completed: boolean;
  full_name: string;
  phone: string;
  address: string;
};

export type CustomerMeResponse = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  address: string;
  vehicles: { type: string; number: string }[];
  profile_completed: boolean;
};

function detailMessage(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Request failed';
  const d = (data as { detail?: unknown }).detail;
  if (typeof d === 'string') return d;
  if (d && typeof d === 'object' && 'detail' in d) {
    const inner = (d as { detail?: unknown }).detail;
    if (typeof inner === 'string') return inner;
  }
  return 'Request failed';
}

async function postJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(detailMessage(data));
  return data as T;
}

async function patchJson<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(detailMessage(data));
  return data as T;
}

async function getJson<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(detailMessage(data));
  return data as T;
}

export function apiCustomerRegister(email: string, password: string): Promise<CustomerAuthResponse> {
  return postJson<CustomerAuthResponse>('/auth/customer/register', { email, password });
}

export function apiCustomerLogin(email: string, password: string): Promise<CustomerAuthResponse> {
  return postJson<CustomerAuthResponse>('/auth/customer/login', { email, password });
}

export function apiGetCustomerMe(token: string): Promise<CustomerMeResponse> {
  return getJson<CustomerMeResponse>('/customer/me', token);
}

export function apiPatchCustomerProfile(
  token: string,
  body: { full_name: string; phone: string; address: string; vehicles: { type: string; number: string }[] }
): Promise<CustomerMeResponse> {
  return patchJson<CustomerMeResponse>('/customer/me', body, token);
}

export type LoyaltyMatchedReward = {
  tier_id?: string;
  reward_service_id: string;
  reward_service_name: string | null;
} | null;

export type LoyaltyPrimaryPayload = {
  has_loyalty_activity: boolean;
  scope: 'branch' | 'mobile';
  branch_id: string | null;
  branch_name: string;
  city_pin_code: string | null;
  qualifying_service_count: number;
  eligible_services_in_window: number;
  spend_in_window: number;
  window_progress_label: string;
  remaining_eligible_slots_in_window: number;
  progress_fraction: number;
  matched_reward: LoyaltyMatchedReward;
  next_reward_message: string;
};

export type CustomerLoyaltyOverviewResponse = {
  has_any_loyalty: boolean;
  primary: LoyaltyPrimaryPayload | null;
};

export function apiCustomerLoyaltyOverview(token: string): Promise<CustomerLoyaltyOverviewResponse> {
  return getJson<CustomerLoyaltyOverviewResponse>('/customer/loyalty/overview', token);
}

export type CustomerServiceHistoryItem = {
  id: string;
  channel: 'branch' | 'mobile';
  status: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  location_label: string;
  service_summary: string;
  vehicle_type: string;
  created_at: string | null;
};

export type CustomerServiceHistoryResponse = {
  items: CustomerServiceHistoryItem[];
};

export function apiCustomerServiceHistory(token: string): Promise<CustomerServiceHistoryResponse> {
  return getJson<CustomerServiceHistoryResponse>('/customer/service-history', token);
}

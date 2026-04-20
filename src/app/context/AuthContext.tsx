import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { clearSignupProfilePending } from '../lib/signupProfileGate';
import {
  apiCustomerLogin,
  apiCustomerRegister,
  apiGetCustomerMe,
  apiPatchCustomerProfile,
  type CustomerAuthResponse,
} from '../lib/userApi';

const STORAGE_KEY = 'carwash_customer_session_v1';

export type CustomerSession = {
  accessToken: string;
  email: string;
  profileCompleted: boolean;
  fullName: string;
  phone: string;
  address: string;
};

function authResponseToSession(r: CustomerAuthResponse): CustomerSession {
  return {
    accessToken: r.access_token,
    email: r.email,
    profileCompleted: r.profile_completed,
    fullName: r.full_name ?? '',
    phone: r.phone ?? '',
    address: r.address ?? '',
  };
}

function readStored(): CustomerSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<CustomerSession>;
    if (!o?.accessToken || typeof o.email !== 'string') return null;
    return {
      accessToken: o.accessToken,
      email: o.email,
      profileCompleted: !!o.profileCompleted,
      fullName: typeof o.fullName === 'string' ? o.fullName : '',
      phone: typeof o.phone === 'string' ? o.phone : '',
      address: typeof o.address === 'string' ? o.address : '',
    };
  } catch {
    return null;
  }
}

function persist(session: CustomerSession | null) {
  try {
    if (!session) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

interface AuthContextType {
  session: CustomerSession | null;
  /** Logged in and profile completed (ready for booking as identified customer). */
  isAuthenticated: boolean;
  /** Has a valid access token (profile may still be incomplete). */
  hasCustomerSession: boolean;
  customerLogin: (email: string, password: string) => Promise<{ profileCompleted: boolean }>;
  customerRegister: (email: string, password: string) => Promise<void>;
  refreshCustomerSession: () => Promise<void>;
  updateCustomerProfile: (body: {
    full_name: string;
    phone: string;
    address: string;
    vehicles: { type: string; number: string }[];
  }) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CustomerSession | null>(readStored);

  const isAuthenticated = !!(session?.accessToken && session.profileCompleted);
  const hasCustomerSession = !!session?.accessToken;

  const signOut = useCallback(() => {
    clearSignupProfilePending();
    persist(null);
    setSession(null);
  }, []);

  const customerLogin = useCallback(async (email: string, password: string) => {
    const r = await apiCustomerLogin(email, password);
    const next = authResponseToSession(r);
    persist(next);
    setSession(next);
    return { profileCompleted: r.profile_completed };
  }, []);

  const customerRegister = useCallback(async (email: string, password: string) => {
    const r = await apiCustomerRegister(email, password);
    const next = authResponseToSession(r);
    persist(next);
    setSession(next);
  }, []);

  const refreshCustomerSession = useCallback(async () => {
    const s = readStored();
    if (!s?.accessToken) return;
    const me = await apiGetCustomerMe(s.accessToken);
    const next: CustomerSession = {
      accessToken: s.accessToken,
      email: me.email,
      profileCompleted: me.profile_completed,
      fullName: me.full_name ?? '',
      phone: me.phone ?? '',
      address: me.address ?? '',
    };
    persist(next);
    setSession(next);
  }, []);

  const updateCustomerProfile = useCallback(
    async (body: {
      full_name: string;
      phone: string;
      address: string;
      vehicles: { type: string; number: string }[];
    }) => {
      const s = readStored();
      if (!s?.accessToken) throw new Error('Not signed in');
      const me = await apiPatchCustomerProfile(s.accessToken, body);
      const next: CustomerSession = {
        accessToken: s.accessToken,
        email: me.email,
        profileCompleted: me.profile_completed,
        fullName: me.full_name ?? '',
        phone: me.phone ?? '',
        address: me.address ?? '',
      };
      persist(next);
      setSession(next);
    },
    []
  );

  const value = useMemo(
    () => ({
      session,
      isAuthenticated,
      hasCustomerSession,
      customerLogin,
      customerRegister,
      refreshCustomerSession,
      updateCustomerProfile,
      signOut,
    }),
    [
      session,
      isAuthenticated,
      hasCustomerSession,
      customerLogin,
      customerRegister,
      refreshCustomerSession,
      updateCustomerProfile,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

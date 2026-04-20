import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface Vehicle {
  id: string;
  type: string;
  number: string;
}

interface Branch {
  id: string;
  name: string;
  location: string;
  rating: number;
  image: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  features: string[];
  recommended?: boolean;
  /** Branch / mobile catalog complimentary coffees for this line item (0 = none). */
  freeCoffeeCount?: number;
  /** Catalog flag: price counts toward loyalty spend window. */
  eligibleForLoyaltyPoints?: boolean;
  /** Base service duration (minutes); add-ons add +30 each server-side. */
  durationMinutes?: number;
}

interface AddOn {
  id: string;
  name: string;
  price: number;
}

interface ConfirmedBooking {
  id: string;
  total: number;
  tax: number;
  subtotal: number;
  discounts: number;
  createdAt: string;
  /** From catalog `free_coffee_count` at confirm time (branch services). */
  freeCoffeeCount?: number;
  branchId?: string;
  /** Service job status from API (washer / manager updates). */
  status?: string;
  /** Gratuity in cents saved on the booking. */
  tipCents?: number;
}

interface BookingContextType {
  user: {
    name: string;
    email: string;
    phone: string;
    address: string;
  } | null;
  vehicles: Vehicle[];
  selectedBranch: Branch | null;
  serviceType: 'branch' | 'onsite' | null;
  vehicleType: string | null;
  selectedService: Service | null;
  selectedAddOns: AddOn[];
  selectedDate: Date | null;
  selectedTime: string | null;
  selectedEndTime: string | null;
  confirmedBooking: ConfirmedBooking | null;
  reschedulingBookingId: string | null;
  originalSlot: { date: string; startTime: string; endTime: string } | null;
  setUser: (user: any) => void;
  addVehicle: (vehicle: Vehicle) => void;
  setVehicles: (vehicles: Vehicle[]) => void;
  setSelectedBranch: (branch: Branch | null) => void;
  setServiceType: (type: 'branch' | 'onsite' | null) => void;
  setVehicleType: (type: string | null) => void;
  setSelectedService: (service: Service | null) => void;
  toggleAddOn: (addon: AddOn) => void;
  setSelectedAddOns: (addons: AddOn[]) => void;
  setSelectedDate: (date: Date | null) => void;
  setSelectedTime: (time: string | null) => void;
  setSelectedEndTime: (time: string | null) => void;
  setConfirmedBooking: (booking: ConfirmedBooking | null) => void;
  setReschedulingBookingId: (id: string | null) => void;
  setOriginalSlot: (slot: { date: string; startTime: string; endTime: string } | null) => void;
  getTotalPrice: () => number;
  resetBooking: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);
const BOOKING_STORAGE_KEY = 'carwash_user_booking_ctx_v2';

type PersistedBooking = {
  selectedBranch: Branch | null;
  serviceType: 'branch' | 'onsite' | null;
  vehicleType: string | null;
  selectedService: Service | null;
  selectedAddOns: AddOn[];
  selectedDateISO: string | null;
  selectedTime: string | null;
  selectedEndTime: string | null;
  confirmedBooking: ConfirmedBooking | null;
  reschedulingBookingId: string | null;
  originalSlot: { date: string; startTime: string; endTime: string } | null;
};

function loadPersistedBooking(): PersistedBooking | null {
  try {
    const raw = sessionStorage.getItem(BOOKING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedBooking>;
    return {
      selectedBranch: parsed.selectedBranch ?? null,
      serviceType: parsed.serviceType ?? null,
      vehicleType: parsed.vehicleType ?? null,
      selectedService: parsed.selectedService ?? null,
      selectedAddOns: Array.isArray(parsed.selectedAddOns) ? parsed.selectedAddOns : [],
      selectedDateISO: parsed.selectedDateISO ?? null,
      selectedTime: parsed.selectedTime ?? null,
      selectedEndTime: parsed.selectedEndTime ?? null,
      confirmedBooking: parsed.confirmedBooking ?? null,
      reschedulingBookingId: parsed.reschedulingBookingId ?? null,
      originalSlot: parsed.originalSlot ?? null,
    };
  } catch {
    return null;
  }
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const persisted = loadPersistedBooking();
  const [user, setUser] = useState<any>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(persisted?.selectedBranch ?? null);
  const [serviceType, setServiceType] = useState<'branch' | 'onsite' | null>(persisted?.serviceType ?? null);
  const [vehicleType, setVehicleType] = useState<string | null>(persisted?.vehicleType ?? null);
  const [selectedService, setSelectedService] = useState<Service | null>(persisted?.selectedService ?? null);
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>(persisted?.selectedAddOns ?? []);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    persisted?.selectedDateISO ? new Date(`${persisted.selectedDateISO}T00:00:00`) : null
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(persisted?.selectedTime ?? null);
  const [selectedEndTime, setSelectedEndTime] = useState<string | null>(persisted?.selectedEndTime ?? null);
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(persisted?.confirmedBooking ?? null);
  const [reschedulingBookingId, setReschedulingBookingId] = useState<string | null>(persisted?.reschedulingBookingId ?? null);
  const [originalSlot, setOriginalSlot] = useState<{ date: string; startTime: string; endTime: string } | null>(persisted?.originalSlot ?? null);

  const addVehicle = (vehicle: Vehicle) => {
    setVehicles([...vehicles, vehicle]);
  };

  const toggleAddOn = (addon: AddOn) => {
    setSelectedAddOns(prev => {
      const exists = prev.find(a => a.id === addon.id);
      if (exists) {
        return prev.filter(a => a.id !== addon.id);
      }
      return [...prev, addon];
    });
  };

  const getTotalPrice = () => {
    const servicePrice = selectedService?.price || 0;
    const addOnsPrice = selectedAddOns.reduce((sum, addon) => sum + addon.price, 0);
    return servicePrice + addOnsPrice;
  };

  const resetBooking = () => {
    setSelectedBranch(null);
    setServiceType(null);
    setVehicleType(null);
    setSelectedService(null);
    setSelectedAddOns([]);
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedEndTime(null);
    setConfirmedBooking(null);
    setReschedulingBookingId(null);
    setOriginalSlot(null);
  };

  useEffect(() => {
    try {
      sessionStorage.setItem(
        BOOKING_STORAGE_KEY,
        JSON.stringify({
          selectedBranch,
          serviceType,
          vehicleType,
          selectedService,
          selectedAddOns,
          selectedDateISO: selectedDate
            ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(
                selectedDate.getDate()
              ).padStart(2, '0')}`
            : null,
          selectedTime,
          selectedEndTime,
          confirmedBooking,
          reschedulingBookingId,
          originalSlot,
        } as PersistedBooking)
      );
    } catch {
      // ignore persistence failures
    }
  }, [
    selectedBranch,
    serviceType,
    vehicleType,
    selectedService,
    selectedAddOns,
    selectedDate,
    selectedTime,
    selectedEndTime,
    confirmedBooking,
    reschedulingBookingId,
    originalSlot,
  ]);

  return (
    <BookingContext.Provider
      value={{
        user,
        vehicles,
        selectedBranch,
        serviceType,
        vehicleType,
        selectedService,
        selectedAddOns,
        selectedDate,
        selectedTime,
        selectedEndTime,
        confirmedBooking,
        reschedulingBookingId,
        originalSlot,
        setUser,
        addVehicle,
        setVehicles,
        setSelectedBranch,
        setServiceType,
        setVehicleType,
        setSelectedService,
        toggleAddOn,
        setSelectedAddOns,
        setSelectedDate,
        setSelectedTime,
        setSelectedEndTime,
        setConfirmedBooking,
        setReschedulingBookingId,
        setOriginalSlot,
        getTotalPrice,
        resetBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}

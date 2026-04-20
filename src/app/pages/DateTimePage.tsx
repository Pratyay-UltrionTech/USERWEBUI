import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Calendar, Clock, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useBooking } from '../context/BookingContext';
import { BookingDisclaimerNotes } from '../components/BookingDisclaimerNotes';
import {
  estimateBranchBookingMinutes,
  listAvailableSlots,
  listAvailableSlotsFromCache,
  type SlotOption,
} from '../lib/adminPortalBridge';
import {
  getCachedMobileSnapshot,
  getMobilePinFromBranchId,
  listMobileSlots,
  listMobileSlotsFromApi,
} from '../lib/mobilePublicBridge';
export function DateTimePage() {
  const navigate = useNavigate();
  const {
    selectedBranch,
    serviceType,
    selectedService,
    selectedAddOns,
    selectedDate,
    selectedTime,
    selectedEndTime,
    setSelectedDate,
    setSelectedTime,
    setSelectedEndTime,
    reschedulingBookingId,
    originalSlot,
  } = useBooking();

  const bookingDurationMinutes = useMemo(
    () => estimateBranchBookingMinutes(selectedService, selectedAddOns.length),
    [selectedService, selectedAddOns]
  );
  const toISO = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const isOriginalSlot = (date: Date, startTime: string) => {
    if (!reschedulingBookingId || !originalSlot) return false;
    return toISO(date) === originalSlot.date && startTime === originalSlot.startTime;
  };

  // Generate next 14 days
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = generateDates();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDayMonth = (date: Date) => {
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    };
  };

  const isDateSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const selectedISO = selectedDate ? toISO(selectedDate) : '';
  const prevDateISORef = useRef<string | null>(null);
  useEffect(() => {
    const cur = selectedDate ? toISO(selectedDate) : '';
    if (prevDateISORef.current !== null && prevDateISORef.current !== cur) {
      setSelectedTime(null);
      setSelectedEndTime(null);
    }
    prevDateISORef.current = cur || null;
  }, [selectedDate, setSelectedTime, setSelectedEndTime]);

  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsHint, setSlotsHint] = useState('');
  useEffect(() => {
    let mounted = true;
    const ac = new AbortController();
    const run = async () => {
      if (!selectedBranch || !selectedISO) {
        if (mounted) {
          setSlots([]);
          setSlotsLoading(false);
          setSlotsHint('');
        }
        return;
      }
      if (mounted) {
        setSlotsHint('');
      }

      let showedCache = false;
      if (serviceType === 'onsite') {
        const pin = getMobilePinFromBranchId(selectedBranch.id);
        const snapshot = pin ? getCachedMobileSnapshot() : null;
        if (pin && snapshot) {
          const cached = listMobileSlots(snapshot, bookingDurationMinutes);
          if (cached.length && mounted) {
            setSlots(cached);
            setSlotsLoading(false);
            showedCache = true;
          }
        }
      } else {
        const cached = listAvailableSlotsFromCache(
          selectedBranch.id,
          selectedISO,
          bookingDurationMinutes
        );
        if (cached.length && mounted) {
          setSlots(cached);
          setSlotsLoading(false);
          showedCache = true;
        }
      }

      if (!showedCache && mounted) {
        setSlotsLoading(true);
      }

      try {
        if (serviceType === 'onsite') {
          const pin = getMobilePinFromBranchId(selectedBranch.id);
          let next: SlotOption[] = [];
          if (pin) {
            next = await listMobileSlotsFromApi(pin, selectedISO, bookingDurationMinutes, {
              signal: ac.signal,
            });
          }
          if (!next.length) {
            const snapshot = getCachedMobileSnapshot();
            next = snapshot ? listMobileSlots(snapshot, bookingDurationMinutes) : [];
          }
          if (mounted) {
            setSlots(next);
            if (!next.length) {
              setSlotsHint('No mobile times for this day. Try another date or check connection.');
            }
          }
          return;
        }
        const next = await listAvailableSlots(selectedBranch.id, selectedISO, bookingDurationMinutes, {
          signal: ac.signal,
        });
        if (mounted) {
          setSlots(next);
          if (!next.length) {
            setSlotsHint(
              'No open start times for this day with your selected service length. Try another date or fewer add-ons.'
            );
          }
        }
      } catch (e: unknown) {
        if (!mounted) return;
        const aborted =
          (e instanceof DOMException && e.name === 'AbortError') ||
          (e instanceof Error && e.name === 'AbortError');
        if (aborted) return;
        setSlots([]);
        setSlotsHint('Could not load availability. Check your connection and try again.');
      } finally {
        if (mounted) setSlotsLoading(false);
      }
    };
    void run();
    return () => {
      mounted = false;
      ac.abort();
    };
  }, [selectedBranch, selectedISO, serviceType, bookingDurationMinutes]);
  const isSlotAvailable = (time: string) => slots.some((s) => s.startTime === time && s.available > 0);

  /** Closed = schedule/off hours; full = all schedulable bays taken; available = at least one bay free. */
  const slotUiState = (s: SlotOption | undefined): 'available' | 'full' | 'closed' => {
    if (!s) return 'closed';
    const scheduleOpen = s.scheduleOpenBays ?? s.capacity;
    if (scheduleOpen <= 0) return 'closed';
    if (s.available <= 0) return 'full';
    return 'available';
  };
  useEffect(() => {
    if (!selectedBranch) {
      navigate(-1);
    }
  }, [selectedBranch, navigate]);

  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      const picked = slots.find((s) => s.startTime === selectedTime);
      if (picked?.endTime) {
        setSelectedEndTime(picked.endTime);
      }
      navigate('/summary');
    }
  };

  const canContinue = selectedDate && selectedTime;
  const buttonText = reschedulingBookingId ? 'Confirm Reschedule' : 'Continue to Summary';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Select Date & Time
              </h1>
              <p className="text-sm text-gray-500">Choose your preferred slot</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Calendar Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-[#4F46E5]" />
              <h2 className="text-lg font-semibold text-gray-900">Select Date</h2>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {dates.map((date, index) => {
                const { day, month, weekday } = formatDayMonth(date);
                const selected = isDateSelected(date);
                const isToday = index === 0;

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    className={`relative p-3 rounded-xl border-2 transition-all ${
                      selected
                        ? 'border-[#4F46E5] bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">{weekday}</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {day}
                      </div>
                      <div className="text-xs text-gray-500">{month}</div>
                    </div>
                    {isToday && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#4F46E5] rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slots Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-[#4F46E5]" />
              <h2 className="text-lg font-semibold text-gray-900">Select Time</h2>
            </div>

            {!selectedDate ? (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Please select a date first</p>
                </div>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto pr-2">
                {slotsLoading ? (
                  <div className="flex h-48 flex-col items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="h-8 w-8 animate-spin text-[#4F46E5]" aria-hidden />
                    <p className="text-sm">Loading times…</p>
                  </div>
                ) : !slots.length ? (
                  <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-2 text-center text-sm text-gray-600">
                    <p>{slotsHint || 'No times available for this day.'}</p>
                  </div>
                ) : null}
                {!slotsLoading && slots.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {slots.map((slot) => {
                    const time = slot.startTime;
                    const pickable = isSlotAvailable(time);
                    const selected = selectedTime === time;
                    const isOriginal = selectedDate && isOriginalSlot(selectedDate, time);
                    const state = slotUiState(slot);

                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => {
                          if (!pickable && !isOriginal) return;
                          setSelectedTime(time);
                          setSelectedEndTime(slot.endTime ?? null);
                        }}
                        className={`rounded-lg border-2 py-3 px-4 text-center text-sm font-medium tabular-nums transition-all relative ${
                          isOriginal
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                            : selected
                              ? 'border-[#4F46E5] bg-indigo-50 text-[#4F46E5]'
                              : state === 'closed'
                                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500 line-through'
                                : state === 'full'
                                  ? 'cursor-not-allowed border-amber-200 bg-amber-50/80 text-amber-900'
                                  : 'border-gray-200 text-gray-900 hover:border-gray-300'
                        }`}
                      >
                        {time}
                        {isOriginal && (
                          <div className="absolute -top-2 -right-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                            ORIGINAL
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                ) : null}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded border-2 border-gray-300 bg-white" />
                  <span className="text-gray-600">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded border-2 border-amber-200 bg-amber-50" />
                  <span className="text-gray-600">Full (all bays booked)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded border-2 border-slate-200 bg-slate-100" />
                  <span className="text-gray-600">Closed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded border-2 border-[#4F46E5] bg-indigo-50" />
                  <span className="text-gray-600">Selected</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Summary Box */}
        {selectedDate && selectedTime && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4">Your Selection</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-5 h-5 text-[#4F46E5]" />
                  <span>{formatDate(selectedDate)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-5 h-5 text-[#4F46E5]" />
                  <span>{selectedTime}{selectedEndTime ? ` - ${selectedEndTime}` : ''}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <div className="mt-6 max-w-6xl mx-auto">
          <BookingDisclaimerNotes />
        </div>

        {/* Continue Button */}
        <div className="mt-8 sticky bottom-0 bg-gray-50 py-4 -mx-4 px-4 border-t border-gray-200">
          <div className="max-w-6xl mx-auto">
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className={`w-full py-4 rounded-xl font-medium transition-all ${
                canContinue
                  ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-sm'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
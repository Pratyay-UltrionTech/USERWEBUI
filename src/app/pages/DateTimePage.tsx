import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { useBooking } from '../context/BookingContext';
import { listAvailableSlots } from '../lib/adminPortalBridge';
import { getCachedMobileSnapshot, listMobileSlots } from '../lib/mobilePublicBridge';
import { useAdminBridgeSync } from '../hooks/useAdminBridgeSync';

export function DateTimePage() {
  const navigate = useNavigate();
  const {
    selectedBranch,
    serviceType,
    setSelectedDate: setBookingDate,
    setSelectedTime: setBookingTime,
    setSelectedEndTime: setBookingEndTime,
  } = useBooking();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setLocalSelectedTime] = useState<string | null>(null);
  const [selectedEndTime, setLocalSelectedEndTime] = useState<string | null>(null);
  const syncSeed = useAdminBridgeSync(30000);

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

  const toISO = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const selectedISO = selectedDate ? toISO(selectedDate) : '';
  const [slots, setSlots] = useState<Array<{ startTime: string; endTime: string; label: string; capacity: number; available: number }>>([]);
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!selectedBranch || !selectedISO) {
        if (mounted) setSlots([]);
        return;
      }
      try {
        if (serviceType === 'onsite') {
          const snapshot = getCachedMobileSnapshot();
          const next = snapshot ? listMobileSlots(snapshot) : [];
          if (mounted) setSlots(next);
          return;
        }
        const next = await listAvailableSlots(selectedBranch.id, selectedISO);
        if (mounted) setSlots(next);
      } catch {
        if (mounted) setSlots([]);
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [selectedBranch, selectedISO, serviceType, syncSeed]);
  const isSlotAvailable = (time: string) => slots.some((s) => s.startTime === time && s.available > 0);
  useEffect(() => {
    if (!selectedBranch) {
      navigate(-1);
    }
  }, [selectedBranch, navigate]);

  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      const picked = slots.find((s) => s.startTime === selectedTime);
      setBookingDate(selectedDate);
      setBookingTime(selectedTime);
      setBookingEndTime(picked?.endTime ?? null);
      navigate('/summary');
    }
  };

  const canContinue = selectedDate && selectedTime;

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
                <div className="grid grid-cols-3 gap-3">
                  {(slots.length ? slots.map((s) => s.startTime) : []).map((time) => {
                    const available = isSlotAvailable(time);
                    const selected = selectedTime === time;

                    return (
                      <button
                        key={time}
                        onClick={() => {
                          if (!available) return;
                          setLocalSelectedTime(time);
                          setLocalSelectedEndTime(slots.find((s) => s.startTime === time)?.endTime ?? null);
                        }}
                        disabled={!available}
                        className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                          selected
                            ? 'border-[#4F46E5] bg-indigo-50 text-[#4F46E5]'
                            : available
                            ? 'border-gray-200 hover:border-gray-300 text-gray-900'
                            : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed line-through'
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-gray-300 rounded"></div>
                  <span className="text-gray-600">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-100 border-2 border-gray-100 rounded"></div>
                  <span className="text-gray-600">Unavailable</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-indigo-50 border-2 border-[#4F46E5] rounded"></div>
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
              Continue to Summary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
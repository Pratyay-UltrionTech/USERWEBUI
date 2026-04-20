import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle, Calendar, Clock, MapPin, Car, Download, Share2, Coffee, Receipt, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { useBooking } from '../context/BookingContext';
import { useAdminBridgeSync } from '../hooks/useAdminBridgeSync';
import {
  fetchPublicBookingById,
  getFreeCoffeeCupsForLineItem,
  type PublicBookingRow,
} from '../lib/adminPortalBridge';
import {
  fetchMobileBookingById,
  getCachedMobileSnapshot,
  getMobileFreeCoffeeCupsForLineItem,
  type MobileBookingRow,
} from '../lib/mobilePublicBridge';

function formatJobStatus(status: string): string {
  const s = (status || 'scheduled').replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function SuccessPage() {
  const navigate = useNavigate();
  const { selectedBranch, selectedService, selectedAddOns, selectedDate, selectedTime, selectedEndTime, vehicleType, confirmedBooking } = useBooking();
  const syncSeed = useAdminBridgeSync(30000);
  const branchIdForPoll = confirmedBooking?.branchId ?? selectedBranch?.id ?? '';
  const isMobileBooking = !confirmedBooking?.branchId && Boolean(selectedBranch?.id?.startsWith('mobile-'));
  const [liveBooking, setLiveBooking] = useState<PublicBookingRow | null>(null);
  const [liveMobileBooking, setLiveMobileBooking] = useState<MobileBookingRow | null>(null);

  useEffect(() => {
    if (isMobileBooking) return;
    const bid = confirmedBooking?.id;
    if (!branchIdForPoll || !bid || bid === '—') return;
    let cancelled = false;
    const tick = async () => {
      const row = await fetchPublicBookingById(branchIdForPoll, bid);
      if (!cancelled && row) setLiveBooking(row);
    };
    void tick();
    const t = window.setInterval(() => void tick(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [branchIdForPoll, confirmedBooking?.id, isMobileBooking]);

  useEffect(() => {
    if (!isMobileBooking) return;
    const bid = confirmedBooking?.id;
    if (!bid || bid === '—') return;
    let cancelled = false;
    const tick = async () => {
      const row = await fetchMobileBookingById(bid);
      if (!cancelled && row) setLiveMobileBooking(row);
    };
    void tick();
    const t = window.setInterval(() => void tick(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, [confirmedBooking?.id, isMobileBooking]);

  const freeCoffeeCount = useMemo(() => {
    if (typeof confirmedBooking?.freeCoffeeCount === 'number') {
      return Math.max(0, Math.floor(confirmedBooking.freeCoffeeCount));
    }
    if (!selectedBranch?.id || !vehicleType || !selectedService?.id) return 0;
    if (selectedBranch.id.startsWith('mobile-')) {
      return getMobileFreeCoffeeCupsForLineItem(getCachedMobileSnapshot(), vehicleType, selectedService.id);
    }
    return getFreeCoffeeCupsForLineItem(selectedBranch.id, vehicleType, selectedService.id);
  }, [
    confirmedBooking?.freeCoffeeCount,
    selectedBranch?.id,
    vehicleType,
    selectedService?.id,
    syncSeed,
  ]);

  const displayStatus = liveMobileBooking?.status ?? liveBooking?.status ?? confirmedBooking?.status ?? 'scheduled';
  const displayTipCents =
    typeof liveMobileBooking?.tip_cents === 'number'
      ? liveMobileBooking.tip_cents
      : typeof liveBooking?.tip_cents === 'number'
      ? liveBooking.tip_cents
      : typeof confirmedBooking?.tipCents === 'number'
        ? confirmedBooking.tipCents
        : 0;
  const tipDollars = displayTipCents / 100;
  const serviceTotal = confirmedBooking?.total ?? 0;

  const booking = {
    id: confirmedBooking?.id ?? '—',
    branch: {
      name: selectedBranch?.name ?? '—',
      location: selectedBranch?.location ?? '—',
      phone: '—',
    },
    service: `${selectedService?.name ?? '—'}${selectedAddOns.length ? ` + ${selectedAddOns.map((a) => a.name).join(', ')}` : ''}`,
    vehicle: vehicleType ?? '—',
    date: selectedDate
      ? selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : '—',
    time: selectedTime ? `${selectedTime}${selectedEndTime ? ` - ${selectedEndTime}` : ''}` : '—',
    total: serviceTotal,
    tipDollars,
    grandTotal: serviceTotal + tipDollars,
    statusLabel: formatJobStatus(displayStatus),
    freeCoffeeCount,
  };

  const handleTrackBooking = () => {
    // In a real app, this would navigate to a tracking page
    console.log('Track booking:', booking.id);
  };

  const goHome = () => {
    navigate('/home');
  };

  /**
   * Browser Back from confirmation should not return into payment/checkout.
   * Capture phase runs before React Router applies the pop so we can replace with /home.
   */
  useEffect(() => {
    const onPopState = () => {
      navigate('/home', { replace: true });
    };
    window.addEventListener('popstate', onPopState, true);
    return () => window.removeEventListener('popstate', onPopState, true);
  }, [navigate]);

  const receiptKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goHome();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 relative overflow-x-hidden">
      <div className="absolute top-6 left-6 z-20">
        <button
          type="button"
          onClick={goHome}
          className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-white hover:shadow-md transition-all group"
        >
          <MapPin className="w-4 h-4 text-[#4F46E5] group-hover:scale-110 transition-transform" />
          Go to Home
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl py-12"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div
            role="button"
            tabIndex={0}
            onClick={goHome}
            onKeyDown={receiptKeyDown}
            className="cursor-pointer rounded-xl outline-none transition-colors hover:bg-slate-50/60 focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 -m-2 p-2 sm:-m-3 sm:p-3"
            aria-label="Return to home — tap this booking receipt"
          >
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="flex justify-center mb-6"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </motion.div>

          {/* Success Message */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Booking Confirmed!
            </h1>
            <p className="text-gray-500">
              Your car wash has been successfully booked
            </p>
          </div>

          {/* Booking ID */}
          <div className="bg-gray-50 rounded-xl p-4 mb-8 text-center">
            <p className="text-sm text-gray-600 mb-1">Booking ID</p>
            <p className="text-xl font-semibold text-gray-900 break-all">{booking.id}</p>
          </div>

          {/* Booking Details */}
          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <MapPin className="w-5 h-5 text-[#4F46E5] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Location</p>
                <p className="font-medium text-gray-900">{booking.branch.name}</p>
                <p className="text-sm text-gray-500">{booking.branch.location}</p>
                <p className="text-sm text-[#4F46E5] mt-1">{booking.branch.phone}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <Car className="w-5 h-5 text-[#4F46E5] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Service</p>
                <p className="font-medium text-gray-900">{booking.service}</p>
                <p className="text-sm text-gray-500">{booking.vehicle}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-xl border border-indigo-100 bg-indigo-50/50">
              <RefreshCw className="w-5 h-5 text-[#4F46E5] mt-0.5 shrink-0" aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600 mb-1">Booking status</p>
                <p className="text-lg font-semibold capitalize text-gray-900">{booking.statusLabel}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Updates when your washer or branch updates the job. Refreshes automatically.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <Calendar className="w-5 h-5 text-[#4F46E5] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">Date</p>
                  <p className="font-medium text-gray-900">{booking.date}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <Clock className="w-5 h-5 text-[#4F46E5] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">Time</p>
                  <p className="font-medium text-gray-900">{booking.time}</p>
                </div>
              </div>
            </div>

            <div className="w-full rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50/90 to-white px-6 py-6 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#4F46E5]/10">
                <Receipt className="h-5 w-5 text-[#4F46E5]" aria-hidden />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                Service total (incl. tax)
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-gray-900 sm:text-4xl">
                ${booking.total.toFixed(2)}
              </p>
              {booking.tipDollars > 0 && (
                <p className="mt-2 text-sm text-indigo-700">
                  Tip: <span className="font-semibold">${booking.tipDollars.toFixed(2)}</span> (for the branch team)
                </p>
              )}
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Amount due</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-gray-900">${booking.grandTotal.toFixed(2)}</p>
              <p className="mt-2 text-xs text-gray-500">Including taxes and fees on service; tip is separate.</p>
            </div>

            {booking.freeCoffeeCount > 0 && (
              <div className="flex items-start gap-4 p-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
                <Coffee className="w-5 h-5 text-amber-800 mt-0.5 shrink-0" strokeWidth={2} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-900">No. of free coffees</p>
                  <p className="text-lg font-semibold text-amber-950 tabular-nums">
                    {booking.freeCoffeeCount}{' '}
                    {booking.freeCoffeeCount === 1 ? 'cup' : 'cups'} on us
                  </p>
                  <p className="text-xs text-amber-800/90 mt-1">
                    Show this receipt at the lounge to redeem.
                  </p>
                </div>
              </div>
            )}
          </div>

          <p className="mb-6 text-center text-sm font-medium text-[#4F46E5]">
            Tap anywhere on this receipt to return home
          </p>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-2">
            <p className="text-sm text-blue-900">
              <span className="font-medium">📧 Confirmation Sent:</span> We've sent
              booking details to your email and phone number.
            </p>
          </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-6 mt-6">
            <button
              type="button"
              onClick={handleTrackBooking}
              className="w-full bg-[#4F46E5] text-white py-4 rounded-xl font-medium hover:bg-[#4338CA] transition-colors shadow-sm"
            >
              Track Booking
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => console.log('Download receipt')}
                className="flex items-center justify-center gap-2 py-3 border-2 border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download className="w-5 h-5" />
                Receipt
              </button>
              <button
                type="button"
                onClick={() => console.log('Share booking')}
                className="flex items-center justify-center gap-2 py-3 border-2 border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-5 h-5" />
                Share
              </button>
            </div>
          </div>

          {/* New Booking shortcut */}
          <button
            type="button"
            onClick={goHome}
            className="w-full text-gray-500 py-3 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Book Another Service
          </button>
        </div>
      </motion.div>
    </div>
  );
}
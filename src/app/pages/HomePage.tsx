import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, Star, MapPin, Menu, User, Clock, Calendar, Zap, TrendingDown, Sparkles, Building2, Car, Gift, Check, LogIn, UserPlus, X, CircleUser } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { apiCustomerLoyaltyOverview } from '../lib/userApi';
import { useBooking } from '../context/BookingContext';
import { listBranches, listHomeOffers } from '../lib/adminPortalBridge';
import { checkMobileServiceability, fetchMobileSnapshot } from '../lib/mobilePublicBridge';
import { useAdminBridgeSync } from '../hooks/useAdminBridgeSync';
import { AccountSidebar } from '../components/AccountSidebar';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1680533749371-59c49b31fd74?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080';

export function HomePage() {
  const navigate = useNavigate();
  const { hasCustomerSession, session } = useAuth();
  const { resetBooking, setSelectedBranch, setServiceType, confirmedBooking } = useBooking();
  const [activeTab, setActiveTab] = useState<'branch' | 'mobile'>('branch');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileLocation, setMobileLocation] = useState('');
  const [mobileBusy, setMobileBusy] = useState(false);
  const [mobileError, setMobileError] = useState('');
  const [showLoyaltyDropdown, setShowLoyaltyDropdown] = useState(false);
  const [loyaltyOverview, setLoyaltyOverview] = useState<Awaited<ReturnType<typeof apiCustomerLoyaltyOverview>> | null>(
    null
  );
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [accountSidebarOpen, setAccountSidebarOpen] = useState(false);
  const syncSeed = useAdminBridgeSync(60000);

  useEffect(() => {
    if (!hasCustomerSession || !session?.accessToken) {
      setLoyaltyOverview(null);
      return;
    }
    let cancelled = false;
    setLoyaltyLoading(true);
    void (async () => {
      try {
        const o = await apiCustomerLoyaltyOverview(session.accessToken);
        if (!cancelled) setLoyaltyOverview(o);
      } catch {
        if (!cancelled) setLoyaltyOverview({ has_any_loyalty: false, primary: null });
      } finally {
        if (!cancelled) setLoyaltyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasCustomerSession, session?.accessToken]);

  const loyaltyPrimary = loyaltyOverview?.primary ?? null;
  const loyaltyLabel = loyaltyPrimary?.window_progress_label ?? null;
  const loyaltyFraction = loyaltyPrimary ? Math.min(1, Math.max(0, loyaltyPrimary.progress_fraction)) : 0;

  const BRANCHES = useMemo(
    () =>
      listBranches('').map((b, idx) => ({
        id: b.id,
        name: b.name,
        location: b.location,
        rating: 4.6 + ((idx % 4) * 0.1),
        image: FALLBACK_IMAGE,
        promotions: ['Day / Time Offer', 'Promo Codes'],
      })),
    [syncSeed]
  );
  const PROMOTIONS = useMemo(() => {
    const raw = listHomeOffers().slice(0, 12);
    const stylePool = [
      { icon: Clock, color: 'from-orange-500 to-pink-500', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
      { icon: Calendar, color: 'from-blue-500 to-purple-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
      { icon: TrendingDown, color: 'from-green-500 to-teal-500', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    ] as const;
    return raw.map((offer, idx) => ({
      ...offer,
      discount: offer.discountLabel,
      time: offer.timeLabel,
      ...stylePool[idx % stylePool.length],
    }));
  }, [syncSeed]);

  const filteredBranches = BRANCHES.filter(
    (branch) =>
      branch.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBranchSelect = (branchId: string) => {
    const b = BRANCHES.find((x) => x.id === branchId);
    if (b) {
      resetBooking();
      setServiceType('branch');
      setSelectedBranch({
        id: b.id,
        name: b.name,
        location: b.location,
        rating: b.rating,
        image: b.image,
      });
    }
    navigate(`/branch/${branchId}?serviceType=branch`);
  };

  const goToBookingsFromLoyalty = () => {
    setShowLoyaltyDropdown(false);
    setActiveTab('branch');
    requestAnimationFrame(() => {
      document.getElementById('home-booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleMobileServiceContinue = async () => {
    const pin = mobileLocation.trim();
    if (!pin) return;
    setMobileBusy(true);
    setMobileError('');
    try {
      const serviceability = await checkMobileServiceability(pin);
      if (!serviceability.serviceable) {
        setMobileError('Mobile service is currently unavailable for this pin code.');
        return;
      }
      const snapshot = await fetchMobileSnapshot(serviceability.city_pin_code);
      resetBooking();
      setServiceType('onsite');
      setSelectedBranch({
        id: `mobile-${snapshot.service_area.city_pin_code}`,
        name: 'Mobile Service',
        location: `PIN ${snapshot.service_area.city_pin_code}`,
        rating: 0,
        image: '',
      });
      navigate(`/branch/mobile?serviceType=onsite&pin=${encodeURIComponent(snapshot.service_area.city_pin_code)}`);
    } catch {
      setMobileError('Could not verify this location. Please try again.');
    } finally {
      setMobileBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <AccountSidebar open={accountSidebarOpen} onClose={() => setAccountSidebarOpen(false)} />
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#4F46E5] rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">CarWash</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {hasCustomerSession ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLoyaltyDropdown(!showLoyaltyDropdown)}
                  disabled={loyaltyLoading}
                  className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-[#4F46E5]/30 rounded-full hover:border-[#4F46E5]/50 hover:shadow-md hover:shadow-indigo-200/50 transition-all duration-200 disabled:opacity-60"
                >
                  <div className="w-6 h-6 bg-gradient-to-br from-[#4F46E5] to-[#6B5FEB] rounded-full flex items-center justify-center">
                    <Gift className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {loyaltyLoading ? '…' : loyaltyLabel ?? '—'}
                  </span>
                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${loyaltyFraction * 100}%` }}
                      className="h-full bg-gradient-to-r from-[#4F46E5] to-cyan-400 rounded-full"
                    />
                  </div>
                </button>

                <AnimatePresence>
                  {showLoyaltyDropdown && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
                        onClick={() => setShowLoyaltyDropdown(false)}
                      />

                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ type: 'spring', duration: 0.3 }}
                        className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] bg-gradient-to-br from-[#4F46E5] via-[#5B52E8] to-[#6B5FEB] rounded-2xl p-6 shadow-2xl shadow-indigo-500/30 text-white border border-white/10"
                      >
                        <button
                          type="button"
                          onClick={() => setShowLoyaltyDropdown(false)}
                          className="absolute top-3 right-3 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <div className="mb-4 pr-8">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-white/20 rounded-lg backdrop-blur-sm flex items-center justify-center">
                              <Gift className="w-5 h-5 text-white" />
                            </div>
                            <p className="text-sm font-semibold text-white/90 uppercase tracking-wider">
                              Loyalty
                            </p>
                          </div>
                          <h3 className="text-lg font-bold leading-snug">
                            {loyaltyPrimary
                              ? loyaltyPrimary.branch_name
                              : 'Your loyalty progress'}
                          </h3>
                          {loyaltyPrimary?.city_pin_code ? (
                            <p className="mt-1 text-xs text-white/75">PIN {loyaltyPrimary.city_pin_code}</p>
                          ) : null}
                        </div>

                        {loyaltyPrimary ? (
                          <div className="space-y-4 mb-4">
                            <div className="flex items-center gap-1.5">
                              {(() => {
                                const n = Math.max(1, loyaltyPrimary.qualifying_service_count);
                                const cap = Math.min(12, n);
                                const filledBars = Math.min(
                                  cap,
                                  Math.floor((loyaltyPrimary.eligible_services_in_window / n) * cap)
                                );
                                return Array.from({ length: cap }).map((_, index) => {
                                  const isCompleted = index < filledBars;
                                  const isLast = index === cap - 1;
                                  return (
                                    <div
                                      key={index}
                                      className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                                        isCompleted
                                          ? 'bg-gradient-to-r from-cyan-400 to-cyan-300'
                                          : 'bg-white/20'
                                      }`}
                                    >
                                      {isLast ? (
                                        <div className="relative -top-7 left-1/2 -translate-x-1/2">
                                          <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-300 rounded-full flex items-center justify-center shadow-lg">
                                            <Gift className="w-4 h-4 text-yellow-900" />
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                            <div className="flex items-center justify-between border-t border-white/20 pt-3 text-sm">
                              <div>
                                <p className="text-xs text-white/70 mb-0.5">Eligible in window</p>
                                <p className="text-base font-bold">
                                  {loyaltyPrimary.eligible_services_in_window}/{loyaltyPrimary.qualifying_service_count}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-white/70 mb-0.5">Qualifying spend</p>
                                <p className="text-base font-bold text-cyan-200">
                                  {loyaltyPrimary.spend_in_window.toFixed(0)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="mb-4 text-sm text-white/85">
                              Add a phone number on your profile and complete washes where the service is marked to count
                              toward loyalty. Progress appears here from live booking data.
                            </p>
                            <button
                              type="button"
                              onClick={goToBookingsFromLoyalty}
                              className="mb-4 w-full rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-[#4F46E5] shadow-sm transition hover:bg-white/95"
                            >
                              Start a booking
                            </button>
                          </>
                        )}

                        <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                          <p className="text-center text-sm text-white/90">
                            {loyaltyPrimary?.next_reward_message ??
                              'Only services with “count toward loyalty” enabled add to your window and spend total.'}
                          </p>
                          {loyaltyPrimary?.matched_reward?.reward_service_name ? (
                            <p className="mt-2 text-center text-xs font-semibold text-yellow-200">
                              Reward: {loyaltyPrimary.matched_reward.reward_service_name}
                            </p>
                          ) : null}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : null}

            {!hasCustomerSession && !confirmedBooking ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate('/login?signup=1')}
                  className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 bg-[#4F46E5] text-white hover:bg-[#4338CA] rounded-lg transition-colors shadow-sm"
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium hidden sm:inline">Create Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="flex items-center justify-center gap-2 px-3 py-2 sm:px-4 text-gray-700 hover:text-[#4F46E5] hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium hidden sm:inline">Login</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAccountSidebarOpen(true)}
                className="p-2 rounded-full text-gray-700 hover:bg-gray-100 hover:text-[#4F46E5] transition-colors"
                aria-label="Open account menu"
              >
                <CircleUser className="w-7 h-7" />
              </button>
            )}

            {/* Mobile Menu */}
            <button type="button" className="sm:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-semibold text-gray-900 mb-2">
            Find a Car Wash Near You
          </h2>
          <p className="text-gray-500">
            Book premium car wash services at your convenience
          </p>
        </motion.div>

        {/* Flash Promotional Banner - Moved to Top */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#4338CA] p-6 shadow-lg"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-6 h-6 text-yellow-300" />
              </motion.div>
              <motion.span
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="px-3 py-1 bg-yellow-300 text-gray-900 rounded-full text-xs font-bold uppercase"
              >
                Special Offers
              </motion.span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Save More with Time-Based Discounts!
            </h3>
            <p className="text-white text-opacity-90 text-sm">
              Book during off-peak hours and enjoy exclusive savings on all services
            </p>
          </div>
        </motion.div>

        {/* Active Promotions - Moved below banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#4F46E5]" />
              Active Offers
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PROMOTIONS.map((promo, index) => {
              const Icon = promo.icon;
              return (
                <motion.div
                  key={promo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  whileHover={{ y: -3, scale: 1.01 }}
                  className={`${promo.bgColor} border ${promo.borderColor} rounded-xl p-4 relative overflow-hidden group cursor-pointer`}
                >
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-br ${promo.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                  />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-2.5">
                      <div className={`w-10 h-10 bg-gradient-to-br ${promo.color} rounded-lg flex items-center justify-center shadow-sm`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="px-2.5 py-0.5 bg-white rounded-full shadow-sm"
                      >
                        <p className={`text-xs font-bold bg-gradient-to-r ${promo.color} bg-clip-text text-transparent`}>
                          {promo.discount}
                        </p>
                      </motion.div>
                    </div>

                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Service scope</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        promo.serviceType === 'branch'
                          ? 'bg-indigo-100 text-indigo-700'
                          : promo.serviceType === 'mobile'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {promo.serviceType === 'branch' ? (
                          <>
                            <Building2 className="w-3 h-3" />
                            Branch only
                          </>
                        ) : promo.serviceType === 'mobile' ? (
                          <>
                            <Car className="w-3 h-3" />
                            Mobile only
                          </>
                        ) : (
                          <>
                            <Check className="w-3 h-3" />
                            All services
                          </>
                        )}
                      </span>
                    </div>

                    <h4 className="font-semibold text-gray-900 mb-1 leading-tight">
                      {promo.title}
                    </h4>
                    <p className="text-sm text-gray-600 flex items-center gap-1 mb-1.5">
                      <Clock className="w-3 h-3" />
                      {promo.time}
                    </p>

                    <div className="flex items-start gap-1.5 mt-1.5">
                      <MapPin className="w-3 h-3 text-gray-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-500 leading-snug">
                        {promo.branches[0] === 'All Branches'
                          ? 'Available at all branches'
                          : promo.branches.join(', ')}
                      </p>
                    </div>

                    <div className="absolute bottom-0 right-0 w-14 h-14 opacity-10">
                      <Icon className="w-full h-full text-gray-900" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Service Type Tabs */}
        <motion.div
          id="home-booking"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8 scroll-mt-24"
        >
          <div className="bg-gray-100 p-1 rounded-xl inline-flex gap-1">
            <button
              onClick={() => setActiveTab('branch')}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeTab === 'branch'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-5 h-5" />
              Branch Wash
            </button>
            <button
              onClick={() => setActiveTab('mobile')}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeTab === 'mobile'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Car className="w-5 h-5" />
              Mobile Wash
            </button>
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'branch' ? (
            <motion.div
              key="branch"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Search Bar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mb-8"
              >
                <div className="relative max-w-2xl">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by City or PIN Code"
                    className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all shadow-sm"
                  />
                </div>
              </motion.div>

              {/* Branches Section */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Available Branches
                </h3>
              </div>

              {/* Branch Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {filteredBranches.map((branch, index) => (
                  <motion.div
                    key={branch.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + index * 0.1 }}
                    className="h-full"
                  >
                    <button
                      onClick={() => handleBranchSelect(branch.id)}
                      className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all group hover:shadow-md"
                    >
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={branch.image}
                          alt={branch.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <h4 className="font-semibold text-gray-900 mb-2 text-left">
                          {branch.name}
                        </h4>
                        <div className="mb-2 flex min-h-10 items-start gap-2 text-sm text-gray-500">
                          <MapPin className="w-4 h-4" />
                          <span className="line-clamp-2 text-left">{branch.location}</span>
                        </div>
                        <div className="flex items-center gap-1 mb-3">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium text-gray-900">
                            {branch.rating}
                          </span>
                          <span className="text-sm text-gray-500">(250+ reviews)</span>
                        </div>

                        {/* Promotions Tags */}
                        {branch.promotions.length > 0 && (
                          <div className="mt-auto flex flex-wrap gap-1">
                            {branch.promotions.slice(0, 2).map((promo) => (
                              <span
                                key={promo}
                                className="px-2 py-1 bg-indigo-50 text-[#4F46E5] text-xs rounded-md border border-indigo-200"
                              >
                                {promo}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  </motion.div>
                ))}
              </div>

              {filteredBranches.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No branches found in this area</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="mobile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Location Input */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mb-8"
              >
                <div className="relative max-w-2xl">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={mobileLocation}
                    onChange={(e) => {
                      setMobileLocation(e.target.value);
                      setMobileError('');
                    }}
                    placeholder="Enter your pin code for mobile service"
                    className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all shadow-sm"
                  />
                </div>
                {mobileError ? (
                  <p className="mt-2 text-sm text-red-600">{mobileError}</p>
                ) : null}
              </motion.div>

              {/* Continue Button for Mobile Service */}
              <div className="sticky bottom-0 bg-white py-4 -mx-4 px-4 border-t border-gray-200">
                <div className="max-w-2xl mx-auto">
                  <button
                    onClick={handleMobileServiceContinue}
                    disabled={!mobileLocation.trim() || mobileBusy}
                    className={`w-full py-4 rounded-xl font-medium transition-all ${
                      mobileLocation.trim() && !mobileBusy
                        ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-sm'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {mobileBusy ? 'Checking availability...' : 'Continue with Mobile Service'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
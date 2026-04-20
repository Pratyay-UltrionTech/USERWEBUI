import { useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  CreditCard,
  Apple,
  Wallet,
  Check,
  Tag,
  X,
  Sparkles,
  TrendingDown,
  HandCoins,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import {
  createOnlineBooking,
  getFreeCoffeeCupsForLineItem,
  listApplicableDiscounts,
  listBranchPromoCodes,
} from '../lib/adminPortalBridge';
import {
  createMobileOnlineBooking,
  getCachedMobileSnapshot,
  getMobileFreeCoffeeCupsForLineItem,
  listApplicableMobileDiscounts,
  listMobilePromoCodes,
} from '../lib/mobilePublicBridge';
import { useAdminBridgeSync } from '../hooks/useAdminBridgeSync';

const PAYMENT_METHODS = [
  {
    id: 'card',
    name: 'Credit / Debit Card',
    icon: CreditCard,
    description: 'Pay securely with your card',
  },
  {
    id: 'apple',
    name: 'Apple Pay',
    icon: Apple,
    description: 'Fast and secure payment',
  },
  {
    id: 'later',
    name: 'Pay After Service',
    icon: Wallet,
    description: 'Pay when service is completed',
  },
];

export function PaymentPage() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    hasCustomerSession,
    session,
    customerLogin,
    customerRegister,
    updateCustomerProfile,
  } = useAuth();
  const {
    selectedBranch,
    serviceType,
    selectedService,
    selectedAddOns,
    selectedDate,
    selectedTime,
    selectedEndTime,
    vehicleType,
    getTotalPrice,
    setConfirmedBooking,
  } = useBooking();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; type: string } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [selectedScheduleOfferIds, setSelectedScheduleOfferIds] = useState<string[]>([]);
  /** Optional tip in cents (shown to washer / branch; not taxed in this summary). */
  const [tipCents, setTipCents] = useState(0);
  const [tipInput, setTipInput] = useState('');
  const syncSeed = useAdminBridgeSync(30000);
  const mobileSnapshot = getCachedMobileSnapshot();

  // User type and details
  const [userType, setUserType] = useState<'guest' | 'existing'>('existing');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Existing customer login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [paymentAuthError, setPaymentAuthError] = useState('');
  const [paymentAuthBusy, setPaymentAuthBusy] = useState(false);

  const subtotal = getTotalPrice();
  const toISO = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const dateISO = selectedDate ? toISO(selectedDate) : '';
  const liveOffers = useMemo(
    () =>
      selectedBranch && selectedService && selectedTime && vehicleType && dateISO
        ? serviceType === 'onsite'
          ? (mobileSnapshot
              ? listApplicableMobileDiscounts(
                  mobileSnapshot,
                  dateISO,
                  selectedTime,
                  selectedService.id,
                  vehicleType
                )
              : [])
          : listApplicableDiscounts(selectedBranch.id, dateISO, selectedTime, selectedService.id, vehicleType)
        : [],
    [selectedBranch, selectedService, selectedTime, vehicleType, dateISO, serviceType, mobileSnapshot, syncSeed]
  );
  const livePromos = useMemo(
    () =>
      selectedBranch
        ? serviceType === 'onsite'
          ? (mobileSnapshot ? listMobilePromoCodes(mobileSnapshot, dateISO || undefined) : [])
          : listBranchPromoCodes(selectedBranch.id, dateISO || undefined)
        : [],
    [selectedBranch, serviceType, mobileSnapshot, dateISO, syncSeed]
  );

  const eligibleScheduleOffers = liveOffers.map((o) => ({
    id: o.id,
    name: o.title,
    description: o.description,
    discount: o.discountType === 'percentage' ? o.discountValue : Math.round((o.discountValue / Math.max(1, subtotal)) * 100),
  }));

  const scheduleDiscountAmount = eligibleScheduleOffers
    .filter((o) => selectedScheduleOfferIds.includes(o.id))
    .reduce((sum, o) => sum + (subtotal * o.discount) / 100, 0);

  const subtotalAfterSchedule = Math.max(0, subtotal - scheduleDiscountAmount);

  const promoDiscountAmount = (() => {
    if (!appliedPromo) return 0;
    if (appliedPromo.type === 'percentage') {
      return (subtotalAfterSchedule * appliedPromo.discount) / 100;
    }
    return Math.min(appliedPromo.discount, subtotalAfterSchedule);
  })();

  const preTaxAmount = Math.max(0, subtotalAfterSchedule - promoDiscountAmount);
  const tax = preTaxAmount * 0.1;
  const finalTotal = preTaxAmount + tax;
  const preDiscountTotal = subtotal * 1.1;
  const tipDollars = tipCents / 100;
  const payAtBooking = finalTotal + tipDollars;

  const toggleScheduleOffer = (id: string) => {
    setSelectedScheduleOfferIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const applyPromoCode = (code: string) => {
    const upper = code.toUpperCase().trim();
    const promo = livePromos.find((p) => p.codeName.toUpperCase() === upper);
    if (promo) {
      setAppliedPromo({
        code: upper,
        discount: promo.discountValue,
        type: promo.discountType === 'flat' ? 'fixed' : promo.discountType,
      });
      setPromoError('');
      setPromoCode('');
    } else {
      setPromoError('Invalid promo code');
      setTimeout(() => setPromoError(''), 3000);
    }
  };

  const handleApplyPromo = () => applyPromoCode(promoCode);

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError('');
  };

  const handleConfirm = async () => {
    if (!selectedMethod || !selectedBranch || !selectedService || !selectedDate || !selectedTime || !vehicleType) return;
    if (profileIncomplete) return;

    setIsProcessing(true);
    const customerName =
      isAuthenticated && session
        ? session.fullName?.trim() || session.email
        : `${firstName} ${lastName}`.trim() || 'Online Customer';
    const phoneVal =
      isAuthenticated && session
        ? session.phone?.trim() || '-'
        : userType === 'guest'
          ? mobile.trim() || '-'
          : mobile.trim() || loginEmail.trim() || '-';
    const addressVal =
      isAuthenticated && session ? session.address?.trim() || '-' : address.trim() || '-';

    const write =
      serviceType === 'onsite'
        ? await createMobileOnlineBooking({
            cityPinCode: selectedBranch.id.replace(/^mobile-/, ''),
            customerName,
            phone: phoneVal,
            address: addressVal,
            vehicleSummary: vehicleType,
            serviceId: selectedService.id,
            vehicleType,
            selectedAddonIds: selectedAddOns.map((a) => a.id),
            slotDate: dateISO,
            startTime: selectedTime,
            endTime: selectedEndTime ?? undefined,
            notes: `${selectedService.name}${selectedAddOns.length ? ` + ${selectedAddOns.map((a) => a.name).join(', ')}` : ''}`,
            tipCents,
          })
        : await createOnlineBooking({
            branchId: selectedBranch.id,
            customerName,
            phone: phoneVal,
            address: addressVal,
            vehicleType,
            serviceSummary: `${selectedService.name}${selectedAddOns.length ? ` + ${selectedAddOns.map((a) => a.name).join(', ')}` : ''}`,
            serviceId: selectedService.id,
            selectedAddonIds: selectedAddOns.map((a) => a.id),
            slotDate: dateISO,
            startTime: selectedTime,
            endTime: selectedEndTime ?? undefined,
            tipCents,
          });
    if (!write.ok) {
      setIsProcessing(false);
      navigate('/datetime');
      return;
    }
    
    // Save guest/user session info for a personalized home experience
    try {
      localStorage.setItem('carwash_last_customer_name', customerName);
      localStorage.setItem('carwash_last_customer_phone', phoneVal);
    } catch { /* ignore */ }

    const b = write.booking;
    flushSync(() => {
      setConfirmedBooking({
        id: b.id,
        branchId: serviceType === 'onsite' ? undefined : selectedBranch.id,
        status: b.status ?? 'scheduled',
        tipCents: typeof b.tip_cents === 'number' ? b.tip_cents : tipCents,
        subtotal,
        tax,
        discounts: scheduleDiscountAmount + promoDiscountAmount,
        total: finalTotal,
        createdAt: new Date().toISOString(),
        freeCoffeeCount:
          serviceType === 'onsite'
            ? getMobileFreeCoffeeCupsForLineItem(mobileSnapshot, vehicleType, selectedService.id)
            : getFreeCoffeeCupsForLineItem(selectedBranch.id, vehicleType, selectedService.id),
      });
    });
    setIsProcessing(false);
    navigate('/success', { replace: true });
  };

  const profileIncomplete =
    !isAuthenticated && hasCustomerSession && session && !session.profileCompleted;

  const isUserDetailsValid = () => {
    if (isAuthenticated) return true;
    if (profileIncomplete) return false;
    if (userType === 'existing') {
      return !!(loginEmail && loginPassword);
    }
    const basicDetailsValid = !!(firstName && lastName && mobile && address && guestEmail);
    if (createAccount) {
      return (
        basicDetailsValid &&
        !!password &&
        password.length >= 8 &&
        !!confirmPassword &&
        password === confirmPassword
      );
    }
    return basicDetailsValid;
  };

  const canConfirm =
    selectedMethod &&
    !profileIncomplete &&
    isUserDetailsValid() &&
    (selectedMethod !== 'card' ||
      (cardNumber && expiryDate && cvv && cardName));

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
              <h1 className="text-lg font-semibold text-gray-900">Payment</h1>
              <p className="text-sm text-gray-500">Choose your payment method</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* User details: only when not already signed in (guest browser session) */}
          {!isAuthenticated && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {profileIncomplete ? (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Complete your profile</h2>
                <p className="text-sm text-gray-600">
                  Add your contact details on the profile page, then return here to finish payment.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/profile-setup')}
                  className="w-full py-3 rounded-lg font-medium bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-sm"
                >
                  Go to profile setup
                </button>
              </div>
            ) : (
              <>
            {paymentAuthError ? (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {paymentAuthError}
              </div>
            ) : null}
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Final Step - Your Details
            </h2>

            {/* User Type Selection — existing customer first, guest second */}
            <div className="space-y-4 mb-6">
              <button
                type="button"
                onClick={() => {
                  setPaymentAuthError('');
                  setUserType('existing');
                }}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  userType === 'existing'
                    ? 'border-[#4F46E5] bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      userType === 'existing'
                        ? 'bg-[#4F46E5] border-[#4F46E5]'
                        : 'border-gray-300'
                    }`}>
                      {userType === 'existing' && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span className="font-medium text-gray-900">Log in as existing customer</span>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentAuthError('');
                  setUserType('guest');
                }}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  userType === 'guest'
                    ? 'border-[#4F46E5] bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      userType === 'guest'
                        ? 'bg-[#4F46E5] border-[#4F46E5]'
                        : 'border-gray-300'
                    }`}>
                      {userType === 'guest' && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <span className="font-medium text-gray-900">Continue as guest</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Guest Checkout Form */}
            {userType === 'guest' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St, Apartment 4B, Los Angeles, CA 90001"
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all resize-none"
                    required
                  />
                </div>

                {/* Create Account Checkbox */}
                <div className="pt-4 border-t border-gray-200">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input
                        type="checkbox"
                        checked={createAccount}
                        onChange={(e) => setCreateAccount(e.target.checked)}
                        className="w-5 h-5 border-2 border-gray-300 rounded text-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5] focus:ring-offset-0 cursor-pointer"
                      />
                    </div>
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      Create a Customer Account for Faster Checkout Next Time
                    </span>
                  </label>
                </div>

                {/* Account Creation Fields (shown when create account is checked) */}
                {createAccount && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 pt-4 border-t border-gray-200"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all"
                          required
                        />
                        {password && confirmPassword && password !== confirmPassword && (
                          <p className="text-sm text-red-500 mt-1">Passwords do not match</p>
                        )}
                      </div>
                    </div>

                    {/* Create Account Button */}
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!isUserDetailsValid()) return;
                          setPaymentAuthError('');
                          setPaymentAuthBusy(true);
                          try {
                            await customerRegister(guestEmail.trim(), password);
                            await updateCustomerProfile({
                              full_name: `${firstName} ${lastName}`.trim(),
                              phone: mobile.trim(),
                              address: address.trim(),
                              vehicles: [],
                            });
                          } catch (e) {
                            setPaymentAuthError(
                              e instanceof Error ? e.message : 'Could not create account'
                            );
                          } finally {
                            setPaymentAuthBusy(false);
                          }
                        }}
                        disabled={!isUserDetailsValid() || paymentAuthBusy}
                        className={`w-full py-3 rounded-lg font-medium transition-all ${
                          isUserDetailsValid() && !paymentAuthBusy
                            ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-sm'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {paymentAuthBusy ? 'Creating account…' : 'Create account'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Existing Customer Login Form */}
            {userType === 'existing' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="text-sm text-[#4F46E5] hover:text-[#4338CA] font-medium"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Login Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!loginEmail || !loginPassword) return;
                      setPaymentAuthError('');
                      setPaymentAuthBusy(true);
                      try {
                        await customerLogin(loginEmail.trim(), loginPassword);
                      } catch (e) {
                        setPaymentAuthError(e instanceof Error ? e.message : 'Login failed');
                      } finally {
                        setPaymentAuthBusy(false);
                      }
                    }}
                    disabled={!loginEmail || !loginPassword || paymentAuthBusy}
                    className={`w-full py-3 rounded-lg font-medium transition-all ${
                      loginEmail && loginPassword && !paymentAuthBusy
                        ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-sm'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {paymentAuthBusy ? 'Signing in…' : 'Log in'}
                  </button>
                </div>
              </motion.div>
            )}
              </>
            )}
          </div>
          )}

          {/* Payment Methods */}
          <div className="space-y-3">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedMethod === method.id;

              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`w-full p-5 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-[#4F46E5] bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          isSelected
                            ? 'bg-[#4F46E5] bg-opacity-10'
                            : 'bg-gray-100'
                        }`}
                      >
                        <Icon
                          className={`w-6 h-6 ${
                            isSelected ? 'text-[#4F46E5]' : 'text-gray-600'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{method.name}</p>
                        <p className="text-sm text-gray-500">{method.description}</p>
                      </div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-[#4F46E5] border-[#4F46E5]'
                          : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Card Details Form */}
          {selectedMethod === 'card' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Card Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Number
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CVV
                    </label>
                    <input
                      type="text"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      placeholder="123"
                      maxLength={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Day / time pricing & savings (optional selections) */}
          {eligibleScheduleOffers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-sm border-2 border-green-200 p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Great Choice! You Can Save More
                  </h3>
                  <p className="text-sm text-green-700">
                    Select any eligible day & time offers for this booking. Add a promo code below if you have one.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {eligibleScheduleOffers.map((offer) => {
                  const checked = selectedScheduleOfferIds.includes(offer.id);
                  const amount = (subtotal * offer.discount) / 100;
                  return (
                    <label
                      key={offer.id}
                      className={`flex items-center justify-between gap-3 p-3 bg-white rounded-lg border-2 cursor-pointer transition-all ${
                        checked ? 'border-green-500 ring-1 ring-green-200' : 'border-green-200 hover:border-green-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleScheduleOffer(offer.id)}
                          className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 shrink-0"
                        />
                        <TrendingDown className="w-5 h-5 text-green-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{offer.name}</p>
                          <p className="text-xs text-gray-500">{offer.description}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-green-600">{offer.discount}% OFF</p>
                        <p className="text-xs text-gray-500">-${amount.toFixed(2)}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {scheduleDiscountAmount > 0 && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Day & time savings (before tax)</p>
                    <p className="text-xl font-bold text-green-600">-${scheduleDiscountAmount.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Promo Code Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5 text-[#4F46E5]" />
              <h3 className="text-lg font-semibold text-gray-900">Promo code</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Tap a coupon to apply it instantly, or type a code and press Apply.
            </p>

            {!appliedPromo ? (
              <div>
                <div className="flex gap-3 mb-4">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => {
                      setPromoCode(e.target.value.toUpperCase());
                      setPromoError('');
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleApplyPromo()}
                    placeholder="Enter promo code"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all uppercase"
                  />
                  <button
                    onClick={handleApplyPromo}
                    disabled={!promoCode.trim()}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                      promoCode.trim()
                        ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Apply
                  </button>
                </div>
                {promoError && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-indigo-500 mb-4"
                  >
                    {promoError}
                  </motion.p>
                )}
                
                {/* Available Promo Codes */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Available Promo Codes:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {livePromos.map((details) => (
                      <button
                        key={details.id}
                        type="button"
                        onClick={() => applyPromoCode(details.codeName)}
                        className="p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#4F46E5] hover:bg-indigo-50 transition-all text-left group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-900 text-sm">{details.codeName}</p>
                          <div className="w-6 h-6 bg-[#4F46E5] bg-opacity-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Check className="w-4 h-4 text-[#4F46E5]" />
                          </div>
                        </div>
                        <p className="text-xs text-[#4F46E5] font-medium">
                          {details.discountType === 'percentage'
                            ? `${details.discountValue}% OFF`
                            : `$${details.discountValue} OFF`}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-between p-4 bg-green-50 border-2 border-green-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{appliedPromo.code}</p>
                    <p className="text-sm text-green-700">
                      {appliedPromo.type === 'percentage'
                        ? `${appliedPromo.discount}% off`
                        : `$${appliedPromo.discount} off`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRemovePromo}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </motion.div>
            )}
          </div>

          {/* Optional tip — stored on booking for branch / washer */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <HandCoins className="w-5 h-5 text-[#4F46E5]" />
              <h3 className="text-lg font-semibold text-gray-900">Add a tip (optional)</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              100% goes to the team at the branch. You can change this anytime before you confirm.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { label: 'No tip', cents: 0 },
                { label: '$5', cents: 500 },
                { label: '$10', cents: 1000 },
                { label: '$15', cents: 1500 },
                { label: '$20', cents: 2000 },
                { label: '$25', cents: 2500 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    setTipCents(opt.cents);
                    setTipInput(opt.cents === 0 ? '' : (opt.cents / 100).toString());
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    tipCents === opt.cents
                      ? 'border-[#4F46E5] bg-indigo-50 text-[#4F46E5]'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Custom tip ($)</label>
            <input
              type="text"
              inputMode="decimal"
              value={tipInput}
              placeholder="0.00"
              onChange={(e) => {
                const v = e.target.value;
                // Allow only numbers and one decimal point
                if (v !== '' && !/^\d*\.?\d*$/.test(v)) return;
                
                setTipInput(v);
                if (v === '' || v === '.') {
                  setTipCents(0);
                  return;
                }
                const n = Number.parseFloat(v);
                if (!Number.isFinite(n) || n < 0) return;
                setTipCents(Math.min(50_000, Math.round(n * 100)));
              }}
              className="w-full max-w-[12rem] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 outline-none"
            />
          </div>

          {/* Total Amount */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-gray-600">
                <p>Subtotal</p>
                <p>${subtotal.toFixed(2)}</p>
              </div>
              {scheduleDiscountAmount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between text-green-600"
                >
                  <p className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" />
                    Day & time offers
                  </p>
                  <p>-${scheduleDiscountAmount.toFixed(2)}</p>
                </motion.div>
              )}
              {appliedPromo && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between text-green-600"
                >
                  <p className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Promo ({appliedPromo.code})
                  </p>
                  <p>-${promoDiscountAmount.toFixed(2)}</p>
                </motion.div>
              )}
              <div className="flex items-center justify-between text-gray-600">
                <p>Tax (10%)</p>
                <p>${tax.toFixed(2)}</p>
              </div>
              {tipCents > 0 && (
                <div className="flex items-center justify-between text-indigo-700">
                  <p className="flex items-center gap-2">
                    <HandCoins className="w-4 h-4" />
                    Tip
                  </p>
                  <p>${tipDollars.toFixed(2)}</p>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-gray-600 mb-1">{tipCents > 0 ? 'Service total (incl. tax)' : 'Total Amount'}</p>
                  {(scheduleDiscountAmount > 0 || appliedPromo) && (
                    <p className="text-sm text-gray-400 line-through">
                      ${preDiscountTotal.toFixed(2)}
                    </p>
                  )}
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  ${(tipCents > 0 ? finalTotal : payAtBooking).toFixed(2)}
                </p>
              </div>
              {tipCents > 0 && (
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <p className="font-semibold text-gray-900">Due now (service + tip)</p>
                  <p className="text-2xl font-bold text-gray-900">${payAtBooking.toFixed(2)}</p>
                </div>
              )}
              <p className="text-sm text-gray-500 text-right">
                {tipCents > 0 ? 'Tax applies to service only; tip is separate.' : 'Including taxes'}
              </p>
            </div>
          </div>

          {/* Security Note */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              <span className="font-medium">🔒 Secure Payment:</span> Your payment
              information is encrypted and secure
            </p>
          </div>
        </motion.div>

        {/* Confirm Button */}
        <div className="mt-8 sticky bottom-0 bg-gray-50 py-4 -mx-4 px-4 border-t border-gray-200">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={handleConfirm}
              disabled={!canConfirm || isProcessing}
              className={`w-full py-4 rounded-xl font-medium transition-all ${
                canConfirm && !isProcessing
                  ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-sm'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Confirm Booking'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
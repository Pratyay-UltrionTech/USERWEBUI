import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, Car, CarFront, Truck, Sparkles, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useBooking } from '../context/BookingContext';
import { getBranchById, getCatalogForVehicle, listVehicleTypes } from '../lib/adminPortalBridge';
import {
  fetchMobileSnapshot,
  getCachedMobileSnapshot,
  getMobileCatalogForVehicle,
  listMobileVehicleTypes,
  type MobileSnapshot,
} from '../lib/mobilePublicBridge';
import { useAdminBridgeSync } from '../hooks/useAdminBridgeSync';

const ACCENT_RING = 'border-[#4F46E5] ring-2 ring-[#4F46E5]/20';

type ServicePackage = {
  id: string;
  name: string;
  price: number;
  /** Shown as bullet list under the service title */
  features: string[];
  recommended?: boolean;
};

export function BranchSelection() {
  const navigate = useNavigate();
  const { branchId } = useParams();
  const [searchParams] = useSearchParams();
  const serviceTypeFromUrl = searchParams.get('serviceType') as 'branch' | 'onsite' | null;

  const { selectedBranch, setServiceType, setVehicleType, setSelectedService, setSelectedBranch } = useBooking();
  const syncSeed = useAdminBridgeSync(30000);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [mobileSnapshot, setMobileSnapshot] = useState<MobileSnapshot | null>(getCachedMobileSnapshot());
  const [mobileError, setMobileError] = useState('');
  const isMobileFlow = serviceTypeFromUrl === 'onsite' && branchId === 'mobile';
  const mobilePinFromUrl = searchParams.get('pin')?.trim() ?? '';
  const mobilePin = mobilePinFromUrl || (selectedBranch?.id.startsWith('mobile-') ? selectedBranch.id.slice('mobile-'.length) : '');
  const branchLive = branchId ? getBranchById(branchId) : null;
  const branch = branchLive ?? selectedBranch ?? { name: 'CarWash Location', location: 'Select a branch' };
  const vehicleTypes = useMemo(() => {
    if (isMobileFlow) {
      return mobileSnapshot ? listMobileVehicleTypes(mobileSnapshot) : [];
    }
    return branchId ? listVehicleTypes(branchId) : [];
  }, [branchId, isMobileFlow, mobileSnapshot, syncSeed]);
  const VEHICLE_OPTIONS = useMemo(
    () =>
      vehicleTypes.map((v, idx) => ({
        id: v,
        label: v,
        icon: idx % 3 === 0 ? Car : idx % 3 === 1 ? CarFront : Truck,
      })),
    [vehicleTypes]
  );
  const PACKAGES: ServicePackage[] = useMemo(() => {
    if (!vehicleId) return [];
    const cat = isMobileFlow
      ? (mobileSnapshot ? getMobileCatalogForVehicle(mobileSnapshot, vehicleId) : { services: [], addons: [] })
      : (branchId ? getCatalogForVehicle(branchId, vehicleId) : { services: [], addons: [] });
    return cat.services.map((s, idx) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      features: s.descriptionPoints ?? [],
      recommended: s.recommended === true || idx === 0,
    }));
  }, [branchId, isMobileFlow, mobileSnapshot, vehicleId, syncSeed]);

  useEffect(() => {
    setServiceType(serviceTypeFromUrl ?? 'branch');
  }, [serviceTypeFromUrl, setServiceType]);
  useEffect(() => {
    if (branchLive) {
      setSelectedBranch({ id: branchLive.id, name: branchLive.name, location: branchLive.location, rating: 0, image: '' });
    }
  }, [branchLive, setSelectedBranch]);
  useEffect(() => {
    let active = true;
    if (!isMobileFlow || !mobilePin) return;
    const run = async () => {
      try {
        const snapshot = await fetchMobileSnapshot(mobilePin);
        if (!active) return;
        setMobileSnapshot(snapshot);
        setSelectedBranch({
          id: `mobile-${snapshot.service_area.city_pin_code}`,
          name: 'Mobile Service',
          location: `PIN ${snapshot.service_area.city_pin_code}`,
          rating: 0,
          image: '',
        });
        setMobileError('');
      } catch {
        if (active) setMobileError('Could not load mobile catalog for this pin code.');
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [isMobileFlow, mobilePin, setSelectedBranch]);
  useEffect(() => {
    if (!vehicleId && VEHICLE_OPTIONS.length) setVehicleId(VEHICLE_OPTIONS[0]!.id);
  }, [vehicleId, VEHICLE_OPTIONS]);

  const selectedPackage = useMemo(
    () => PACKAGES.find((p) => p.id === selectedPackageId) ?? null,
    [selectedPackageId, PACKAGES]
  );
  useEffect(() => {
    if (!PACKAGES.length) {
      if (selectedPackageId !== null) setSelectedPackageId(null);
      return;
    }
    const stillValid = selectedPackageId
      ? PACKAGES.some((p) => p.id === selectedPackageId)
      : false;
    if (!stillValid) {
      setSelectedPackageId(PACKAGES[0]!.id);
    }
  }, [selectedPackageId, PACKAGES]);

  const canContinue = Boolean(vehicleId && selectedPackage);

  const handleContinue = () => {
    if (!vehicleId || !selectedPackage) return;

    const vehicleLabel = VEHICLE_OPTIONS.find((v) => v.id === vehicleId)?.label ?? vehicleId;
    const price = selectedPackage.price;
    if (isMobileFlow && mobileSnapshot) {
      setSelectedBranch({
        id: `mobile-${mobileSnapshot.service_area.city_pin_code}`,
        name: 'Mobile Service',
        location: `PIN ${mobileSnapshot.service_area.city_pin_code}`,
        rating: 0,
        image: '',
      });
    } else if (branchLive) {
      setSelectedBranch({
        id: branchLive.id,
        name: branchLive.name,
        location: branchLive.location,
        rating: 0,
        image: '',
      });      
    }

    setVehicleType(vehicleLabel);
    setSelectedService({
      id: selectedPackage.id,
      name: selectedPackage.name,
      price,
      features: [...selectedPackage.features],
      recommended: Boolean(selectedPackage.recommended),
    });

    navigate('/add-ons');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{branch.name}</h1>
              <p className="text-sm text-gray-500">{branch.location}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pt-8 pb-[calc(8rem+env(safe-area-inset-bottom,0px))]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-8"
        >
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Select Vehicle &amp; Service</h2>
            {mobileError ? <p className="mt-2 text-sm text-red-600">{mobileError}</p> : null}
          </div>

          <section className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Select Vehicle:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {VEHICLE_OPTIONS.map((v, index) => {
                const Icon = v.icon;
                const selected = vehicleId === v.id;
                return (
                  <motion.button
                    key={v.id}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    onClick={() => {
                      setVehicleId(v.id);
                      setSelectedPackageId(null);
                    }}
                    className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 px-3 py-5 transition-all bg-white ${
                      selected ? ACCENT_RING : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-10 h-10 ${selected ? 'text-[#4F46E5]' : 'text-gray-600'}`} strokeWidth={1.25} />
                    <span className="text-xs sm:text-sm font-semibold text-gray-900 tracking-wide text-center">
                      {v.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Choose a service:</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-stretch md:gap-3 lg:gap-4">
              {PACKAGES.map((pkg) => {
                const selected = selectedPackageId === pkg.id;
                  const displayPrice = `$${pkg.price}`;
                const isRecommended = Boolean(pkg.recommended);
                return (
                  <div
                    key={pkg.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected}
                    aria-label={`${pkg.name}, ${displayPrice}${selected ? ', selected' : ''}`}
                    onClick={() => setSelectedPackageId(pkg.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedPackageId(pkg.id);
                      }
                    }}
                    className={`relative flex h-full min-h-0 flex-col overflow-visible rounded-xl border-2 transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 ${
                      isRecommended ? 'bg-gradient-to-b from-indigo-50 to-white' : 'bg-white'
                    } ${
                      selected ? ACCENT_RING : 'border-gray-200 hover:border-gray-300'
                    } cursor-pointer shadow-sm`}
                  >
                    {isRecommended ? (
                      <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#4F46E5]/35 bg-white px-4 py-1 shadow-[0_1px_6px_rgba(79,70,229,0.2)]">
                        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#4F46E5] sm:text-xs">
                          <Sparkles className="h-3.5 w-3.5 text-[#4F46E5]" aria-hidden />
                          Recommended
                        </span>
                      </div>
                    ) : null}
                    <div className={`flex h-full min-h-0 flex-1 flex-col p-4 sm:p-5 ${isRecommended ? 'pt-6 sm:pt-7' : ''}`}>
                      <div className="flex shrink-0 items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold leading-snug text-gray-900 sm:text-lg">
                            {pkg.name}
                          </h3>
                        </div>
                        <span className="shrink-0 whitespace-nowrap text-right text-lg font-bold tabular-nums text-[#4F46E5]">
                          {displayPrice}
                        </span>
                      </div>
                      <ul className="mt-3 flex-1 space-y-1.5 border-t border-gray-200/80 pt-3 text-sm text-gray-600">
                        {pkg.features.map((line) => (
                          <li key={line} className="flex gap-2">
                            <Check
                              className="mt-0.5 h-4 w-4 shrink-0 text-[#4F46E5]"
                              strokeWidth={2.5}
                              aria-hidden
                            />
                            <span className="leading-snug">{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>
            {!vehicleId && (
              <p className="text-xs text-gray-500">Select a vehicle to see prices for each package.</p>
            )}
          </section>
        </motion.div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-gray-50/95 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className={`w-full rounded-xl py-4 text-base font-medium transition-all ${
              canContinue
                ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA] shadow-sm'
                : 'cursor-not-allowed bg-gray-200 text-gray-400'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

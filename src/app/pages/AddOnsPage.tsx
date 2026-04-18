import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useBooking } from '../context/BookingContext';
import { getCatalogForVehicle, listBranchAddons } from '../lib/adminPortalBridge';
import { getCachedMobileSnapshot, getMobileCatalogForVehicle } from '../lib/mobilePublicBridge';
import { useAdminBridgeSync } from '../hooks/useAdminBridgeSync';

/** Additional services from menu — flat rates (branch & mobile). */
export function AddOnsPage() {
  const navigate = useNavigate();
  const {
    selectedBranch,
    serviceType,
    vehicleType,
    selectedAddOns: bookingAddOns,
    toggleAddOn: toggleBookingAddOn,
    setSelectedAddOns: setBookingAddOns,
  } = useBooking();
  const syncSeed = useAdminBridgeSync(30000);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const mobileSnapshot = getCachedMobileSnapshot();
  const ADDONS = useMemo(() => {
    if (!selectedBranch) return [];
    const source =
      serviceType === 'onsite' && mobileSnapshot && vehicleType
        ? getMobileCatalogForVehicle(mobileSnapshot, vehicleType).addons
        : (() => {
            const vehicleScoped = vehicleType ? getCatalogForVehicle(selectedBranch.id, vehicleType).addons : [];
            const branchScoped = listBranchAddons(selectedBranch.id);
            return vehicleScoped.length ? vehicleScoped : branchScoped;
          })();
    return source.map((a) => ({
      id: a.id,
      name: a.name,
      price: a.price,
      description: (a.descriptionPoints ?? []).join(', '),
    }));
  }, [selectedBranch, serviceType, vehicleType, mobileSnapshot, syncSeed]);
  useEffect(() => {
    setSelectedAddOnIds(bookingAddOns.map((a) => a.id));
  }, [bookingAddOns]);
  useEffect(() => {
    if (!selectedBranch) {
      navigate(-1);
    }
  }, [selectedBranch, navigate]);

  const toggleAddOn = (id: string) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    const addon = ADDONS.find((a) => a.id === id);
    if (addon) {
      toggleBookingAddOn({ id: addon.id, name: addon.name, price: addon.price });
    }
  };

  const getTotalPrice = () => {
    return ADDONS.filter((addon) => selectedAddOnIds.includes(addon.id)).reduce(
      (sum, addon) => sum + addon.price,
      0
    );
  };

  const handleContinue = () => {
    navigate('/datetime');
  };

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
              <h1 className="text-lg font-semibold text-gray-900">Add-Ons</h1>
              <p className="text-sm text-gray-500">Enhance your service (Optional)</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Select Add-Ons
            </h2>
            <p className="text-gray-500">
              Customize your service with these optional extras
            </p>
          </div>

          {/* Add-Ons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ADDONS.map((addon) => (
              <button
                key={addon.id}
                onClick={() => toggleAddOn(addon.id)}
                className={`p-5 rounded-xl border-2 transition-all text-left ${
                  selectedAddOnIds.includes(addon.id)
                    ? 'border-[#4F46E5] bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {addon.name}
                    </h3>
                    <p className="text-sm text-gray-500">{addon.description}</p>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3 transition-all ${
                      selectedAddOnIds.includes(addon.id)
                        ? 'bg-[#4F46E5] border-[#4F46E5]'
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedAddOnIds.includes(addon.id) && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
                <div className="text-lg font-semibold text-[#4F46E5]">
                  +${addon.price}
                </div>
              </button>
            ))}
          </div>

          {/* Summary Card */}
          {selectedAddOnIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4">Selected Add-Ons</h3>
              <div className="space-y-2 mb-4">
                {ADDONS.filter((addon) => selectedAddOnIds.includes(addon.id)).map(
                  (addon) => (
                    <div
                      key={addon.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-600">{addon.name}</span>
                      <span className="font-medium text-gray-900">
                        ${addon.price}
                      </span>
                    </div>
                  )
                )}
              </div>
              <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                <span className="font-semibold text-gray-900">Total Add-Ons</span>
                <span className="text-xl font-bold text-[#4F46E5]">
                  ${getTotalPrice()}
                </span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Action Buttons */}
        <div className="mt-8 sticky bottom-0 bg-gray-50 py-4 -mx-4 px-4 border-t border-gray-200">
          <div className="max-w-4xl mx-auto space-y-3">
            <button
              onClick={handleContinue}
              className="w-full bg-[#4F46E5] text-white py-4 rounded-xl font-medium hover:bg-[#4338CA] transition-colors shadow-sm"
            >
              {selectedAddOnIds.length > 0
                ? `Continue with ${selectedAddOnIds.length} Add-On${
                    selectedAddOnIds.length > 1 ? 's' : ''
                  }`
                : 'Skip Add-Ons'}
            </button>
            {selectedAddOnIds.length > 0 && (
              <button
                onClick={() => {
                  setSelectedAddOnIds([]);
                  setBookingAddOns([]);
                }}
                className="w-full text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-100 transition-colors"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
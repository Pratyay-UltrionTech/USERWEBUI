import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useBooking } from '../context/BookingContext';
import { getCatalogForVehicle, listBranchAddons } from '../lib/adminPortalBridge';

export function AddOnsPageConnected() {
  const navigate = useNavigate();
  const { selectedBranch, vehicleType, selectedAddOns, toggleAddOn } = useBooking();
  const addons = useMemo(() => {
    if (!selectedBranch) return [];
    const branchAddons = listBranchAddons(selectedBranch.id);
    if (branchAddons.length > 0) return branchAddons;
    if (!vehicleType) return [];
    return getCatalogForVehicle(selectedBranch.id, vehicleType).addons;
  }, [selectedBranch, vehicleType]);

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Add-ons</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {addons.map((addon) => {
          const selected = selectedAddOns.some((a) => a.id === addon.id);
          return (
            <button
              key={addon.id}
              type="button"
              onClick={() => toggleAddOn({ id: addon.id, name: addon.name, price: addon.price })}
              className={`rounded-lg border p-4 text-left ${selected ? 'border-indigo-600 bg-indigo-50' : ''}`}
            >
              <p className="font-medium">{addon.name}</p>
              <p className="text-sm text-gray-600">${addon.price.toFixed(2)}</p>
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => navigate('/datetime')} className="rounded-md bg-indigo-600 px-4 py-2 text-white">
        Continue
      </button>
    </div>
  );
}

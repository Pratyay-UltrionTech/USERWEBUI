import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, MapPin, Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { clearSignupProfilePending } from '../lib/signupProfileGate';
import { apiGetCustomerMe } from '../lib/userApi';

interface Vehicle {
  id: string;
  type: string;
  number: string;
}

export function ProfileSetup() {
  const navigate = useNavigate();
  const { hasCustomerSession, session, updateCustomerProfile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [currentVehicle, setCurrentVehicle] = useState({ type: '', number: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!hasCustomerSession) {
      navigate('/login', { replace: true });
    }
  }, [hasCustomerSession, navigate]);

  useEffect(() => {
    if (!session?.accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await apiGetCustomerMe(session.accessToken);
        if (cancelled) return;
        setEmail(me.email);
        if (me.full_name) setName(me.full_name);
        if (me.phone) setPhone(me.phone);
        if (me.address) setAddress(me.address);
        if (me.vehicles?.length) {
          setVehicles(
            me.vehicles.map((v, i) => ({
              id: `v-${i}-${v.number}`,
              type: v.type,
              number: v.number,
            }))
          );
        }
      } catch {
        if (!cancelled) setEmail(session?.email ?? '');
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken, session?.email]);

  const addVehicle = () => {
    if (currentVehicle.type && currentVehicle.number) {
      setVehicles([
        ...vehicles,
        {
          id: Date.now().toString(),
          type: currentVehicle.type,
          number: currentVehicle.number,
        },
      ]);
      setCurrentVehicle({ type: '', number: '' });
    }
  };

  const removeVehicle = (id: string) => {
    setVehicles(vehicles.filter((v) => v.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await updateCustomerProfile({
        full_name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        vehicles: vehicles.map((v) => ({ type: v.type, number: v.number })),
      });
      clearSignupProfilePending();
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setLoading(false);
    }
  };

  if (!hasCustomerSession) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-8"
        >
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Link
                to="/home"
                className="rounded-lg p-2 -ml-2 text-gray-600 transition hover:bg-gray-100 hover:text-[#4F46E5]"
                aria-label="Back to home"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-semibold text-gray-900">
                {session?.profileCompleted ? 'Your profile' : 'Complete your profile'}
              </h1>
            </div>
            <p className="text-gray-500">
              {session?.profileCompleted
                ? 'Update your details, phone, or vehicles anytime.'
                : 'Add your details so we can complete your bookings.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Email is tied to your account and cannot be changed here.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone number *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St, City, State 12345"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#4F46E5]">
                    <MapPin className="w-5 h-5" />
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Vehicle information</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle type</label>
                  <select
                    value={currentVehicle.type}
                    onChange={(e) => setCurrentVehicle({ ...currentVehicle, type: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all"
                  >
                    <option value="">Select type</option>
                    <option value="Hatch">Hatch</option>
                    <option value="Sedan">Sedan</option>
                    <option value="SUV/4WD">SUV/4WD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle number</label>
                  <input
                    type="text"
                    value={currentVehicle.number}
                    onChange={(e) => setCurrentVehicle({ ...currentVehicle, number: e.target.value })}
                    placeholder="ABC 1234"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={addVehicle}
                className="flex items-center gap-2 text-[#4F46E5] font-medium hover:text-[#4338CA] transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add vehicle
              </button>

              {vehicles.length > 0 && (
                <div className="space-y-2 mt-4">
                  {vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{vehicle.type}</p>
                        <p className="text-sm text-gray-500">{vehicle.number}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVehicle(vehicle.id)}
                        className="text-indigo-500 hover:text-indigo-700 transition-colors"
                        aria-label="Remove vehicle"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            ) : null}

            <button
              type="submit"
              disabled={loading || !hydrated}
              className="w-full bg-[#4F46E5] text-white py-3.5 rounded-lg font-medium hover:bg-[#4338CA] transition-colors shadow-sm mt-8 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving…' : session?.profileCompleted ? 'Save changes' : 'Save & continue'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

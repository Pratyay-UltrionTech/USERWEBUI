import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Building2, Car } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { apiCustomerServiceHistory, type CustomerServiceHistoryItem } from '../lib/userApi';

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === 'completed') return 'bg-emerald-100 text-emerald-800';
  if (s === 'cancelled' || s === 'canceled') return 'bg-gray-200 text-gray-700';
  if (s === 'in_progress' || s === 'in progress') return 'bg-amber-100 text-amber-900';
  return 'bg-indigo-100 text-indigo-800';
}

export function ServiceHistoryPage() {
  const navigate = useNavigate();
  const { hasCustomerSession, session } = useAuth();
  const [items, setItems] = useState<CustomerServiceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasCustomerSession || !session?.accessToken) {
      navigate('/', { replace: true });
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    void (async () => {
      try {
        const res = await apiCustomerServiceHistory(session.accessToken);
        if (!cancelled) setItems(res.items);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load history.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasCustomerSession, session?.accessToken, navigate]);

  if (!hasCustomerSession) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <Link
            to="/home"
            className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 hover:text-[#4F46E5]"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Service history</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {loading ? (
          <p className="text-center text-sm text-gray-500">Loading your bookings…</p>
        ) : error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm"
          >
            <p className="text-gray-700">
              No bookings found for your profile phone yet. Complete a wash or add your phone on{' '}
              <Link to="/profile-setup" className="font-medium text-[#4F46E5] underline">
                Profile
              </Link>{' '}
              so we can match your history.
            </p>
          </motion.div>
        ) : (
          <ul className="space-y-3">
            {items.map((row, i) => (
              <motion.li
                key={`${row.channel}-${row.id}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        row.channel === 'mobile' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-[#4F46E5]'
                      }`}
                    >
                      {row.channel === 'mobile' ? <Car className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{row.location_label}</p>
                      <p className="text-sm text-gray-500">
                        {row.slot_date} · {row.start_time}–{row.end_time}
                      </p>
                      {row.service_summary ? (
                        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{row.service_summary}</p>
                      ) : row.vehicle_type ? (
                        <p className="mt-1 text-sm text-gray-600">{row.vehicle_type}</p>
                      ) : null}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusBadgeClass(
                      row.status
                    )}`}
                  >
                    {row.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

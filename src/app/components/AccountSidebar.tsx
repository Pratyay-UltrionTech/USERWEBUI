import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { CircleUser, History, LogOut, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AccountSidebar({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { session, signOut } = useAuth();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const goProfile = () => {
    onClose();
    navigate('/profile-setup');
  };

  const goHistory = () => {
    onClose();
    navigate('/service-history');
  };

  const doLogout = () => {
    onClose();
    signOut();
    navigate('/', { replace: true });
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-sidebar-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-sm flex-col border-l border-gray-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
              <div>
                <h2 id="account-sidebar-title" className="text-lg font-semibold text-gray-900">
                  Account
                </h2>
                {session?.email ? (
                  <p className="mt-0.5 truncate text-xs text-gray-500">{session.email}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 p-3">
              <button
                type="button"
                onClick={goProfile}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-800 transition hover:bg-indigo-50 hover:text-[#4F46E5]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-[#4F46E5]">
                  <CircleUser className="h-5 w-5" />
                </span>
                <span className="font-medium">Profile</span>
              </button>
              <button
                type="button"
                onClick={goHistory}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-gray-800 transition hover:bg-indigo-50 hover:text-[#4F46E5]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-[#4F46E5]">
                  <History className="h-5 w-5" />
                </span>
                <span className="font-medium">Service history</span>
              </button>
            </nav>

            <div className="border-t border-gray-100 p-3">
              <button
                type="button"
                onClick={doLogout}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-red-700 transition hover:bg-red-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
                  <LogOut className="h-5 w-5" />
                </span>
                Logout
              </button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

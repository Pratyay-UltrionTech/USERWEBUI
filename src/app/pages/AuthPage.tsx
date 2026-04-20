import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { clearSignupProfilePending, setSignupProfilePending } from '../lib/signupProfileGate';

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { customerLogin, customerRegister, signOut } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('signup') === '1') {
      setIsLogin(false);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        clearSignupProfilePending();
        const { profileCompleted } = await customerLogin(email.trim(), password);
        if (profileCompleted) {
          navigate('/home', { replace: true });
        } else {
          navigate('/profile-setup', { replace: true });
        }
      } else {
        if (password.length < 8) {
          setError('Password must be at least 8 characters.');
          setLoading(false);
          return;
        }
        await customerRegister(email.trim(), password);
        setSignupProfilePending();
        navigate('/profile-setup', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = () => {
    clearSignupProfilePending();
    signOut();
    navigate('/home');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#4F46E5] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-gray-500">
              {isLogin ? 'Sign in with your email to continue' : 'Sign up with your email to get started'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all"
                required
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? '••••••••' : 'At least 8 characters'}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all"
                required
                minLength={isLogin ? 1 : 8}
              />
              {isLogin && (
                <div className="flex justify-end mt-1 px-0.5">
                  <button
                    type="button"
                    onClick={() => alert('Please contact our support team at support@carwash.com to reset your password.')}
                    className="text-[12px] font-medium text-gray-500 hover:text-[#4F46E5] transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4F46E5] text-white py-3.5 rounded-lg font-medium hover:bg-[#4338CA] transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          {isLogin && (
            <button
              type="button"
              onClick={handleGuestContinue}
              className="w-full py-3 rounded-lg font-medium border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors mb-6"
            >
              Continue as Guest
            </button>
          )}

          <p className="text-center text-sm text-gray-600">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-[#4F46E5] font-medium hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

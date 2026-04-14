import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Terminal, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map(e => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  return String(detail);
}

export default function AuthPage() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4" data-testid="auth-page">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
            <Terminal size={22} className="text-white" />
          </div>
          <span className="text-2xl font-semibold tracking-tight text-zinc-100">Axon</span>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-md p-8">
          <h2 className="text-xl font-semibold text-zinc-100 mb-1" data-testid="auth-title">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-sm text-zinc-500 mb-6">
            {isLogin ? 'Sign in to your workspace' : 'Set up your development workspace'}
          </p>

          {error && (
            <div className="bg-red-900/20 border border-red-800/40 rounded-md px-4 py-3 mb-4 text-sm text-red-400" data-testid="auth-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-widest">Name</label>
                <input
                  data-testid="auth-name-input"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-bg border border-border rounded-md px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  placeholder="Your name"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-widest">Email</label>
              <input
                data-testid="auth-email-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-bg border border-border rounded-md px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                placeholder="you@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-widest">Password</label>
              <div className="relative">
                <input
                  data-testid="auth-password-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-bg border border-border rounded-md px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary transition-all pr-10"
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              data-testid="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2.5 rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-zinc-500">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button
            data-testid="auth-toggle-btn"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-primary hover:underline"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

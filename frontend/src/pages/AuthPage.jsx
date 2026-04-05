import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode]   = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [pass, setPass]   = useState('');
  const [error, setError] = useState('');
  const [info, setInfo]   = useState('');
  const [busy, setBusy]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setInfo('');
    if (!email || !pass) { setError('Email and password are required'); return; }
    setBusy(true);
    try {
      if (mode === 'login') {
        await signIn(email, pass);
      } else {
        await signUp(email, pass);
        setInfo('Check your inbox to confirm your email, then log in.');
        setMode('login');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      {/* Brand */}
      <div className="mb-10 text-center animate-fade-in">
        <div className="text-6xl mb-3">🔥</div>
        <h1 className="text-5xl font-extrabold text-white tracking-tight">Binder</h1>
        <p className="text-slate-400 mt-2 text-lg">Find your spark — free, always.</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm animate-slide-up">
        <div className="card shadow-2xl">
          <h2 className="text-2xl font-bold mb-6 text-white">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/40 text-red-300 rounded-xl text-sm">
              {error}
            </div>
          )}
          {info && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/40 text-green-300 rounded-xl text-sm">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            <button type="submit" disabled={busy} className="btn-primary w-full mt-2">
              {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-400 text-sm">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setInfo(''); }}
              className="text-flame font-semibold hover:underline"
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

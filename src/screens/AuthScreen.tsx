import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Mail, Lock, User as UserIcon, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type Mode = 'login' | 'register' | 'reset';

export function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initialMode = (location.state as { mode?: Mode } | null)?.mode === 'register' ? 'register' : 'login';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) setError(error);
        else navigate('/');
      } else if (mode === 'register') {
        const { error } = await signUp(email, password, name);
        if (error) setError(error);
        else setInfo('Account created. Check your email or sign in if confirmation is off.');
      } else {
        const { error } = await resetPassword(email);
        if (error) setError(error);
        else setInfo('If that email exists, a reset link has been sent.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8 animate-fade-up">
          <div className="relative mb-4">
            <div className="absolute inset-0 gradient-mint rounded-2xl blur-xl opacity-50 animate-pulse-ring" />
            <div className="relative w-16 h-16 rounded-2xl gradient-mint flex items-center justify-center shadow-glow">
              <Sparkles className="w-8 h-8 text-ink-950" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">Spendora</h1>
          <p className="text-sm text-slate-400 mt-1">Your AI finance buddy for campus life</p>
        </div>

        {/* Card */}
        <div className="card glow-ring p-7 animate-fade-up" style={{ animationDelay: '60ms' }}>
          <h2 className="font-display text-xl font-semibold text-white mb-1">
            {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create your account' : 'Reset password'}
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            {mode === 'login'
              ? 'Sign in to see your spending and budgets'
              : mode === 'register'
                ? 'Start tracking your money in seconds'
                : "We'll email you a reset link"}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <Field icon={<UserIcon className="w-4 h-4" />}>
                <input
                  className="input-field pl-11"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Field>
            )}
            <Field icon={<Mail className="w-4 h-4" />}>
              <input
                type="email"
                className="input-field pl-11"
                placeholder="you@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            {mode !== 'reset' && (
              <Field icon={<Lock className="w-4 h-4" />}>
                <input
                  type="password"
                  className="input-field pl-11"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </Field>
            )}

            {error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-2.5 text-sm text-rose-300 animate-fade-in">
                {error}
              </div>
            )}
            {info && (
              <div className="rounded-xl bg-mint-500/10 border border-mint-500/30 px-4 py-2.5 text-sm text-mint-300 animate-fade-in">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-press w-full gradient-mint text-ink-950 font-semibold rounded-2xl py-3 flex items-center justify-center gap-2 shadow-glow disabled:opacity-60"
            >
              {busy ? 'Please wait…' : (
                <>
                  {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Send reset link'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Mode switch */}
          <div className="mt-6 flex flex-col gap-2 text-sm text-center">
            {mode === 'login' && (
              <>
                <button onClick={() => setMode('register')} className="text-slate-400 hover:text-mint-300 transition btn-press">
                  New here? Create an account
                </button>
                <button onClick={() => setMode('reset')} className="text-slate-500 hover:text-slate-300 transition btn-press">
                  Forgot password?
                </button>
              </>
            )}
            {mode === 'register' && (
              <button onClick={() => setMode('login')} className="text-slate-400 hover:text-mint-300 transition btn-press flex items-center justify-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Already have an account? Sign in
              </button>
            )}
            {mode === 'reset' && (
              <button onClick={() => setMode('login')} className="text-slate-400 hover:text-mint-300 transition btn-press flex items-center justify-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Your expenses, budgets & chats stay private to your account.
        </p>
      </div>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span>
      {children}
    </div>
  );
}

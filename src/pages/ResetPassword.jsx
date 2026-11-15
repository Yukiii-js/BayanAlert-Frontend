import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { BrandLogo } from '../components/BrandLogo';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(() => (
    token ? '' : 'This password reset link is missing its token.'
  ));
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('This password reset link is missing its token.');
      return;
    }
    if (password.length < 8) {
      setError('Your password must contain at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.resetPassword({
        token,
        password,
        confirm_password: confirmPassword,
      });
      setSuccess(response?.message || 'Your password has been reset. You can now sign in.');
      setPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      setError(requestError.message || 'This password reset link is invalid or expired.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-100">
      <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      <section className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
            <BrandLogo className="h-16 w-16" />
          </div>
          <h1 className="text-2xl font-bold text-white">Reset your password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Choose a new password for your verified BayanAlert account.
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-sm text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-sm text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {token && !success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-password" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                New password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="reset-confirm-password" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Confirm new password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  id="reset-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {isSubmitting ? 'Saving password...' : 'Save new password'}
            </button>
          </form>
        )}

        <Link
          to="/resident-login"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-emerald-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </section>
    </main>
  );
}

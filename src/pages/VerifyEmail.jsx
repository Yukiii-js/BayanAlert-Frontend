import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, MailCheck } from 'lucide-react';
import { api } from '../api/client';
import { BrandLogo } from '../components/BrandLogo';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const requestStarted = useRef(false);
  const [state, setState] = useState({
    loading: true,
    success: false,
    message: '',
    accountStatus: '',
  });

  useEffect(() => {
    if (requestStarted.current) return;
    requestStarted.current = true;

    if (!token) {
      setState({
        loading: false,
        success: false,
        message: 'This email verification link is missing its token.',
      });
      return;
    }

    api.verifyEmail(token)
      .then((response) => {
        setState({
          loading: false,
          success: true,
          message: response?.message || 'Your email address has been verified.',
          accountStatus: response?.data?.account_status || response?.account_status || '',
        });
        const verifiedEmail = response?.data?.email || '';
        const query = new URLSearchParams({ email_verification: 'verified' });
        if (verifiedEmail) query.set('email', verifiedEmail);
        navigate(`/register?${query.toString()}`, { replace: true });
      })
      .catch((error) => {
        setState({
          loading: false,
          success: false,
          message: error.message || 'This email verification link is invalid or expired.',
        });
        navigate('/register?email_verification=failed', { replace: true });
      });
  }, [navigate, token]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-100">
      <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      <section className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/95 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center">
          <BrandLogo className="h-16 w-16" />
        </div>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
          {state.loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
          ) : state.success ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          ) : (
            <AlertCircle className="h-6 w-6 text-rose-400" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-white">Email verification</h1>
        <p role="status" className="mt-3 text-sm leading-6 text-slate-300">
          {state.loading ? 'Verifying your email address...' : state.message}
        </p>
        {!state.loading && state.success && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
            <MailCheck className="h-4 w-4 text-emerald-400" />
            Returning to your registration form...
          </div>
        )}
        {!state.loading && !state.success && (
          <p className="mt-4 text-xs text-slate-400">Returning to your registration form...</p>
        )}
      </section>
    </main>
  );
}

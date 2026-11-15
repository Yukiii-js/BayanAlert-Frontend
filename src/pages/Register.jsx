
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  MapPin,
  MapPinned,
  Home,
  AlertCircle,
  Loader2,
  UserPlus,
  CheckCircle2,
  ArrowLeft,
  Send,
} from 'lucide-react';
import { api } from '../api/client';
import { BrandLogo } from '../components/BrandLogo';

const REGISTRATION_DRAFT_KEY = 'bayanalert_registration_draft';
const EMPTY_FORM = {
  full_name: '',
  email: '',
  username: '',
  password: '',
  confirm_password: '',
  barangay_id: '',
  address_details: '',
};

function readRegistrationDraft() {
  try {
    const rawDraft = sessionStorage.getItem(REGISTRATION_DRAFT_KEY);
    if (!rawDraft) return EMPTY_FORM;

    const draft = JSON.parse(rawDraft);
    if (!draft?.form || Date.now() - draft.savedAt > 30 * 60 * 1000) {
      sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
      return EMPTY_FORM;
    }

    return { ...EMPTY_FORM, ...draft.form };
  } catch {
    sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
    return EMPTY_FORM;
  }
}

export function Register() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState(readRegistrationDraft);

  const [barangays, setBarangays] = useState([]);
  const [loadingBarangays, setLoadingBarangays] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [isSendingVerification, setIsSendingVerification] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const result = params.get('email_verification');
      if (result === 'verified') {
        const verifiedEmail = params.get('email');
        if (verifiedEmail && !form.email.trim()) {
          setForm((previous) => ({ ...previous, email: verifiedEmail }));
        }
        setVerificationStatus('verified');
        setVerificationEmail((verifiedEmail || form.email).trim().toLowerCase());
        setVerificationMessage('Email verified successfully. You can continue creating your account.');
      } else if (result === 'failed') {
        setVerificationStatus('failed');
        setVerificationEmail(form.email.trim().toLowerCase());
        setVerificationMessage('Email verification failed. The link may be invalid or expired. Request a new one and try again.');
      }

      if (result) {
        navigate('/register', { replace: true });
      }
    } catch (storageError) {
      console.error('Could not restore email verification status.', storageError);
    }
  }, [form.email, location.search, navigate]);

  useEffect(() => {
    try {
      if (Object.values(form).some(Boolean)) {
        sessionStorage.setItem(
          REGISTRATION_DRAFT_KEY,
          JSON.stringify({ form, savedAt: Date.now() })
        );
      } else {
        sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
      }
    } catch (storageError) {
      console.error('Could not save the temporary registration draft.', storageError);
    }
  }, [form]);

  useEffect(() => {
    let mounted = true;

    async function loadBarangays() {
      try {
        const response = await api.getBarangays();

        if (mounted) {
          const list = response?.data?.barangays
            || response?.barangays
            || response?.data
            || [];

          setBarangays(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err.message || 'Unable to load barangays. Please try again.'
          );
        }
      } finally {
        if (mounted) {
          setLoadingBarangays(false);
        }
      }
    }

    loadBarangays();

    return () => {
      mounted = false;
    };
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;

    if (name === 'email') {
      setVerificationMessage('');
      setVerificationEmail('');
      setVerificationStatus('');
    }

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleVerifyEmail() {
    const email = form.email.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address before requesting verification.');
      return;
    }

    setError('');
    setIsSendingVerification(true);
    setVerificationMessage('');
    setVerificationEmail('');
    setVerificationStatus('');
    try {
      sessionStorage.setItem(
        REGISTRATION_DRAFT_KEY,
        JSON.stringify({ form, savedAt: Date.now() })
      );
    } catch (storageError) {
      console.error('Could not save the temporary registration draft.', storageError);
    }
    try {
      const response = await api.sendRegistrationVerification(email);
      setVerificationEmail(email);
      setVerificationStatus('pending');
      setVerificationMessage(
        response?.message || 'Verification link sent. Open it from your inbox.'
      );
    } catch (err) {
      setVerificationStatus('failed');
      setVerificationEmail(email);
      setVerificationMessage(err.message || 'Could not send a verification link.');
    } finally {
      setIsSendingVerification(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.register({
        ...form,
        barangay_id: Number(form.barangay_id),
      });

      setSubmittedEmail(form.email.trim());
      setResendMessage('');
      setSuccess(
        response?.message ||
        'Registration successful. Check your email to verify your address.'
      );

      setForm(EMPTY_FORM);
      setVerificationMessage('');
      setVerificationEmail('');
      setVerificationStatus('');
      sessionStorage.removeItem(REGISTRATION_DRAFT_KEY);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendVerification() {
    if (!submittedEmail) return;

    setIsResending(true);
    setResendMessage('');
    try {
      const response = await api.resendVerificationEmail(submittedEmail);
      setResendMessage(response?.message || 'If eligible, a verification email has been sent.');
    } catch (err) {
      setResendMessage(err.message || 'Unable to send a verification email right now.');
    } finally {
      setIsResending(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-700 bg-slate-800/80 py-3 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500';

  const labelClass =
    'mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400';

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-100">
      <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-2xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Homepage
        </Link>

        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
            <BrandLogo className="h-16 w-16" />
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Join <span className="text-emerald-400">BayanAlert</span>
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Create your resident account to report community hazards.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl sm:p-8">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Registration submitted</p>
                <p className="mt-1">{success}</p>
                <p className="mt-2 text-xs text-slate-400">
                  Verify your email first. You can sign in after an administrator activates your account.
                </p>
                {submittedEmail && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={isResending}
                      className="text-xs font-semibold text-emerald-300 underline decoration-emerald-500/50 underline-offset-4 hover:text-emerald-200 disabled:opacity-60"
                    >
                      {isResending ? 'Sending...' : 'Resend verification email'}
                    </button>
                    {resendMessage && <p className="mt-2 text-xs text-slate-300">{resendMessage}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="full_name" className={labelClass}>
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={150}
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email Address *
                </label>
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={150}
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyEmail}
                    disabled={isSendingVerification || !form.email.trim() || (
                      verificationStatus === 'verified'
                      && verificationEmail === form.email.trim().toLowerCase()
                    )}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
                  >
                    {verificationStatus === 'verified'
                      && verificationEmail === form.email.trim().toLowerCase()
                      ? <CheckCircle2 className="h-4 w-4" />
                      : isSendingVerification
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Send className="h-4 w-4" />}
                    <span>
                      {verificationStatus === 'verified'
                        && verificationEmail === form.email.trim().toLowerCase()
                        ? 'Verified'
                        : isSendingVerification ? 'Sending' : 'Verify'}
                    </span>
                  </button>
                </div>
                {verificationMessage && (
                  <p
                    role="status"
                    className={`mt-2 text-xs ${
                      verificationEmail !== form.email.trim().toLowerCase()
                        ? 'text-slate-400'
                        : verificationStatus === 'verified'
                          ? 'text-emerald-300'
                          : verificationStatus === 'failed'
                            ? 'text-rose-300'
                            : 'text-amber-300'
                    }`}
                  >
                    {verificationStatus === 'verified' ? 'Verified: ' : ''}
                    {verificationStatus === 'failed' ? 'Not verified: ' : ''}
                    {verificationMessage}
                  </p>
                )}
                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  You may create your account before verifying, but email verification is required to sign in.
                </p>
              </div>

              <div>
                <label htmlFor="username" className={labelClass}>
                  Username *
                </label>
                <div className="relative">
                  <UserPlus className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    minLength={3}
                    maxLength={100}
                    value={form.username}
                    onChange={handleChange}
                    placeholder="Choose a username"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="password" className={labelClass}>
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="At least 8 characters"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm_password" className={labelClass}>
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={form.confirm_password}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="barangay_id" className={labelClass}>
                Barangay *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <select
                  id="barangay_id"
                  name="barangay_id"
                  required
                  value={form.barangay_id}
                  onChange={handleChange}
                  disabled={loadingBarangays}
                  className={`${inputClass} appearance-none disabled:cursor-wait disabled:opacity-60`}
                >
                  <option value="" className="bg-slate-900">
                    {loadingBarangays
                      ? 'Loading barangays...'
                      : 'Select your barangay'}
                  </option>

                  {barangays.map((barangay) => (
                    <option
                      key={barangay.barangay_id}
                      value={barangay.barangay_id}
                      className="bg-slate-900"
                    >
                      {barangay.barangay_name}
                    </option>
                  ))}
                </select>
              </div>

              {!loadingBarangays && barangays.length === 0 && (
                <p className="mt-2 text-xs text-amber-400">
                  No barangays are available. Check your barangays table and API.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="address_details" className={labelClass}>
                Address Details <span className="normal-case">(Optional)</span>
              </label>
              <div className="relative">
                <Home className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                <input
                  id="address_details"
                  name="address_details"
                  type="text"
                  autoComplete="street-address"
                  maxLength={255}
                  value={form.address_details}
                  onChange={handleChange}
                  placeholder="House number, street, or sitio"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4">
              <div className="flex items-start gap-3">
                <MapPinned className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Account Approval
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Your account will be marked as pending until it is
                    activated according to the system's approval process.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || loadingBarangays || barangays.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create Resident Account
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-5 text-center">
            <p className="text-sm text-slate-400">
              Already have an account?{' '}
              <Link
                to="/resident-login"
                className="font-semibold text-emerald-400 hover:text-emerald-300"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          BayanAlert · Community hazard reporting and verification
        </p>
      </div>
    </div>
  );
}


import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  MapPin,
  Map,
  FileWarning,
  Bell,
  User,
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Menu,
  X,
  CloudRain,
  Eye,
  Users,
  Search,
  CheckCircle2,
  LockKeyhole,
} from 'lucide-react';
import { HazardMap } from '../components/HazardMap';

export function GuestHome() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[76px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">

          <Link to="/" className="flex shrink-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>

            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-white">
                Bayan<span className="text-emerald-400">Alert</span>
              </h1>
              <p className="text-[10px] text-slate-400 sm:text-xs">
                Real-Time Alerts for Safer Communities
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <a
              href="#home"
              className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-400"
            >
              <Map className="h-4 w-4" />
              Home
            </a>

            <a
              href="#hazard-map"
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <MapPin className="h-4 w-4" />
              Hazard Map
            </a>

            <a
              href="#community"
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <FileWarning className="h-4 w-4" />
              Community
            </a>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Link
              to="/resident-login"
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-emerald-500 hover:text-emerald-400"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-400"
            >
              Get Started
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 sm:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-800 bg-slate-900 p-4 sm:hidden">
            <div className="flex flex-col gap-2">
              <a
                href="#home"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800"
              >
                Home
              </a>

              <a
                href="#hazard-map"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800"
              >
                Hazard Map
              </a>

              <a
                href="#community"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800"
              >
                Community
              </a>

              <Link
                to="/login"
                className="rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="rounded-lg bg-emerald-500 px-4 py-3 text-center text-sm font-bold text-slate-950"
              >
                Create Account
              </Link>
            </div>
          </div>
        )}
      </header>

      <main id="home" className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />

          <div className="relative grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1.4fr_0.6fr] lg:p-12">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                COMMUNITY SAFETY PLATFORM
              </div>

              <h2 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                Stay informed.
                <br />
                Stay <span className="text-emerald-400">safe.</span>
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
                BayanAlert helps communities identify, report, and monitor
                potential hazards. Stay aware of local incidents and help
                make your community safer.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:-translate-y-0.5 hover:bg-emerald-400"
                >
                  Join the Community
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <a
                  href="#hazard-map"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/60 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-500/50 hover:bg-slate-800"
                >
                  <Map className="h-4 w-4 text-emerald-400" />
                  Explore Hazard Map
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Community reporting
                </span>

                <span className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-emerald-400" />
                  Report verification
                </span>
              </div>
            </div>

            <div className="relative mx-auto flex h-52 w-full max-w-sm items-center justify-center lg:h-64">
              <div className="absolute h-52 w-52 rounded-full border border-emerald-500/10 sm:h-60 sm:w-60" />
              <div className="absolute h-40 w-40 rounded-full border border-emerald-500/20 sm:h-48 sm:w-48" />
              <div className="absolute h-28 w-28 rounded-full bg-emerald-500/10 blur-xl" />

              <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 to-teal-500/5 shadow-2xl shadow-emerald-500/10">
                <ShieldCheck className="h-16 w-16 text-emerald-400" />
              </div>

              <div className="absolute right-5 top-8 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Stay Aware</p>
                  <p className="text-[10px] text-slate-400">Community safety</p>
                </div>
              </div>

              <div className="absolute bottom-5 left-0 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-xl">
                <div className="rounded-lg bg-amber-500/10 p-2">
                  <Bell className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Report Hazards</p>
                  <p className="text-[10px] text-slate-400">Help your community</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Information Cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-emerald-500/40">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
              <MapPin className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-xs font-medium text-slate-400">Coverage Area</p>
            <h3 className="mt-1 text-lg font-bold text-white">Calapan City</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Local community hazard monitoring
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-emerald-500/40">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-xs font-medium text-slate-400">Community</p>
            <h3 className="mt-1 text-lg font-bold text-white">Work Together</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Help identify potential hazards in your area
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-emerald-500/40">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-xs font-medium text-slate-400">Report Updates</p>
            <h3 className="mt-1 text-lg font-bold text-white">Track Progress</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Follow the status of your own submissions
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition hover:border-emerald-500/40">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10">
              <ShieldCheck className="h-5 w-5 text-rose-400" />
            </div>
            <p className="text-xs font-medium text-slate-400">Verification</p>
            <h3 className="mt-1 text-lg font-bold text-white">Trusted Reports</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Reports can be reviewed by authorized personnel
            </p>
          </div>
        </section>

        {/* Map and Sidebar */}
        <section className="grid items-start gap-6 xl:grid-cols-[1.7fr_0.8fr]">

          <HazardMap id="hazard-map" height="h-[430px]" />

          {/* Right Sidebar */}
          <aside className="space-y-5">

            {/* Emergency Card */}
            <div className="rounded-2xl border border-rose-500/20 bg-slate-900 p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/10">
                  <AlertTriangle className="h-6 w-6 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Encountered a Hazard?</h3>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Help protect your community
                  </p>
                </div>
              </div>

              <p className="mb-5 text-xs leading-6 text-slate-400">
                Report flooding, fires, road hazards, and other potentially
                dangerous situations in your area.
              </p>

              <Link
                to="/login"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-rose-500"
              >
                <FileWarning className="h-4 w-4" />
                Submit a Hazard Report
              </Link>

              <p className="mt-3 text-center text-[10px] text-slate-500">
                Login or register to continue.
              </p>
            </div>

            {/* Community Updates */}
            <div id="community" className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Bell className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Community Updates</h3>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Stay aware of local hazards
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-4 py-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-200">
                  Stay informed
                </p>
                <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-slate-500">
                  Mapped hazard reports are loaded from the BayanAlert database.
                </p>
              </div>

              <Link
                to="/login"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-xs font-semibold text-slate-200 transition hover:border-emerald-500/50 hover:text-emerald-400"
              >
                Access Your Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* How it works */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="mb-5 font-bold text-white">
                How BayanAlert Works
              </h3>

              <div className="space-y-5">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-sm font-bold text-emerald-400">
                    01
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Create an Account
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Register to access resident reporting features.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-sm font-bold text-blue-400">
                    02
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Submit a Report
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Provide hazard details and supporting information.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-sm font-bold text-amber-400">
                    03
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Track Verification
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Check updates as authorized personnel review reports.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </section>

        {/* Call to Action */}
        <section className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/70 to-slate-900 p-6 sm:p-8">
          <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <div className="mb-3 flex items-center gap-2 text-emerald-400">
                <LockKeyhole className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">
                  Join BayanAlert
                </span>
              </div>

              <h2 className="text-xl font-extrabold text-white sm:text-2xl">
                Be part of a safer community.
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Create your account to submit hazard reports and track
                your submissions.
              </p>
            </div>

            <Link
              to="/register"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
            >
              Register Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col gap-4 border-t border-slate-800 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-emerald-400" />
            <span>
              © {new Date().getFullYear()} BayanAlert. Community safety matters.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <a href="#home" className="transition hover:text-emerald-400">
              Back to top
            </a>
            <Link to="/login" className="transition hover:text-emerald-400">
              Staff Login
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}

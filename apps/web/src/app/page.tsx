'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Car, QrCode, ShieldCheck, Building2, CheckCircle2, Clock, ArrowRight, Sparkles, KeyRound } from 'lucide-react';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'RESIDENT') router.push('/resident');
      else if (user.role === 'GUARD') router.push('/guard');
      else if (user.role === 'ADMIN') router.push('/admin');
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-4 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Gated Community Visitor Parking Solution</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            ParkPass
          </h1>
          <p className="text-xl text-slate-600 font-medium mb-2">
            Visitor Parking. Simplified.
          </p>
          <p className="text-sm text-slate-500 max-w-xl mx-auto mb-6">
            Time-bound visitor parking reservations, instant QR pass generation, and smartphone gate verification for Indian residential societies.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register-society"
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/25 flex items-center gap-2 group active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Register Your Society</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/register"
              className="py-3 px-6 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 font-bold text-xs transition-colors flex items-center gap-2 shadow-xs active:scale-95"
            >
              <KeyRound className="w-4 h-4 text-slate-400" />
              <span>Join with Society Code</span>
            </Link>
          </div>
        </div>

        {/* 3 Role Access Portals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Resident Portal */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <Car className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Resident Portal</h2>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Reserve parking for your guests, allocate verified parking slots, generate secure QR passes, and share via WhatsApp in seconds.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Real-time slot availability check</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Instant QR pass & WhatsApp sharing</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Live arrival & departure alerts</span>
                </li>
              </ul>
            </div>
            <Link
              href="/resident"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>Access Resident Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Guard Terminal */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                <QrCode className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Security Guard Terminal</h2>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Designed for ordinary mobile phones and tablets at society gates. Scan QR passes, verify plates, register walk-ins, and record checkout.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Live camera QR scanner + manual fallback</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>One-tap entry confirmation & checkout</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Active parked vehicle monitoring</span>
                </li>
              </ul>
            </div>
            <Link
              href="/guard"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>Access Guard Terminal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Admin Dashboard */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Society Admin</h2>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Full society governance. Interactive visual parking grid, complete visitor audit trail, slot conflict resolution, and CSV exports.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>Visual 20-slot interactive map</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>Overstay detection & force overrides</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>Full historical logs & CSV download</span>
                </li>
              </ul>
            </div>
            <Link
              href="/admin"
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>Access Admin Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        ParkPass — Smart Visitor Parking & Automated Gate Clearance System
      </footer>
    </div>
  );
}

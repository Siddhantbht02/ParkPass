'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Car, QrCode, ShieldCheck, Building2, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const { user, isLoading, quickLogin } = useAuth();
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
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Time-bound visitor parking reservations, instant QR pass generation, and smartphone gate verification for Indian residential societies.
          </p>
        </div>

        {/* 3 Role Quick Access Portals */}
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
            <button
              onClick={() => quickLogin('+919876543210')}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>Enter as Resident (Siddhant)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
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
            <button
              onClick={() => quickLogin('+919876543220')}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>Enter Guard Terminal (Main Gate)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
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
            <button
              onClick={() => quickLogin('+919876543200')}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>Enter Admin Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Demo Credentials Box */}
        <div className="mt-12 bg-white rounded-xl p-5 border border-slate-200 max-w-2xl mx-auto shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Demo Environment Accounts</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <div className="font-semibold text-slate-800">Resident</div>
              <div className="text-slate-500 font-mono text-[11px]">+919876543210</div>
              <div className="text-slate-400 text-[10px]">password123</div>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <div className="font-semibold text-slate-800">Security Guard</div>
              <div className="text-slate-500 font-mono text-[11px]">+919876543220</div>
              <div className="text-slate-400 text-[10px]">password123</div>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <div className="font-semibold text-slate-800">Admin Secretary</div>
              <div className="text-slate-500 font-mono text-[11px]">+919876543200</div>
              <div className="text-slate-400 text-[10px]">adminpassword123</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        ParkPass MVP • Skyline Residency, Powai, Mumbai • Production-Oriented Visitor Parking Management
      </footer>
    </div>
  );
}

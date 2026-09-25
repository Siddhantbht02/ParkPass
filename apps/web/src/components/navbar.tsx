'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ShieldCheck, Car, LogOut, User, Building2, Bell } from 'lucide-react';

export function Navbar() {
  const { user, logout, quickLogin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Hide on public pass viewing page
  if (pathname.startsWith('/pass/')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      {/* Top Demo Bar */}
      <div className="bg-slate-900 text-slate-200 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[11px]">⚡ Demo One-Click Role Switcher:</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => quickLogin('+919876543210')}
            className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              user?.phone === '+919876543210'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Resident: Siddhant (A-804)
          </button>
          <button
            onClick={() => quickLogin('+919876543211')}
            className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              user?.phone === '+919876543211'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Resident: Aarav (A-805)
          </button>
          <button
            onClick={() => quickLogin('+919876543220')}
            className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              user?.phone === '+919876543220'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Guard: Main Gate
          </button>
          <button
            onClick={() => quickLogin('+919876543200')}
            className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              user?.phone === '+919876543200'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Admin: Secretary
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30 group-hover:bg-blue-700 transition-colors">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-slate-900 tracking-tight">ParkPass</span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                  Society
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                Visitor Parking. Simplified.
              </p>
            </div>
          </Link>

          {/* Society Badge */}
          {user && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold">{user.societyName}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">Powai, Mumbai</span>
            </div>
          )}
        </div>

        {/* Right Navigation */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Role-specific Nav Links */}
              <div className="hidden sm:flex items-center gap-1">
                {user.role === 'RESIDENT' && (
                  <Link
                    href="/resident"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      pathname === '/resident'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Resident Portal
                  </Link>
                )}
                {user.role === 'GUARD' && (
                  <Link
                    href="/guard"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      pathname === '/guard'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Guard Terminal
                  </Link>
                )}
                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      pathname === '/admin'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Admin Dashboard
                  </Link>
                )}
              </div>

              {/* User Chip */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900 leading-tight">
                    {user.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {user.flatNumber ? `${user.towerName || 'Tower'} Flat ${user.flatNumber}` : user.role}
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    user.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-700'
                      : user.role === 'GUARD'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {user.role}
                </span>

                <button
                  onClick={logout}
                  title="Logout"
                  className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/register"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <span>Join Society</span>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

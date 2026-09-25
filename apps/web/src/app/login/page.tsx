'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Car, Lock, Phone, ArrowRight, ShieldCheck, AlertCircle, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await login(identifier, password);
      if (user.role === 'RESIDENT') router.push('/resident');
      else if (user.role === 'GUARD') router.push('/guard');
      else if (user.role === 'ADMIN') router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-3 shadow-sm shadow-emerald-500/20">
              <Car className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Sign in to ParkPass</h1>
            <p className="text-xs text-slate-500 mt-1">Resident, Security Guard & Society Admin Portal</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mobile Number or Email
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter registered mobile or email"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>New resident or guard?</span>
                <Link
                  href="/register"
                  className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Join with Society Code</span>
                </Link>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>RWA / Society Admin?</span>
                <Link
                  href="/register-society"
                  className="font-bold text-blue-700 hover:text-blue-800 hover:underline"
                >
                  Register New Society
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

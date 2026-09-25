'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Car,
  ShieldCheck,
  User,
  Users,
  Phone,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  QrCode,
  Shield,
  Layers,
  MapPin,
  Clock,
  KeyRound,
  ExternalLink,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function RegisterSocietyPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  // Multi-step form: 1 = Society Profile, 2 = Infrastructure & Gates, 3 = Admin Credentials
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Society Info
  const [societyName, setSocietyName] = useState('');
  const [societyAddress, setSocietyAddress] = useState('');
  const [city, setCity] = useState('');
  const [communityType, setCommunityType] = useState('High-Rise Apartment Complex');

  // Step 2: Infrastructure & Gates
  const [carSlotsCount, setCarSlotsCount] = useState(15);
  const [twoWheelerSlotsCount, setTwoWheelerSlotsCount] = useState(5);
  const [gatesCount, setGatesCount] = useState(2);
  const [maxStayHours, setMaxStayHours] = useState('24');

  // Step 3: Admin Account
  const [adminName, setAdminName] = useState('');
  const [adminDesignation, setAdminDesignation] = useState('Society Secretary');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

  // UI & Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredResult, setRegisteredResult] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Auto-generate preview Society Code based on entered name
  const previewSocietyCode = useMemo(() => {
    if (!societyName.trim()) return 'PARK-XXXX';
    const clean = societyName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const prefix = (clean.slice(0, 5) || 'SOCIETY').padEnd(4, 'X');
    return `${prefix}-101`;
  }, [societyName]);

  const handleNextStep = () => {
    setErrorMessage(null);
    if (currentStep === 1) {
      if (!societyName.trim() || societyName.trim().length < 3) {
        setErrorMessage('Please enter a valid Society or Condominium Name (at least 3 characters).');
        return;
      }
      if (!societyAddress.trim() || societyAddress.trim().length < 5) {
        setErrorMessage('Please enter a valid physical address for the society.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setErrorMessage(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (adminPassword.length < 6) {
      setErrorMessage('Admin password must be at least 6 characters.');
      return;
    }

    if (adminPassword !== adminConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    if (!adminPhone.trim() || adminPhone.trim().length < 10) {
      setErrorMessage('Please provide a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullAddress = city.trim()
        ? `${societyAddress.trim()}, ${city.trim()}`
        : societyAddress.trim();

      const response = await fetchApi('/api/v1/auth/society/register', {
        method: 'POST',
        body: JSON.stringify({
          societyName: societyName.trim(),
          societyAddress: fullAddress,
          adminName: adminName.trim(),
          adminPhone: adminPhone.trim(),
          adminEmail: adminEmail.trim() || undefined,
          adminPassword,
        }),
      });

      if (response.token && typeof window !== 'undefined') {
        localStorage.setItem('parkpass_auth_token', response.token);
        await refreshUser();
      }

      setRegisteredResult(response);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to onboard society. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // SUCCESS / ONBOARDED STATE
  if (registeredResult) {
    return (
      <div className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-emerald-500/20 via-blue-500/20 to-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-2xl bg-white/85 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] p-8 sm:p-10 text-center animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Society Successfully Onboarded
          </span>

          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Welcome, {registeredResult.society?.name || societyName}!
          </h1>
          <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
            Your residential gated community has been provisioned on ParkPass Cloud with visitor parking inventory and admin control.
          </p>

          {/* Official Society Code Box */}
          <div className="my-7 p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden text-center border border-indigo-800/40">
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-500/20 rounded-full blur-xl" />
            <div className="relative z-10">
              <span className="text-[11px] font-bold tracking-widest text-indigo-300 uppercase block mb-1">
                Official Society Unique ID Code
              </span>
              <div className="text-4xl sm:text-5xl font-black tracking-wider font-mono text-emerald-400 my-2 drop-shadow-sm">
                {registeredResult.societyCode}
              </div>
              <p className="text-xs text-indigo-200/90 mb-4 max-w-md mx-auto">
                Share this unique code with your <strong>Residents</strong> and <strong>Security Guards</strong>. They will use this code to create accounts, which appear in your admin dashboard for instant 1-click approval.
              </p>

              <button
                type="button"
                onClick={() => copyCode(registeredResult.societyCode)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition-all shadow-md active:scale-95"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Copied Code to Clipboard!' : 'Copy Unique Society Code'}</span>
              </button>
            </div>
          </div>

          {/* Quick Start Next Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left mb-8">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>1. Share Code</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Post the code in your society WhatsApp group or notice board.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>2. Approve Users</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Review resident and guard registrations with 1-click clearance.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                <QrCode className="w-3.5 h-3.5 text-purple-600" />
                <span>3. Live QR Gates</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Guards scan digital tickets with camera scanner instantly.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/admin"
              className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              <span>Launch Admin Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/"
              className="w-full sm:w-auto py-3.5 px-6 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-5rem)] py-8 px-4 sm:px-6 lg:px-8">
      {/* Background ambient liquid glass orbs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-purple-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">
        {/* Top Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 text-blue-700 text-xs font-bold mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>ParkPass Enterprise Onboarding</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Register Your Society & Modernize Visitor Parking
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-xl mx-auto leading-relaxed">
            Get an instant <strong className="text-slate-800">Unique Society ID</strong> to onboard residents, security guards, and automated QR gate passes in less than 2 minutes.
          </p>
        </div>

        {/* Two-Column Grid: Form on Left, Real-Time Digital Society Card on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: STEPPED FORM CARD */}
          <div className="lg:col-span-7 bg-white/90 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.06)] p-6 sm:p-8">
            {/* Step Wizard Bar */}
            <div className="flex items-center justify-between mb-8 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                    currentStep === 1
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : currentStep > 1
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {currentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Society Profile</div>
                  <div className="text-[10px] text-slate-400">Name & Location</div>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-300" />

              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                    currentStep === 2
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : currentStep > 2
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {currentStep > 2 ? <Check className="w-4 h-4" /> : '2'}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Parking & Gates</div>
                  <div className="text-[10px] text-slate-400">Inventory Setup</div>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-300" />

              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                    currentStep === 3
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  3
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">RWA Admin</div>
                  <div className="text-[10px] text-slate-400">Master Credentials</div>
                </div>
              </div>
            </div>

            {/* ERROR BANNER */}
            {errorMessage && (
              <div className="mb-5 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* STEP 1: SOCIETY PROFILE */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Society or Complex Name *
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={societyName}
                        onChange={(e) => setSocietyName(e.target.value)}
                        placeholder="e.g. Whispering Palms CHS or DLF Phase 5"
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      This official name will be printed on all visitor digital parking passes.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        City / Region *
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Powai, Mumbai"
                          required
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Society Complex Type
                      </label>
                      <select
                        value={communityType}
                        onChange={(e) => setCommunityType(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value="High-Rise Apartment Complex">High-Rise Apartment Complex</option>
                        <option value="Gated Villa Community">Gated Villa Community</option>
                        <option value="Cooperative Housing Society (CHS)">Cooperative Housing Society (CHS)</option>
                        <option value="Commercial & Mixed Complex">Commercial & Mixed Complex</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Physical Street Address *
                    </label>
                    <textarea
                      value={societyAddress}
                      onChange={(e) => setSocietyAddress(e.target.value)}
                      rows={2}
                      placeholder="e.g. Plot No 44, Central Avenue Road, Opp. Lake Gardens"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  {/* Auto-preview society code pill */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                        Generated Unique Society ID Preview
                      </div>
                      <div className="text-sm font-mono font-black text-slate-900 mt-0.5">
                        {previewSocietyCode}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-600 bg-white px-2 py-1 rounded-lg border border-blue-200">
                      Auto-provisioned
                    </span>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-sm shadow-blue-500/25"
                    >
                      <span>Continue to Parking Setup</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: PARKING INVENTORY & GATES */}
              {currentStep === 2 && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 mb-1">
                      Configure Initial Visitor Parking Capacity
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      You can modify, expand, or re-allocate these bays anytime from the Admin Parking Bay management dashboard.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Car className="w-4 h-4 text-blue-600" />
                          <span>Visitor Car Slots</span>
                        </span>
                        <span className="text-base font-black text-blue-700 font-mono">
                          {carSlotsCount}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="100"
                        value={carSlotsCount}
                        onChange={(e) => setCarSlotsCount(parseInt(e.target.value) || 2)}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>2 Bays</span>
                        <span>50 Bays</span>
                        <span>100 Bays</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-purple-600" />
                          <span>Two-Wheeler Bays</span>
                        </span>
                        <span className="text-base font-black text-purple-700 font-mono">
                          {twoWheelerSlotsCount}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={twoWheelerSlotsCount}
                        onChange={(e) => setTwoWheelerSlotsCount(parseInt(e.target.value) || 0)}
                        className="w-full accent-purple-600 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>0 Bays</span>
                        <span>25 Bays</span>
                        <span>50 Bays</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Active Security Gates
                      </label>
                      <select
                        value={gatesCount}
                        onChange={(e) => setGatesCount(parseInt(e.target.value) || 1)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      >
                        <option value={1}>1 Main Entrance Gate</option>
                        <option value={2}>2 Gates (Main Gate + Back Gate)</option>
                        <option value={3}>3 Gates (Main, East, West)</option>
                        <option value={4}>4+ Multi-Gate Complex</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Max Visitor Duration
                      </label>
                      <div className="relative">
                        <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <select
                          value={maxStayHours}
                          onChange={(e) => setMaxStayHours(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="12">12 Hours (Day Pass)</option>
                          <option value="24">24 Hours (Standard Default)</option>
                          <option value="48">48 Hours (Overnight Allowed)</option>
                          <option value="72">72 Hours (Extended)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-sm shadow-blue-500/25"
                    >
                      <span>Continue to Admin Setup</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: RWA / ADMIN CREDENTIALS */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 mb-1">
                      Designate Society Administrator Account
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      The primary administrator receives registration requests from residents & guards and controls society parking rules.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Admin Full Name *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          placeholder="e.g. Vikramaditya Rao"
                          required
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Designation / Role
                      </label>
                      <input
                        type="text"
                        value={adminDesignation}
                        onChange={(e) => setAdminDesignation(e.target.value)}
                        placeholder="e.g. Secretary, Chairman, Estate Manager"
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Official Mobile Phone *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="tel"
                          value={adminPhone}
                          onChange={(e) => setAdminPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          required
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Email Address (Optional)
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="email"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          placeholder="secretary@society.com"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Admin Password (min 6 chars) *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="password"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="password"
                          value={adminConfirmPassword}
                          onChange={(e) => setAdminConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2.5">
                    <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      Submitting this form provisions your society in the cloud, generates your <strong>Unique Society ID Code</strong>, and seeds your live visitor parking slots.
                    </span>
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="py-3 px-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/25 flex items-center gap-2 disabled:opacity-60"
                    >
                      <span>{isSubmitting ? 'Registering Society...' : 'Complete Society Registration'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* RIGHT: LIVE DIGITAL SOCIETY CARD & PASS PREVIEW */}
          <div className="lg:col-span-5 space-y-6">
            {/* Liquid Glass Society Card */}
            <div className="relative group">
              {/* Outer Glow */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-500" />

              <div className="relative bg-slate-900/90 backdrop-blur-2xl text-white rounded-3xl p-6 sm:p-7 border border-white/20 shadow-2xl space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/40 text-blue-400 flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300 block">
                        Verified Society Card
                      </span>
                      <span className="text-xs font-semibold text-slate-300">
                        {communityType}
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Ready</span>
                  </span>
                </div>

                {/* Society Display */}
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight break-words">
                    {societyName.trim() || 'Your Society Name'}
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {city.trim() ? `${city.trim()} • ` : ''}
                      {societyAddress.trim() || 'Address will appear here'}
                    </span>
                  </p>
                </div>

                {/* Live Society Code Pill */}
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">
                      Unique Resident & Guard Invite Code
                    </span>
                    <span className="text-lg font-mono font-black text-emerald-400 tracking-wider">
                      {previewSocietyCode}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 bg-white/10 px-2 py-1 rounded-lg">
                    Auto-Generated
                  </div>
                </div>

                {/* Infrastructure Pills */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-slate-400 block">Visitor Capacity</span>
                    <span className="font-bold text-white">
                      {carSlotsCount} Cars • {twoWheelerSlotsCount} Bikes
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-slate-400 block">Security Gates</span>
                    <span className="font-bold text-white">
                      {gatesCount} Active Gates
                    </span>
                  </div>
                </div>

                {/* Digital Gate Pass Feature Preview */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/20 text-xs flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-white">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-[11px]">Instant QR Pass Clearance</div>
                    <div className="text-[10px] text-indigo-200">
                      Zero hardware needed. Security guards scan digital passes using any mobile phone.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Why Onboard Section */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 p-6 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Why Societies Choose ParkPass
              </h3>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Unique Society Code:</strong> Residents and guards request access using your code; nothing goes live without admin clearance.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Zero Parking Conflicts:</strong> Real-time bay occupancy tracking prevents double-booking or visitor overstays.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>The Visitor Handover:</strong> Residents receive instant alerts: <em>"Your visitor has arrived at the gate."</em>
                  </span>
                </div>
              </div>

              <div className="pt-2 text-center">
                <p className="text-[11px] text-slate-400">
                  Already have an account?{' '}
                  <Link href="/login" className="text-blue-600 font-bold hover:underline">
                    Sign in to Portal
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

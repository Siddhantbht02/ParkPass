'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchApi } from '@/lib/api';
import QRCode from 'qrcode';
import {
  Car,
  Calendar,
  Clock,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Copy,
  Send,
  X,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  User,
  Users,
  Building,
  QrCode,
  ArrowRight,
  ArrowLeft,
  Bell,
  RefreshCw,
  Search,
  Filter,
  Home,
  FileText,
  MapPin,
  Share2,
  Download,
  Trash2,
  XCircle,
} from 'lucide-react';

export default function ResidentPortal() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Navigation: 'home' (Screen 1), 'book' (Screen 2), 'visitors' (Screen 4), 'passModal' (Screen 3)
  const [activeTab, setActiveTab] = useState<'home' | 'book' | 'visitors'>('home');

  // Dashboard state
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Booking Form State (Screen 2)
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorCategory, setVisitorCategory] = useState('GUEST');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('CAR');
  const [arrivalDate, setArrivalDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [durationHours, setDurationHours] = useState(24);
  const [preferredSlotId, setPreferredSlotId] = useState<string>('');

  // Live Availability
  const [availability, setAvailability] = useState<any>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Screen 3: Digital Pass Generated Modal
  const [confirmedPass, setConfirmedPass] = useState<any>(null);
  const [confirmedQrUrl, setConfirmedQrUrl] = useState<string>('');
  const [confirmedWaLink, setConfirmedWaLink] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Screen 4: Visitors list & filters
  const [visitorsFilter, setVisitorsFilter] = useState<'ALL' | 'SCHEDULED' | 'CHECKED_IN' | 'CHECKED_OUT'>('ALL');
  const [visitorsSearch, setVisitorsSearch] = useState('');
  const [allVisitors, setAllVisitors] = useState<any[]>([]);
  const [loadingVisitors, setLoadingVisitors] = useState(false);

  // Pass Action Modal (Extend / Cancel)
  const [selectedPass, setSelectedPass] = useState<any>(null);
  const [extendHours, setExtendHours] = useState(2);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Load Dashboard Data
  const loadDashboard = async () => {
    try {
      setLoadingDashboard(true);
      const data = await fetchApi('/api/v1/resident/dashboard');
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  // Load Visitors List
  const loadVisitors = async () => {
    try {
      setLoadingVisitors(true);
      const data = await fetchApi<{ passes: any[] }>(`/api/v1/resident/visitor-passes?status=${visitorsFilter}`);
      setAllVisitors(data.passes || []);
    } catch (err) {
      console.error('Failed to load visitors:', err);
    } finally {
      setLoadingVisitors(false);
    }
  };

  // Live Availability Check
  const checkLiveAvailability = async () => {
    try {
      setCheckingAvailability(true);
      const startTime = new Date(arrivalDate).toISOString();
      const data = await fetchApi(
        `/api/v1/resident/parking-availability?validFrom=${encodeURIComponent(startTime)}&durationHours=${durationHours}&vehicleType=${vehicleType}`
      );
      setAvailability(data);
    } catch (err) {
      console.error('Failed to check availability:', err);
    } finally {
      setCheckingAvailability(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboard();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'visitors') {
      loadVisitors();
    } else if (activeTab === 'book') {
      checkLiveAvailability();
    }
  }, [activeTab, visitorsFilter, arrivalDate, durationHours, vehicleType]);

  // Submit Booking (Screen 2 -> Screen 3)
  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    setBookingLoading(true);

    try {
      const validFrom = new Date(arrivalDate).toISOString();
      const payload: any = {
        visitorName: visitorName.trim(),
        visitorPhone: visitorPhone.trim() || undefined,
        visitorCategory,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        vehicleType,
        validFrom,
        durationHours: Number(durationHours),
        preferredSlotId: preferredSlotId || undefined,
      };

      const res = await fetchApi('/api/v1/resident/visitor-passes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Generate QR Code
      const qrDataUrl = await QRCode.toDataURL(res.pass.secureToken, {
        width: 320,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });

      setConfirmedPass(res.pass);
      setConfirmedQrUrl(qrDataUrl);
      setConfirmedWaLink(res.whatsappLink);

      // Reset form
      setVisitorName('');
      setVisitorPhone('');
      setVehicleNumber('');
      loadDashboard();
    } catch (err: any) {
      setBookingError(err.message || 'Failed to reserve parking slot');
    } finally {
      setBookingLoading(false);
    }
  };

  // Cancel Pass
  const handleCancelPass = async (passId: string) => {
    if (!confirm('Cancel this visitor pass? The reserved parking slot will be freed.')) {
      return;
    }
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetchApi(`/api/v1/resident/visitor-passes/${passId}/cancel`, { method: 'POST' });
      setActionMessage(res.message);
      loadVisitors();
      loadDashboard();
      setTimeout(() => setSelectedPass(null), 1500);
    } catch (err: any) {
      setActionMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Extend Pass
  const handleExtendPass = async (passId: string) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetchApi(`/api/v1/resident/visitor-passes/${passId}/extend`, {
        method: 'POST',
        body: JSON.stringify({ additionalHours: Number(extendHours) }),
      });
      setActionMessage(res.message);
      loadVisitors();
      loadDashboard();
      setTimeout(() => setSelectedPass(null), 1500);
    } catch (err: any) {
      setActionMessage(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Open existing pass in digital ticket view
  const openPassModal = async (pass: any) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(pass.secureToken, {
        width: 320,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      setConfirmedPass(pass);
      setConfirmedQrUrl(qrDataUrl);
      setConfirmedWaLink(
        `https://api.whatsapp.com/send?text=${encodeURIComponent(
          `Hi ${pass.visitorName}, your visitor parking pass is ready: ${window.location.origin}/pass/${pass.secureToken}`
        )}`
      );
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Calculate departure time display
  const arrivalObj = new Date(arrivalDate);
  const departureObj = new Date(arrivalObj.getTime() + durationHours * 60 * 60 * 1000);
  const departureFormatted = isNaN(departureObj.getTime())
    ? ''
    : departureObj.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      });

  const currentDateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-md mx-auto px-4 pt-5 pb-6">

        {/* SCREEN 1: RESIDENT HOME / OVERVIEW */}
        {activeTab === 'home' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Top Greeting Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Good morning, {user.name}
                </h1>
                <p className="text-xs text-slate-500 font-medium">{currentDateStr}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadDashboard}
                  className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-sm"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                </button>
                <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
              </div>
            </div>

            {/* Hero Card: Expecting a visitor? */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden">
              <div className="max-w-[70%]">
                <h2 className="text-base font-bold text-slate-900 mb-1">Expecting a visitor?</h2>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Pre-book visitor parking in seconds.
                </p>
                <button
                  onClick={() => setActiveTab('book')}
                  className="py-2.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
                >
                  <span>Book Parking</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="absolute right-4 bottom-4 w-20 h-20 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center pointer-events-none">
                <Car className="w-10 h-10 opacity-80" />
              </div>
            </div>

            {/* Quick Stat Counter Pills Row */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[11px] font-semibold text-slate-500">Active</span>
                </div>
                <div className="text-xl font-extrabold text-slate-900">
                  {dashboardData?.stats?.activeVisitors ?? 0}
                </div>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span className="text-[11px] font-semibold text-slate-500">Upcoming</span>
                </div>
                <div className="text-xl font-extrabold text-slate-900">
                  {dashboardData?.stats?.upcomingArrivals ?? 0}
                </div>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span className="text-[11px] font-semibold text-slate-500">Total</span>
                </div>
                <div className="text-xl font-extrabold text-slate-900">
                  {dashboardData?.stats?.totalBookings ?? 0}
                </div>
              </div>
            </div>

            {/* Your Visitors Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Your Visitors</h3>
                <button
                  onClick={() => setActiveTab('visitors')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  View all
                </button>
              </div>

              {/* Active Sessions or Upcoming Passes */}
              {dashboardData?.activeSessions && dashboardData.activeSessions.length > 0 ? (
                <div className="space-y-2.5">
                  {dashboardData.activeSessions.map((session: any) => (
                    <div
                      key={session.id}
                      onClick={() => openPassModal(session.pass)}
                      className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-blue-400 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{session.pass.visitorName}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Parked
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span className="font-mono font-semibold text-slate-700">{session.pass.vehicleNumber}</span>
                          <span>•</span>
                          <span className="font-bold text-blue-600">Slot {session.parkingSlot.slotNumber}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              ) : null}

              {dashboardData?.upcomingPasses && dashboardData.upcomingPasses.length > 0 ? (
                <div className="space-y-2.5">
                  {dashboardData.upcomingPasses.map((pass: any) => (
                    <div
                      key={pass.id}
                      onClick={() => openPassModal(pass)}
                      className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-blue-400 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{pass.visitorName}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            Upcoming
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span className="font-mono font-semibold text-slate-700">{pass.vehicleNumber}</span>
                          <span>•</span>
                          <span className="font-bold text-blue-600">Slot {pass.parkingSlot.slotNumber}</span>
                          <span>•</span>
                          <span>{new Date(pass.validFrom).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelPass(pass.id);
                          }}
                          className="px-2 py-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 text-[11px] font-semibold transition-colors flex items-center gap-1 border border-transparent hover:border-red-200"
                          title="Cancel Pass"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          <span>Cancel</span>
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !dashboardData?.activeSessions?.length && (
                  <div className="bg-white rounded-2xl p-6 text-center border border-slate-200/80 shadow-sm text-xs text-slate-400">
                    <Car className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                    <p>No active visitors today.</p>
                    <button
                      onClick={() => setActiveTab('book')}
                      className="mt-2 text-blue-600 font-semibold"
                    >
                      + Book a visitor pass
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* SCREEN 2: BOOK VISITOR PARKING */}
        {activeTab === 'book' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveTab('home')}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <h2 className="text-sm font-bold text-slate-900">Book visitor parking</h2>
              <span className="text-[11px] font-semibold text-slate-400">Step 1 of 3</span>
            </div>

            {bookingError && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bookingError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePass} className="space-y-4">
              {/* 1. Visitor Section */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">1. Visitor</span>
                  <span className="text-[11px] text-blue-600 font-medium">Guest info</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Visitor full name *
                  </label>
                  <input
                    type="text"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="e.g. Siddhant"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Visitor mobile number (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    placeholder="+91 99887 76655"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                    Visitor category
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: 'GUEST', label: 'Guest' },
                      { key: 'RELATIVE', label: 'Relative' },
                      { key: 'CAB', label: 'Cab' },
                      { key: 'SERVICE', label: 'Delivery' },
                      { key: 'OTHER', label: 'Other' },
                    ].map((cat) => (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setVisitorCategory(cat.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          visitorCategory === cat.key
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Vehicle Section */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  2. Vehicle
                </span>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Vehicle registration number *
                  </label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. MH 12 AB 1122"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                    Vehicle type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'TWO_WHEELER', label: 'Two-wheeler' },
                      { key: 'CAR', label: 'Car' },
                      { key: 'SUV', label: 'SUV' },
                    ].map((type) => (
                      <button
                        key={type.key}
                        type="button"
                        onClick={() => setVehicleType(type.key)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                          vehicleType === type.key
                            ? 'bg-blue-50 border-blue-600 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Schedule Section */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  3. Schedule
                </span>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Expected arrival date & time *
                  </label>
                  <input
                    type="datetime-local"
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                    Parking duration
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 3, 6, 12, 24].map((hrs) => (
                      <button
                        key={hrs}
                        type="button"
                        onClick={() => setDurationHours(hrs)}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                          durationHours === hrs
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {hrs}h
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 flex justify-between">
                  <span>Reserved until:</span>
                  <span className="font-bold text-slate-800">{departureFormatted}</span>
                </div>
              </div>

              {/* 4. Parking Allocation Preview */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    4. Parking Allocation
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600">
                    {checkingAvailability ? 'Checking...' : `${availability?.availableCount ?? 19} slots free`}
                  </span>
                </div>

                {availability?.slots && availability.slots.length > 0 && (
                  <select
                    value={preferredSlotId}
                    onChange={(e) => setPreferredSlotId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                  >
                    <option value="">Auto-Assign Optimal Slot</option>
                    {availability.slots.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.slotNumber} ({s.parkingType}) — {s.zone}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={bookingLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 disabled:opacity-60"
              >
                {bookingLoading ? (
                  <span>Reserving Slot & Creating Pass...</span>
                ) : (
                  <>
                    <span>Confirm & Generate Pass</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* SCREEN 4: MY VISITORS */}
        {activeTab === 'visitors' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">My Visitors</h2>
              <p className="text-xs text-slate-500">Manage all your visitor passes and parking sessions.</p>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={visitorsSearch}
                onChange={(e) => setVisitorsSearch(e.target.value)}
                placeholder="Search visitor name or vehicle..."
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { key: 'ALL', label: 'All' },
                { key: 'SCHEDULED', label: 'Upcoming' },
                { key: 'CHECKED_IN', label: 'Active' },
                { key: 'CHECKED_OUT', label: 'History' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setVisitorsFilter(f.key as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    visitorsFilter === f.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Visitors List */}
            {loadingVisitors ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading visitors...</div>
            ) : allVisitors.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/80">
                No visitor passes found for this filter.
              </div>
            ) : (
              <div className="space-y-3">
                {allVisitors
                  .filter((p) => {
                    if (!visitorsSearch) return true;
                    const q = visitorsSearch.toLowerCase();
                    return (
                      p.visitorName.toLowerCase().includes(q) ||
                      p.vehicleNumber.toLowerCase().includes(q) ||
                      p.parkingSlot.slotNumber.toLowerCase().includes(q)
                    );
                  })
                  .map((pass) => (
                    <div
                      key={pass.id}
                      className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                            {pass.visitorName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{pass.visitorName}</div>
                            <div className="text-xs text-slate-500 font-mono font-semibold">
                              {pass.vehicleNumber}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                            pass.status === 'CHECKED_IN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : pass.status === 'SCHEDULED'
                              ? 'bg-blue-100 text-blue-800'
                              : pass.status === 'CHECKED_OUT'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {pass.status === 'CHECKED_IN' ? 'Parked' : pass.status === 'CHECKED_OUT' ? 'Completed' : pass.status}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                        <div>
                          Slot: <strong className="text-blue-600 font-bold">{pass.parkingSlot.slotNumber}</strong>
                          <span className="mx-2">•</span>
                          <span>{new Date(pass.validFrom).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openPassModal(pass)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700"
                          >
                            View Pass
                          </button>

                          {pass.status === 'SCHEDULED' && (
                            <button
                              onClick={() => handleCancelPass(pass.id)}
                              className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Cancel</span>
                            </button>
                          )}

                          {(pass.status === 'SCHEDULED' || pass.status === 'CHECKED_IN') && (
                            <button
                              onClick={() => {
                                setSelectedPass(pass);
                                setExtendHours(2);
                                setActionMessage(null);
                              }}
                              className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                            >
                              Manage
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* SCREEN 3: DIGITAL PASS GENERATED MODAL / VIEW */}
      {confirmedPass && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            {/* Top Close */}
            <button
              onClick={() => setConfirmedPass(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="text-center mb-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                VISITOR PASS
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-900">{confirmedPass.passCode}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {confirmedPass.status || 'Active'}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">
                ParkPass • {user.societyName}
              </div>
            </div>

            {/* Center QR Code */}
            <div className="p-3 bg-white rounded-2xl border-2 border-slate-100 shadow-sm text-center mb-3">
              {confirmedQrUrl && (
                <img
                  src={confirmedQrUrl}
                  alt="Visitor Pass QR"
                  className="w-44 h-44 mx-auto rounded-lg"
                />
              )}
            </div>

            {/* Pass Details Card */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-1.5 text-xs mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Visitor:</span>
                <span className="font-bold text-slate-900">{confirmedPass.visitorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vehicle:</span>
                <span className="font-mono font-bold text-slate-900">{confirmedPass.vehicleNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Destination:</span>
                <span className="font-semibold text-slate-800">
                  {user.towerName || 'Tower A'} — Flat {user.flatNumber || 'A-804'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Parking Slot:</span>
                <span className="font-extrabold text-blue-600 text-sm">
                  {confirmedPass.parkingSlot?.slotNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Arrival:</span>
                <span className="text-slate-800">
                  {new Date(confirmedPass.validFrom).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Valid Until:</span>
                <span className="text-slate-800">
                  {new Date(confirmedPass.validUntil).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-center text-slate-500 mb-4">
              Present this pass to security at the entrance.
            </p>

            {/* Actions */}
            <div className="space-y-2">
              <a
                href={confirmedWaLink}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>Share via WhatsApp</span>
              </a>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const passUrl = `${window.location.origin}/pass/${confirmedPass.secureToken}`;
                    navigator.clipboard.writeText(passUrl);
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2000);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copySuccess ? 'Copied Link!' : 'Share Link'}</span>
                </button>

                <a
                  href={`/pass/${confirmedPass.secureToken}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Ticket</span>
                </a>
              </div>

              {/* Direct Cancel Pass Button */}
              {(confirmedPass.status === 'SCHEDULED' || !confirmedPass.status) && (
                <button
                  type="button"
                  onClick={() => {
                    const pId = confirmedPass.id;
                    setConfirmedPass(null);
                    handleCancelPass(pId);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>Cancel Pass & Free Slot</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MANAGE PASS MODAL (EXTEND / CANCEL) */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-900 mb-1">Manage Visitor Pass</h3>
            <p className="text-xs text-slate-500 mb-4">
              {selectedPass.visitorName} ({selectedPass.vehicleNumber}) • Slot {selectedPass.parkingSlot?.slotNumber}
            </p>

            {actionMessage && (
              <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs">
                {actionMessage}
              </div>
            )}

            <div className="space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-800 block mb-1">Extend Parking Duration</span>
                <p className="text-[11px] text-slate-500 mb-2">Request extra time if slot is available.</p>
                <div className="flex gap-2">
                  <select
                    value={extendHours}
                    onChange={(e) => setExtendHours(Number(e.target.value))}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 bg-white"
                  >
                    <option value={1}>+ 1 Hour</option>
                    <option value={2}>+ 2 Hours</option>
                    <option value={4}>+ 4 Hours</option>
                    <option value={8}>+ 8 Hours</option>
                  </select>
                  <button
                    onClick={() => handleExtendPass(selectedPass.id)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                  >
                    Extend
                  </button>
                </div>
              </div>

              {selectedPass.status === 'SCHEDULED' && (
                <div className="bg-red-50 p-3.5 rounded-xl border border-red-100">
                  <span className="text-xs font-bold text-red-900 block mb-1">Cancel Visitor Pass</span>
                  <button
                    onClick={() => handleCancelPass(selectedPass.id)}
                    disabled={actionLoading}
                    className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs"
                  >
                    Cancel Pass & Free Slot
                  </button>
                </div>
              )}

              <button
                onClick={() => setSelectedPass(null)}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 py-2 px-6">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${
              activeTab === 'home' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </button>

          {/* Elevated Book Button */}
          <button
            onClick={() => setActiveTab('book')}
            className="w-12 h-12 -mt-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 transition-transform active:scale-95"
            title="Book Visitor Parking"
          >
            <PlusCircle className="w-6 h-6" />
          </button>

          <button
            onClick={() => setActiveTab('visitors')}
            className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${
              activeTab === 'visitors' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>My Visitors</span>
          </button>
        </div>
      </div>
    </div>
  );
}

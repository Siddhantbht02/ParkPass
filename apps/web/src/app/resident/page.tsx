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
  Zap,
  ListOrdered,
  Navigation,
  Compass,
  Check,
  AlertTriangle,
} from 'lucide-react';

export default function ResidentPortal() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Navigation: 'home', 'book', 'visitors', 'waitlist'
  const [activeTab, setActiveTab] = useState<'home' | 'book' | 'visitors' | 'waitlist'>('home');

  // Dashboard state
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Booking Form State
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

  // One-Tap Extension & Expiry state
  const [extendingPassId, setExtendingPassId] = useState<string | null>(null);
  const [simulatingExpiry, setSimulatingExpiry] = useState(false);
  const [simulatingHandover, setSimulatingHandover] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dismissedHandovers, setDismissedHandovers] = useState<string[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Waitlist State
  const [waitlistModalOpen, setWaitlistModalOpen] = useState(false);
  const [waitlistVisitorName, setWaitlistVisitorName] = useState('');
  const [waitlistVehicle, setWaitlistVehicle] = useState('');
  const [waitlistVehicleType, setWaitlistVehicleType] = useState('CAR');
  const [waitlistDuration, setWaitlistDuration] = useState(4);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Real-time notification & arrival polling
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadDashboard();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [user]);

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

  // Submit Booking
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

  // One-Tap Visitor Extension
  const handleOneTapExtend = async (passId: string, hours: number) => {
    try {
      setExtendingPassId(passId);
      const res = await fetchApi<{ success: boolean; reassigned?: boolean; slotNumber: string; message: string; newEndTime?: string }>(
        `/api/v1/resident/visitor-passes/${passId}/extend`,
        {
          method: 'POST',
          body: JSON.stringify({ additionalHours: hours }),
        }
      );
      alert('⚡ ' + (res.message || 'Parking extended successfully!'));

      // Update confirmedPass modal in-place if open
      setConfirmedPass((prev: any) => {
        if (!prev || prev.id !== passId) return prev;
        return {
          ...prev,
          validUntil: res.newEndTime || prev.validUntil,
          parkingSlot: res.slotNumber ? { ...(prev.parkingSlot || {}), slotNumber: res.slotNumber } : prev.parkingSlot,
        };
      });

      await loadDashboard();
      if (activeTab === 'visitors') await loadVisitors();
      if (selectedPass) setSelectedPass(null);
    } catch (err: any) {
      alert('Could not extend: ' + (err.message || 'Parking slots full'));
    } finally {
      setExtendingPassId(null);
    }
  };

  // Simulate 15-Minute Expiry Alert
  const handleSimulateExpiry = async (passId?: string) => {
    try {
      setSimulatingExpiry(true);
      await fetchApi('/api/v1/resident/simulate-expiry-alert', {
        method: 'POST',
        body: JSON.stringify({ passId }),
      });
      await loadDashboard();
      alert('🔔 Simulated 15-minute expiry alert sent! Look at the banner above and in your notifications.');
    } catch (err: any) {
      alert(err.message || 'Could not simulate expiry');
    } finally {
      setSimulatingExpiry(false);
    }
  };

  // Simulate The Visitor Handover ("Your visitor has arrived")
  const handleSimulateHandover = async (passId?: string) => {
    try {
      setSimulatingHandover(true);
      const res = await fetchApi<{ success: boolean; message: string; notification: any }>(
        '/api/v1/resident/simulate-handover',
        {
          method: 'POST',
          body: JSON.stringify({ passId }),
        }
      );
      await loadDashboard();
      alert(`🎉 The Visitor Handover:\n"${res.message || 'Your visitor has arrived.'}"\n\nNotification delivered to resident portal!`);
    } catch (err: any) {
      alert(err.message || 'Could not simulate visitor handover');
    } finally {
      setSimulatingHandover(false);
    }
  };

  // Dismiss / Mark Notification as Read
  const handleDismissNotification = async (notificationId: string) => {
    try {
      setDismissedHandovers((prev) => [...prev, notificationId]);
      await fetchApi(`/api/v1/resident/notifications/${notificationId}/read`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await loadDashboard();
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  // Join Waitlist Handler
  const handleJoinWaitlist = async (e?: React.FormEvent, customPayload?: any) => {
    if (e) e.preventDefault();
    try {
      setWaitlistLoading(true);
      const payload = customPayload || {
        visitorName: waitlistVisitorName || visitorName,
        vehicleNumber: (waitlistVehicle || vehicleNumber).toUpperCase(),
        vehicleType: waitlistVehicleType || vehicleType,
        durationHours: Number(waitlistDuration || durationHours),
      };

      const res = await fetchApi<{ entry: any; queuePosition: number; message: string }>('/api/v1/resident/waitlist', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      alert(`🎉 ${res.message || 'Joined waitlist at position #' + res.queuePosition}`);
      setWaitlistModalOpen(false);
      setBookingError(null);
      await loadDashboard();
      setActiveTab('waitlist');
    } catch (err: any) {
      alert('Error joining waitlist: ' + (err.message || 'Failed'));
    } finally {
      setWaitlistLoading(false);
    }
  };

  // Cancel Waitlist Handler
  const handleCancelWaitlist = async (id: string) => {
    if (!confirm('Leave the society parking waitlist?')) return;
    try {
      await fetchApi(`/api/v1/resident/waitlist/${id}`, { method: 'DELETE' });
      await loadDashboard();
    } catch (err: any) {
      alert('Could not cancel waitlist entry: ' + (err.message || 'Error'));
    }
  };

  // Copy coordination link
  const copyCoordinationLink = (token: string) => {
    const url = `${window.location.origin}/pass/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // Cancel Pass
  const handleCancelPass = async (passId: string) => {
    if (!confirm('Cancel this visitor pass? The reserved parking slot will be freed.')) {
      return;
    }
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetchApi<{ message: string }>(`/api/v1/resident/visitor-passes/${passId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      alert('✅ ' + (res.message || 'Pass cancelled and slot released.'));
      setConfirmedPass(null);
      setSelectedPass(null);
      await loadDashboard();
      if (activeTab === 'visitors') await loadVisitors();
    } catch (err: any) {
      alert('Could not cancel pass: ' + (err.message || 'Failed to cancel'));
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

  const activeWaitlistCount = dashboardData?.stats?.activeWaitlist ?? 0;
  const expiringPasses = dashboardData?.expiringPasses || [];
  const allNotifications = dashboardData?.notifications || [];
  const arrivalNotifications = allNotifications.filter(
    (n: any) =>
      (n.type === 'VISITOR_ARRIVED' || n.title?.includes('Handover') || n.title?.includes('Visitor Arrived')) &&
      !dismissedHandovers.includes(n.id) &&
      !n.isRead
  );
  const unreadNotifications = allNotifications.filter((n: any) => !n.isRead);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-md mx-auto px-4 pt-5 pb-6">

        {/* 1. THE VISITOR HANDOVER: Real-time Arrival Alert Banner ("Your visitor has arrived.") */}
        {arrivalNotifications.length > 0 && (
          <div className="mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-4 text-white shadow-lg shadow-emerald-600/25 border border-emerald-400 animate-in fade-in duration-300">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-200">
                    The Visitor Handover
                  </div>
                  <h4 className="text-sm font-extrabold leading-tight">
                    Your visitor has arrived!
                  </h4>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full shrink-0">
                Gate Entry Verified
              </span>
            </div>

            {arrivalNotifications.map((notif: any) => (
              <div key={notif.id} className="mt-2 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                <p className="text-xs font-semibold text-white mb-2 leading-relaxed">
                  {notif.message}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-emerald-100 font-medium">
                    {new Date(notif.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDismissNotification(notif.id)}
                    className="px-3 py-1 bg-white text-emerald-900 font-bold text-xs rounded-xl hover:bg-emerald-50 active:scale-95 transition-all shadow-sm"
                  >
                    Acknowledge ✓
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2. ONE-TAP VISITOR EXTENSION: 15-MINUTE WARNING BANNER (Feature 2) */}
        {expiringPasses.length > 0 && (
          <div className="mb-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-4 text-white shadow-lg shadow-orange-500/20 border border-orange-400 animate-in fade-in duration-300">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-white animate-bounce" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-extrabold text-orange-100">
                    One-Tap Visitor Extension
                  </div>
                  <h4 className="text-sm font-extrabold leading-tight">
                    Parking Expires in ~15 Minutes!
                  </h4>
                </div>
              </div>
            </div>

            {expiringPasses.map((expPass: any) => (
              <div key={expPass.id} className="mt-2 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold">{expPass.visitorName} ({expPass.vehicleNumber})</span>
                  <span className="font-bold bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
                    Slot {expPass.parkingSlot?.slotNumber}
                  </span>
                </div>
                <p className="text-[11px] text-orange-100 mb-2.5">
                  Valid until {new Date(expPass.validUntil).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}. Tap below to extend instantly without calling security:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 4].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      disabled={extendingPassId === expPass.id}
                      onClick={() => handleOneTapExtend(expPass.id, hrs)}
                      className="py-1.5 px-2 bg-white text-orange-950 font-black text-xs rounded-xl hover:bg-orange-50 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1"
                    >
                      <Zap className="w-3 h-3 text-orange-600" />
                      <span>+{hrs} Hour{hrs > 1 ? 's' : ''}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

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
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSimulateHandover()}
                  disabled={simulatingHandover}
                  className="px-2 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold flex items-center gap-1 shadow-sm hover:bg-emerald-100 transition-colors"
                  title="Simulate 'Your visitor has arrived' notification"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Test Arrival</span>
                </button>
                <button
                  onClick={() => handleSimulateExpiry()}
                  disabled={simulatingExpiry}
                  className="px-2 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-bold flex items-center gap-1 shadow-sm hover:bg-orange-100 transition-colors"
                  title="Simulate 15-Minute Expiry Alert"
                >
                  <Zap className="w-3.5 h-3.5 text-orange-600" />
                  <span>Test Expiry</span>
                </button>
                {/* Notification Bell */}
                <button
                  onClick={() => setNotificationsOpen(true)}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-sm relative"
                  title="Notification Center"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      {unreadNotifications.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={loadDashboard}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-sm"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingDashboard ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Hero Card: Expecting a visitor? */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden">
              <div className="max-w-[70%]">
                <h2 className="text-base font-bold text-slate-900 mb-1">Expecting a visitor?</h2>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Pre-book visitor parking in seconds with smart arrival coordination.
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

              <div
                onClick={() => setActiveTab('waitlist')}
                className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm cursor-pointer hover:border-purple-300 transition-colors"
              >
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span className="text-[11px] font-semibold text-purple-700 font-bold">Waitlist</span>
                </div>
                <div className="text-xl font-extrabold text-purple-900">
                  {activeWaitlistCount}
                </div>
              </div>
            </div>

            {/* Waitlist Banner Card if resident has entries */}
            {activeWaitlistCount > 0 && (
              <div
                onClick={() => setActiveTab('waitlist')}
                className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                    <ListOrdered className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-purple-950">Society Parking Waitlist</div>
                    <div className="text-[11px] text-purple-700">You have {activeWaitlistCount} vehicle(s) in queue for freed slots</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-500" />
              </div>
            )}

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

              {/* Active Sessions */}
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
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOneTapExtend(session.pass.id, 1);
                          }}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3 text-blue-600" />
                          <span>+1h</span>
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Upcoming Passes with Smart Arrival Coordination (Feature 3) */}
              {dashboardData?.upcomingPasses && dashboardData.upcomingPasses.length > 0 ? (
                <div className="space-y-2.5">
                  {dashboardData.upcomingPasses.map((pass: any) => (
                    <div
                      key={pass.id}
                      onClick={() => openPassModal(pass)}
                      className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-blue-400 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{pass.visitorName}</span>
                            {/* Smart Arrival Status Badge */}
                            {pass.arrivalStatus === 'ARRIVED' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" /> Arrived at Gate
                              </span>
                            )}
                            {pass.arrivalStatus === 'ON_THE_WAY' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
                                <Compass className="w-2.5 h-2.5 text-blue-600" /> On Way (~{pass.etaMinutes || 15}m)
                              </span>
                            )}
                            {pass.arrivalStatus === 'DELAYED' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                Delayed (~{pass.etaMinutes}m)
                              </span>
                            )}
                            {(!pass.arrivalStatus || pass.arrivalStatus === 'SCHEDULED') && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                Scheduled
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                            <span className="font-mono font-semibold text-slate-700">{pass.vehicleNumber}</span>
                            <span>•</span>
                            <span className="font-bold text-blue-600">Slot {pass.parkingSlot?.slotNumber}</span>
                            <span>•</span>
                            <span>{new Date(pass.validFrom).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-400 mt-1" />
                      </div>

                      {/* Coordination & Action Quick Buttons */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyCoordinationLink(pass.secureToken);
                          }}
                          className="text-[11px] font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>{copiedToken === pass.secureToken ? 'Link Copied!' : 'Copy Ticket Link'}</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOneTapExtend(pass.id, 1);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[11px] font-bold flex items-center gap-0.5"
                          >
                            <Zap className="w-3 h-3 text-amber-500" />
                            <span>+1h</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelPass(pass.id);
                            }}
                            className="px-2 py-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 text-[11px] font-semibold transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                            <span>Cancel</span>
                          </button>
                        </div>
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

            {/* Parking Full Waitlist Option (Feature 1) */}
            {bookingError && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{bookingError}</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  All visitor parking slots are full for this requested duration. Instead of turning your guest away, join the <strong>Society Parking Waitlist</strong> to be automatically allocated the next freed bay when a vehicle exits!
                </p>
                <button
                  type="button"
                  onClick={() => handleJoinWaitlist()}
                  disabled={waitlistLoading}
                  className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <ListOrdered className="w-4 h-4" />
                  <span>{waitlistLoading ? 'Joining Waitlist...' : 'Join Waitlist for this Visitor'}</span>
                </button>
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
                  <span className={`text-[11px] font-bold ${availability?.availableCount > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {checkingAvailability ? 'Checking...' : `${availability?.availableCount ?? 0} slots available`}
                  </span>
                </div>

                {availability?.slots && availability.slots.length > 0 ? (
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
                ) : (
                  <div className="p-2.5 bg-amber-50 rounded-xl text-amber-800 text-xs">
                    No slots currently free. You can directly join the waitlist below!
                  </div>
                )}
              </div>

              {/* Submit Button or Join Waitlist */}
              {availability?.availableCount === 0 ? (
                <button
                  type="button"
                  onClick={() => handleJoinWaitlist()}
                  disabled={waitlistLoading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm shadow-purple-500/20"
                >
                  <ListOrdered className="w-4 h-4" />
                  <span>{waitlistLoading ? 'Joining Waitlist...' : 'Join Waitlist (Auto-Allocate On Next Exit)'}</span>
                </button>
              ) : (
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
              )}
            </form>
          </div>
        )}

        {/* SCREEN: WAITLIST TAB (Feature 1) */}
        {activeTab === 'waitlist' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Society Waitlist</h2>
                <p className="text-xs text-slate-500">Auto-allocated when vehicles leave the building.</p>
              </div>
              <button
                onClick={() => setWaitlistModalOpen(true)}
                className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Join Waitlist</span>
              </button>
            </div>

            {/* Waitlist Explainer */}
            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-900 text-xs">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <SparklesIcon className="w-4 h-4 text-purple-600" />
                <span>How the Waitlist Works</span>
              </div>
              <p className="text-[11px] text-purple-800 leading-relaxed">
                When all visitor bays are occupied, you don't need to keep checking. The moment a car or two-wheeler exits at the security gate, ParkPass auto-promotes the next person in line, reserves the slot, and sends an instant WhatsApp ticket!
              </p>
            </div>

            {/* List of Waitlist Items */}
            {dashboardData?.waitlist && dashboardData.waitlist.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.waitlist.map((item: any) => (
                  <div
                    key={item.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{item.visitorName}</span>
                          {item.status === 'WAITING' ? (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                              #{item.queuePosition || 1} IN QUEUE
                            </span>
                          ) : item.status === 'ALLOCATED' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              ALLOCATED ✓
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {item.status}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span className="font-mono font-semibold text-slate-700">{item.vehicleNumber}</span>
                          <span>•</span>
                          <span>{item.vehicleType}</span>
                          <span>•</span>
                          <span>{item.durationHours}h request</span>
                        </div>
                      </div>

                      {item.status === 'WAITING' && (
                        <button
                          type="button"
                          onClick={() => handleCancelWaitlist(item.id)}
                          className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                      <span>Joined: {new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      {item.status === 'WAITING' && (
                        <span className="text-purple-600 font-bold">Auto-allocator active</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80 shadow-sm text-xs text-slate-400">
                <ListOrdered className="w-8 h-8 mx-auto mb-2 opacity-30 text-purple-500" />
                <p>No active waitlist requests.</p>
                <p className="text-[11px] text-slate-400 mt-1">If parking is full, join here to get next available spot.</p>
              </div>
            )}
          </div>
        )}

        {/* SCREEN 4: MY VISITORS */}
        {activeTab === 'visitors' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900">My Visitors</h2>
              <p className="text-xs text-slate-500">Manage all your visitor passes and parking sessions.</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[
                { key: 'ALL', label: 'All Passes' },
                { key: 'SCHEDULED', label: 'Upcoming' },
                { key: 'CHECKED_IN', label: 'Parked' },
                { key: 'CHECKED_OUT', label: 'Completed' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setVisitorsFilter(tab.key as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    visitorsFilter === tab.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* List */}
            {loadingVisitors ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading visitors...</div>
            ) : allVisitors.length > 0 ? (
              <div className="space-y-2.5">
                {allVisitors.map((pass) => (
                  <div
                    key={pass.id}
                    onClick={() => openPassModal(pass)}
                    className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-blue-400 transition-all cursor-pointer space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{pass.visitorName}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              pass.status === 'CHECKED_IN'
                                ? 'bg-emerald-100 text-emerald-800'
                                : pass.status === 'SCHEDULED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {pass.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span className="font-mono font-semibold text-slate-700">{pass.vehicleNumber}</span>
                          <span>•</span>
                          <span className="font-bold text-blue-600">Slot {pass.parkingSlot?.slotNumber}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {(pass.status === 'SCHEDULED' || pass.status === 'CHECKED_IN') && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOneTapExtend(pass.id, 1);
                            }}
                            className="px-2 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-bold flex items-center gap-1"
                            title="One-Tap Extend Stay"
                          >
                            <Zap className="w-3 h-3 text-amber-600" />
                            <span>Extend</span>
                          </button>
                        )}
                        {pass.status === 'SCHEDULED' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelPass(pass.id);
                            }}
                            className="px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-semibold flex items-center gap-1"
                            title="Cancel Pass & Free Slot"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                            <span>Cancel</span>
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>

                    {/* Arrival Status & Time info */}
                    <div className="text-[11px] text-slate-400 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                      <span>Valid: {new Date(pass.validUntil).toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'short' })}</span>
                      {pass.arrivalStatus && pass.arrivalStatus !== 'SCHEDULED' && (
                        <span className="font-semibold text-blue-600">Status: {pass.arrivalStatus}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80 shadow-sm text-xs text-slate-400">
                <Car className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                <p>No visitor passes found for this filter.</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL: JOIN WAITLIST (Feature 1) */}
      {waitlistModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-slate-900">Join Parking Waitlist</h3>
              <button onClick={() => setWaitlistModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Enter your visitor details. As soon as any vehicle leaves, ParkPass will allocate the slot automatically.
            </p>

            <form onSubmit={handleJoinWaitlist} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Visitor Name *</label>
                <input
                  type="text"
                  required
                  value={waitlistVisitorName}
                  onChange={(e) => setWaitlistVisitorName(e.target.value)}
                  placeholder="Visitor name"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Vehicle Registration Number *</label>
                <input
                  type="text"
                  required
                  value={waitlistVehicle}
                  onChange={(e) => setWaitlistVehicle(e.target.value.toUpperCase())}
                  placeholder="e.g. MH 02 AB 1234"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold uppercase text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Vehicle Type</label>
                  <select
                    value={waitlistVehicleType}
                    onChange={(e) => setWaitlistVehicleType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="CAR">Car</option>
                    <option value="TWO_WHEELER">Two-Wheeler</option>
                    <option value="SUV">SUV</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Duration</label>
                  <select
                    value={waitlistDuration}
                    onChange={(e) => setWaitlistDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value={2}>2 Hours</option>
                    <option value={4}>4 Hours</option>
                    <option value={8}>8 Hours</option>
                    <option value={24}>24 Hours</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={waitlistLoading}
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors shadow-sm"
                >
                  {waitlistLoading ? 'Submitting...' : 'Confirm Waitlist Spot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIGITAL PASS MODAL (Screen 3) */}
      {confirmedPass && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setConfirmedPass(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Visitor Pass Ticket</h3>
              <p className="text-xs text-slate-500">
                Reserved Slot: <strong className="text-blue-600">{confirmedPass.parkingSlot?.slotNumber || confirmedPass.slotNumber}</strong>
              </p>
              {confirmedPass.validUntil && (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Valid until: {new Date(confirmedPass.validUntil).toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'short' })}
                </p>
              )}
            </div>

            {/* QR Code */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center mb-4">
              {confirmedQrUrl ? (
                <img src={confirmedQrUrl} alt="Pass QR" className="w-44 h-44 mx-auto rounded-lg" />
              ) : null}
              <div className="font-mono font-bold text-xs text-slate-800 mt-2">{confirmedPass.passCode}</div>
              <div className="text-[11px] text-slate-500">{confirmedPass.vehicleNumber} • {confirmedPass.visitorName}</div>
            </div>

            {/* Extend Time Options inside Ticket Modal */}
            {(confirmedPass.status === 'SCHEDULED' || confirmedPass.status === 'CHECKED_IN') && (
              <div className="mb-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    Extend Parking Duration
                  </span>
                  <span className="text-[10px] text-amber-700 font-medium">Instant</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 4].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      disabled={extendingPassId === confirmedPass.id}
                      onClick={() => handleOneTapExtend(confirmedPass.id, hrs)}
                      className="py-1.5 px-2 bg-white hover:bg-amber-100/70 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>+{hrs}h</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  window.open(confirmedWaLink, '_blank');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>Share via WhatsApp</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => copyCoordinationLink(confirmedPass.secureToken)}
                  className="py-2 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copiedToken === confirmedPass.secureToken ? 'Copied!' : 'Copy Link'}</span>
                </button>

                <a
                  href={`/pass/${confirmedPass.secureToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 text-center"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Ticket</span>
                </a>
              </div>

              {/* Cancel Button inside Ticket Modal */}
              {confirmedPass.status === 'SCHEDULED' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleCancelPass(confirmedPass.id)}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span>{actionLoading ? 'Cancelling...' : 'Cancel Pass & Free Slot'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION CENTER MODAL */}
      {notificationsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 border border-slate-200 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                  <p className="text-[11px] text-slate-500">Live gate handovers & parking alerts</p>
                </div>
              </div>
              <button
                onClick={() => setNotificationsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {allNotifications.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                  <p>No notifications yet.</p>
                </div>
              ) : (
                allNotifications.map((notif: any) => {
                  const isArrival = notif.type === 'VISITOR_ARRIVED' || notif.title?.includes('Handover') || notif.title?.includes('Visitor Arrived');
                  const isExpiry = notif.type === 'EXPIRING_SOON';
                  return (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-2xl border transition-all text-xs ${
                        isArrival
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                          : isExpiry
                          ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                          : 'bg-slate-50 border-slate-200/80 text-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className={`font-bold text-[11px] uppercase tracking-wide ${
                          isArrival ? 'text-emerald-700' : isExpiry ? 'text-amber-700' : 'text-slate-600'
                        }`}>
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(notif.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed font-medium">
                        {notif.message}
                      </p>
                      {!notif.isRead && (
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleDismissNotification(notif.id)}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 underline"
                          >
                            Mark as read
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">
                {unreadNotifications.length} unread alert{unreadNotifications.length === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
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

          <button
            onClick={() => setActiveTab('visitors')}
            className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${
              activeTab === 'visitors' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Visitors</span>
          </button>

          {/* Elevated Book Button */}
          <button
            onClick={() => setActiveTab('book')}
            className="w-12 h-12 -mt-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 transition-transform active:scale-95"
            title="Book Visitor Parking"
          >
            <PlusCircle className="w-6 h-6" />
          </button>

          {/* Waitlist Tab with counter badge */}
          <button
            onClick={() => setActiveTab('waitlist')}
            className={`flex flex-col items-center gap-1 text-[11px] font-semibold relative transition-colors ${
              activeTab === 'waitlist' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <ListOrdered className="w-5 h-5" />
            <span>Waitlist</span>
            {activeWaitlistCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {activeWaitlistCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SparklesIcon(props: any) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

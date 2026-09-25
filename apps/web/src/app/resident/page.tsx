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
  Layers,
  LayoutGrid,
} from 'lucide-react';

const WALLET_PALETTES = [
  {
    bg: 'from-[#1447db] via-[#103bb2] to-[#0c2e8c]',
    border: 'border-blue-400/35',
    shadow: 'shadow-blue-600/30',
    accent: 'text-blue-200',
    tag: 'bg-white/20 text-white',
    notchColor: '#070a12',
  },
  {
    bg: 'from-[#1f2127] via-[#16171b] to-[#0d0e11]',
    border: 'border-white/25',
    shadow: 'shadow-black/60',
    accent: 'text-zinc-300',
    tag: 'bg-white/15 text-white',
    notchColor: '#070a12',
  },
  {
    bg: 'from-[#4e152e] via-[#380e20] to-[#210612]',
    border: 'border-rose-400/35',
    shadow: 'shadow-rose-900/40',
    accent: 'text-rose-200',
    tag: 'bg-white/20 text-white',
    notchColor: '#070a12',
  },
  {
    bg: 'from-[#0b3d2e] via-[#082a20] to-[#041510]',
    border: 'border-emerald-400/35',
    shadow: 'shadow-emerald-900/40',
    accent: 'text-emerald-200',
    tag: 'bg-emerald-500/30 text-emerald-100',
    notchColor: '#070a12',
  },
  {
    bg: 'from-[#4d3209] via-[#362204] to-[#1e1302]',
    border: 'border-amber-400/35',
    shadow: 'shadow-amber-900/40',
    accent: 'text-amber-200',
    tag: 'bg-amber-500/30 text-amber-100',
    notchColor: '#070a12',
  },
];

export default function ResidentPortal() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Navigation: 'home', 'book', 'visitors', 'waitlist'
  const [activeTab, setActiveTab] = useState<'home' | 'book' | 'visitors' | 'waitlist'>('home');
  const [walletViewMode, setWalletViewMode] = useState<'stack' | 'grid'>('stack');

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
    <div className="min-h-screen ambient-glow text-white pb-32 selection:bg-blue-500 selection:text-white">
      <div className="max-w-md mx-auto px-4 pt-5 pb-6">

        {/* 1. THE VISITOR HANDOVER: Real-time Arrival Alert Banner ("Your visitor has arrived.") */}
        {arrivalNotifications.length > 0 && (
          <div className="mb-4 liquid-glass-dark bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-emerald-900/80 rounded-3xl p-4 text-white shadow-2xl border border-emerald-500/40 animate-in fade-in duration-300">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 backdrop-blur flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 animate-pulse" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-400">
                    The Visitor Handover
                  </div>
                  <h4 className="text-sm font-extrabold leading-tight text-white">
                    Your visitor has arrived!
                  </h4>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                Gate Entry Verified
              </span>
            </div>

            {arrivalNotifications.map((notif: any) => (
              <div key={notif.id} className="mt-2 bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-emerald-500/20">
                <p className="text-xs font-medium text-emerald-100 mb-2 leading-relaxed">
                  {notif.message}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-emerald-400/80 font-medium">
                    {new Date(notif.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDismissNotification(notif.id)}
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl active:scale-95 transition-all shadow-md"
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
          <div className="mb-4 liquid-glass-dark bg-gradient-to-r from-amber-950/80 via-orange-950/80 to-amber-900/80 rounded-3xl p-4 text-white shadow-2xl border border-amber-500/40 animate-in fade-in duration-300">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 backdrop-blur flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-extrabold text-amber-300">
                    One-Tap Visitor Extension
                  </div>
                  <h4 className="text-sm font-extrabold leading-tight text-white">
                    Parking Expires in ~15 Minutes!
                  </h4>
                </div>
              </div>
            </div>

            {expiringPasses.map((expPass: any) => (
              <div key={expPass.id} className="mt-2 bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-amber-500/20">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-amber-200">{expPass.visitorName} ({expPass.vehicleNumber})</span>
                  <span className="font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px]">
                    Slot {expPass.parkingSlot?.slotNumber}
                  </span>
                </div>
                <p className="text-[11px] text-amber-100/80 mb-2.5">
                  Valid until {new Date(expPass.validUntil).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}. Tap below to extend instantly without calling security:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 4].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      disabled={extendingPassId === expPass.id}
                      onClick={() => handleOneTapExtend(expPass.id, hrs)}
                      className="py-1.5 px-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl active:scale-95 transition-all shadow-md flex items-center justify-center gap-1"
                    >
                      <Zap className="w-3 h-3 text-slate-950" />
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
                <h1 className="text-xl font-black text-white tracking-tight">
                  Good morning, {user.name}
                </h1>
                <p className="text-xs text-white/60 font-medium">{currentDateStr}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSimulateHandover()}
                  disabled={simulatingHandover}
                  className="px-2.5 py-1.5 rounded-xl liquid-pill text-emerald-400 border border-emerald-500/30 hover:border-emerald-400/60 text-[10px] font-bold flex items-center gap-1 transition-all"
                  title="Simulate 'Your visitor has arrived' notification"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Arrival</span>
                </button>
                <button
                  onClick={() => handleSimulateExpiry()}
                  disabled={simulatingExpiry}
                  className="px-2.5 py-1.5 rounded-xl liquid-pill text-amber-400 border border-amber-500/30 hover:border-amber-400/60 text-[10px] font-bold flex items-center gap-1 transition-all"
                  title="Simulate 15-Minute Expiry Alert"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Expiry</span>
                </button>
                {/* Notification Bell */}
                <button
                  onClick={() => setNotificationsOpen(true)}
                  className="w-8 h-8 rounded-full liquid-glass border border-white/15 flex items-center justify-center text-white/80 hover:text-white transition-all relative"
                  title="Notification Center"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-sm">
                      {unreadNotifications.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={loadDashboard}
                  className="w-8 h-8 rounded-full liquid-glass border border-white/15 flex items-center justify-center text-white/80 hover:text-white transition-all"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingDashboard ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Hero Card: Expecting a visitor? */}
            <div className="liquid-glass-dark rounded-3xl p-5 border border-white/15 shadow-xl relative overflow-hidden">
              <div className="max-w-[70%] relative z-10">
                <span className="text-[10px] font-extrabold tracking-widest uppercase text-blue-400 mb-1 block">
                  INSTANT PASS ISSUANCE
                </span>
                <h2 className="text-base font-extrabold text-white mb-1">Expecting a visitor?</h2>
                <p className="text-xs text-white/70 mb-4 leading-relaxed">
                  Pre-book visitor parking in seconds with smart arrival coordination.
                </p>
                <button
                  onClick={() => setActiveTab('book')}
                  className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/30 active:scale-95"
                >
                  <span>Book Parking</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="absolute right-3 bottom-2 w-24 h-24 rounded-3xl bg-blue-500/10 border border-blue-400/20 text-blue-400 flex items-center justify-center pointer-events-none backdrop-blur-md">
                <Car className="w-12 h-12 opacity-80" />
              </div>
            </div>

            {/* Quick Stat Counter Pills Row */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="liquid-glass p-3 rounded-2xl border border-white/10">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[11px] font-semibold text-white/70">Parked</span>
                </div>
                <div className="text-xl font-black text-white">
                  {dashboardData?.stats?.activeVisitors ?? 0}
                </div>
              </div>

              <div className="liquid-glass p-3 rounded-2xl border border-white/10">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span className="text-[11px] font-semibold text-white/70">Upcoming</span>
                </div>
                <div className="text-xl font-black text-white">
                  {dashboardData?.stats?.upcomingArrivals ?? 0}
                </div>
              </div>

              <div
                onClick={() => setActiveTab('waitlist')}
                className="liquid-glass p-3 rounded-2xl border border-purple-400/30 cursor-pointer hover:border-purple-400/60 transition-colors"
              >
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  <span className="text-[11px] font-bold text-purple-300">Waitlist</span>
                </div>
                <div className="text-xl font-black text-purple-200">
                  {activeWaitlistCount}
                </div>
              </div>
            </div>

            {/* Waitlist Banner Card if resident has entries */}
            {activeWaitlistCount > 0 && (
              <div
                onClick={() => setActiveTab('waitlist')}
                className="liquid-glass border border-purple-400/40 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-600/80 text-white flex items-center justify-center font-bold text-xs">
                    <ListOrdered className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-purple-200">Society Parking Waitlist</div>
                    <div className="text-[11px] text-purple-300/80">You have {activeWaitlistCount} vehicle(s) in queue for freed slots</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-400" />
              </div>
            )}

            {/* APPLE WALLET PASS STACK SECTION */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-white tracking-tight">Wallet Passes</h3>
                  <p className="text-[11px] text-white/60">Tap any pass to view boarding details & QR</p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Segmented View Switcher (Stack vs Grid) */}
                  <div className="flex items-center p-0.5 rounded-xl liquid-pill border border-white/15 text-xs">
                    <button
                      type="button"
                      onClick={() => setWalletViewMode('stack')}
                      className={`p-1.5 rounded-lg transition-all ${
                        walletViewMode === 'stack' ? 'bg-white/20 text-white shadow-sm' : 'text-white/50 hover:text-white'
                      }`}
                      title="Stack View"
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setWalletViewMode('grid')}
                      className={`p-1.5 rounded-lg transition-all ${
                        walletViewMode === 'grid' ? 'bg-white/20 text-white shadow-sm' : 'text-white/50 hover:text-white'
                      }`}
                      title="Grid View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => setActiveTab('visitors')}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    View all
                  </button>
                </div>
              </div>

              {/* Passes Cards (Apple Wallet Stack) */}
              {(() => {
                const activeSessionPasses = (dashboardData?.activeSessions || []).map((s: any) => ({
                  ...s.pass,
                  isParked: true,
                  sessionId: s.id,
                  parkingSlot: s.parkingSlot,
                }));
                const upcomingPassesList = (dashboardData?.upcomingPasses || []).filter(
                  (p: any) => !activeSessionPasses.some((ap: any) => ap.id === p.id)
                );
                const liveWalletPasses = [...activeSessionPasses, ...upcomingPassesList];

                if (liveWalletPasses.length === 0) {
                  return (
                    <div className="liquid-glass rounded-3xl p-8 text-center text-xs text-white/60 border border-white/10">
                      <div className="w-12 h-12 rounded-2xl liquid-pill flex items-center justify-center mx-auto mb-3 text-white/40">
                        <Car className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-white/80 text-sm">Your Wallet is Empty</p>
                      <p className="text-[11px] text-white/50 mt-1">No active visitor parking passes scheduled today.</p>
                      <button
                        onClick={() => setActiveTab('book')}
                        className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/25 inline-flex items-center gap-1.5"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Issue First Visitor Pass</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div className={walletViewMode === 'stack' ? 'relative pb-16' : 'space-y-3.5'}>
                    {liveWalletPasses.map((pass: any, index: number) => {
                      const palette = WALLET_PALETTES[index % WALLET_PALETTES.length];
                      const isCheckedIn = pass.isParked || pass.status === 'CHECKED_IN';
                      const arrivalTime = new Date(pass.validFrom).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const validUntilTime = new Date(pass.validUntil).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <div
                          key={pass.id}
                          onClick={() => openPassModal(pass)}
                          style={{
                            zIndex: index + 10,
                          }}
                          className={`group relative cursor-pointer rounded-[1.8rem] bg-gradient-to-br ${palette.bg} border ${palette.border} p-5 text-white transition-all duration-300 hover:shadow-2xl ${palette.shadow} ${
                            walletViewMode === 'stack'
                              ? index === 0
                                ? 'mt-0 hover:-translate-y-2'
                                : '-mt-16 sm:-mt-20 hover:-translate-y-6'
                              : 'hover:scale-[1.01]'
                          }`}
                        >
                          {/* Specular top highlight */}
                          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"></div>

                          {/* Card Top Ribbon */}
                          <div className="flex items-center justify-between pb-3 border-b border-white/15 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold tracking-widest text-[10px] uppercase text-white/80">
                                {pass.visitorCategory || 'VISITOR PASS'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-white/15 text-white">
                                {pass.passCode}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {isCheckedIn ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-400/25 text-emerald-200 border border-emerald-400/40">
                                  PARKED
                                </span>
                              ) : pass.arrivalStatus === 'ARRIVED' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-400/25 text-emerald-200 border border-emerald-400/40 animate-pulse">
                                  AT GATE ✓
                                </span>
                              ) : pass.arrivalStatus === 'ON_THE_WAY' ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-400/25 text-blue-200 border border-blue-400/40">
                                  ON WAY (~{pass.etaMinutes || 15}m)
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/15 text-white/90">
                                  SCHEDULED
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Parking Bay & Validity Row */}
                          <div className="py-3.5 flex items-center justify-between">
                            <div>
                              <div className="text-[10px] uppercase tracking-widest font-extrabold text-white/70">
                                RESERVED PARKING BAY
                              </div>
                              <div className="text-2xl font-black text-amber-300 tracking-tight mt-0.5">
                                {pass.parkingSlot?.slotNumber || pass.slotNumber || 'P-01'}
                              </div>
                              <div className="text-[11px] font-medium text-white/80">
                                {pass.parkingSlot?.zone || 'MAIN DECK'} • {pass.parkingSlot?.parkingType || 'RESERVED'}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-[9px] uppercase tracking-wider font-extrabold text-white/60">
                                VALIDITY
                              </div>
                              <div className="text-xs font-black text-white mt-0.5">
                                UNTIL {validUntilTime}
                              </div>
                              <div className="text-[10px] font-medium text-white/70 mt-0.5">
                                Expected: {arrivalTime}
                              </div>
                            </div>
                          </div>

                          {/* Visitor Info & Action Bottom Row */}
                          <div className="pt-2.5 border-t border-white/15 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-extrabold tracking-tight text-sm text-white uppercase">
                                {pass.visitorName}
                              </div>
                              <div className="text-[11px] font-mono text-white/70">
                                {pass.vehicleNumber} • {pass.vehicleType || 'CAR'}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOneTapExtend(pass.id, 1);
                                }}
                                className="px-2.5 py-1 rounded-xl liquid-pill hover:bg-white/20 text-white font-extrabold text-[11px] flex items-center gap-1 transition-all active:scale-95"
                                title="Extend parking by 1 hour"
                              >
                                <Zap className="w-3 h-3 text-amber-300" />
                                <span>+1h</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPassModal(pass);
                                }}
                                className="px-2.5 py-1 rounded-xl bg-white text-slate-900 font-extrabold text-[11px] flex items-center gap-1 shadow-md transition-all active:scale-95"
                              >
                                <QrCode className="w-3 h-3 text-slate-900" />
                                <span>Pass</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* SCREEN 2: BOOK VISITOR PARKING */}
        {activeTab === 'book' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Top Navigation */}
            <div className="flex items-center justify-between pb-1">
              <button
                onClick={() => setActiveTab('home')}
                className="flex items-center gap-1.5 text-xs font-bold text-white/70 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <h2 className="text-sm font-extrabold text-white tracking-wide">Issue Visitor Pass</h2>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full liquid-pill text-blue-400 border border-blue-500/30">Step 1 of 3</span>
            </div>

            {/* Parking Full Waitlist Option (Feature 1) */}
            {bookingError && (
              <div className="p-4 rounded-3xl liquid-glass-dark border border-amber-500/40 text-amber-200 text-xs space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{bookingError}</span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  All visitor parking slots are full for this requested duration. Instead of turning your guest away, join the <strong>Society Parking Waitlist</strong> to be automatically allocated the next freed bay when a vehicle exits!
                </p>
                <button
                  type="button"
                  onClick={() => handleJoinWaitlist()}
                  disabled={waitlistLoading}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-purple-600/30"
                >
                  <ListOrdered className="w-4 h-4" />
                  <span>{waitlistLoading ? 'Joining Waitlist...' : 'Join Waitlist for this Visitor'}</span>
                </button>
              </div>
            )}

            <form onSubmit={handleCreatePass} className="space-y-4">
              {/* 1. Visitor Section */}
              <div className="liquid-glass-dark rounded-3xl p-5 border border-white/10 shadow-xl space-y-3.5 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-white/90 uppercase tracking-widest">1. Visitor Details</span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Guest Info</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-white/70 mb-1">
                    Visitor full name *
                  </label>
                  <input
                    type="text"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="e.g. Siddhant"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-white/70 mb-1">
                    Visitor mobile number (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    placeholder="+91 99887 76655"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-white/70 mb-1.5">
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          visitorCategory === cat.key
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                            : 'liquid-pill text-white/70 hover:text-white border border-white/10'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Vehicle Section */}
              <div className="liquid-glass-dark rounded-3xl p-5 border border-white/10 shadow-xl space-y-3.5 backdrop-blur-xl">
                <span className="text-[11px] font-extrabold text-white/90 uppercase tracking-widest block">
                  2. Vehicle Particulars
                </span>

                <div>
                  <label className="block text-[11px] font-semibold text-white/70 mb-1">
                    Vehicle registration number *
                  </label>
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. MH 12 AB 1122"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs font-mono font-bold uppercase text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tracking-wider transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-white/70 mb-1.5">
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
                        className={`py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                          vehicleType === type.key
                            ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
                            : 'liquid-pill text-white/70 hover:text-white border-white/10'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Schedule Section */}
              <div className="liquid-glass-dark rounded-3xl p-5 border border-white/10 shadow-xl space-y-3.5 backdrop-blur-xl">
                <span className="text-[11px] font-extrabold text-white/90 uppercase tracking-widest block">
                  3. Arrival Schedule & Duration
                </span>

                <div>
                  <label className="block text-[11px] font-semibold text-white/70 mb-1">
                    Expected arrival date & time *
                  </label>
                  <input
                    type="datetime-local"
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all [color-scheme:dark]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-white/70 mb-1.5">
                    Parking duration
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 3, 6, 12, 24].map((hrs) => (
                      <button
                        key={hrs}
                        type="button"
                        onClick={() => setDurationHours(hrs)}
                        className={`py-2 text-xs font-extrabold rounded-xl border transition-all ${
                          durationHours === hrs
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                            : 'liquid-pill text-white/70 hover:text-white border-white/10'
                        }`}
                      >
                        {hrs}h
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-2xl liquid-glass border border-white/10 text-[11px] text-white/70 flex justify-between items-center">
                  <span>Reserved until:</span>
                  <span className="font-extrabold text-white">{departureFormatted}</span>
                </div>
              </div>

              {/* 4. Parking Allocation Preview */}
              <div className="liquid-glass-dark rounded-3xl p-5 border border-white/10 shadow-xl space-y-2.5 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-white/90 uppercase tracking-widest">
                    4. Bay Assignment
                  </span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                    availability?.availableCount > 0 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {checkingAvailability ? 'Checking...' : `${availability?.availableCount ?? 0} bays free`}
                  </span>
                </div>

                {availability?.slots && availability.slots.length > 0 ? (
                  <select
                    value={preferredSlotId}
                    onChange={(e) => setPreferredSlotId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all [color-scheme:dark]"
                  >
                    <option value="">Auto-Assign Optimal Bay (Fastest entry)</option>
                    {availability.slots.map((s: any) => (
                      <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                        {s.slotNumber} ({s.parkingType}) — {s.zone}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 rounded-2xl liquid-glass border border-amber-500/30 text-amber-300 text-xs">
                    No bays currently free. You can directly join the waitlist below!
                  </div>
                )}
              </div>

              {/* Submit Button or Join Waitlist */}
              {availability?.availableCount === 0 ? (
                <button
                  type="button"
                  onClick={() => handleJoinWaitlist()}
                  disabled={waitlistLoading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-xl shadow-purple-600/30 active:scale-95"
                >
                  <ListOrdered className="w-4 h-4" />
                  <span>{waitlistLoading ? 'Joining Waitlist...' : 'Join Waitlist (Auto-Allocate On Next Exit)'}</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 disabled:opacity-60 active:scale-95"
                >
                  {bookingLoading ? (
                    <span>Allocating Bay & Generating Pass...</span>
                  ) : (
                    <>
                      <span>Issue Apple Wallet Pass</span>
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
                <h2 className="text-xl font-black text-white tracking-tight">Society Waitlist</h2>
                <p className="text-xs text-white/60">Auto-allocated when vehicles leave the building.</p>
              </div>
              <button
                onClick={() => setWaitlistModalOpen(true)}
                className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Join Waitlist</span>
              </button>
            </div>

            {/* Waitlist Explainer */}
            <div className="p-4 rounded-3xl liquid-glass-dark border border-purple-500/30 text-purple-200 text-xs shadow-xl">
              <div className="flex items-center gap-2 font-black text-purple-300 mb-1.5">
                <SparklesIcon className="w-4 h-4 text-purple-400" />
                <span>How the Waitlist Works</span>
              </div>
              <p className="text-[11px] text-purple-200/80 leading-relaxed">
                When all visitor bays are occupied, you don't need to keep checking. The moment a car or two-wheeler exits at the security gate, ParkPass auto-promotes the next person in line, reserves the slot, and sends an instant WhatsApp ticket!
              </p>
            </div>

            {/* List of Waitlist Items */}
            {dashboardData?.waitlist && dashboardData.waitlist.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.waitlist.map((item: any) => (
                  <div
                    key={item.id}
                    className="liquid-glass-dark p-4 rounded-3xl border border-white/10 shadow-xl space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-sm">{item.visitorName}</span>
                          {item.status === 'WAITING' ? (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                              #{item.queuePosition || 1} IN QUEUE
                            </span>
                          ) : item.status === 'ALLOCATED' ? (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              ALLOCATED ✓
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full liquid-pill text-white/70">
                              {item.status}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-white/60 mt-1 flex items-center gap-2">
                          <span className="font-mono font-bold text-white tracking-wider">{item.vehicleNumber}</span>
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
                          className="px-2.5 py-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl text-xs font-bold transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] text-white/40 pt-2 border-t border-white/10 flex items-center justify-between">
                      <span>Joined: {new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      {item.status === 'WAITING' && (
                        <span className="text-purple-400 font-bold">Auto-allocator active</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="liquid-glass-dark rounded-3xl p-8 text-center border border-white/10 shadow-xl text-xs text-white/50">
                <ListOrdered className="w-8 h-8 mx-auto mb-2 opacity-40 text-purple-400" />
                <p className="font-bold text-white/70">No active waitlist requests.</p>
                <p className="text-[11px] text-white/40 mt-1">If parking is full, join here to get next available spot.</p>
              </div>
            )}
          </div>
        )}

        {/* SCREEN 4: MY VISITORS */}
        {activeTab === 'visitors' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">My Visitors</h2>
              <p className="text-xs text-white/60">Manage all your visitor passes and parking sessions.</p>
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    visitorsFilter === tab.key
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'liquid-pill text-white/70 hover:text-white border border-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* List */}
            {loadingVisitors ? (
              <div className="py-12 text-center text-xs text-white/50">Loading visitors...</div>
            ) : allVisitors.length > 0 ? (
              <div className="space-y-3">
                {allVisitors.map((pass) => (
                  <div
                    key={pass.id}
                    onClick={() => openPassModal(pass)}
                    className="liquid-glass-dark p-4 rounded-3xl border border-white/10 hover:border-blue-500/50 shadow-xl transition-all cursor-pointer space-y-3 group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-sm group-hover:text-blue-300 transition-colors">{pass.visitorName}</span>
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                              pass.status === 'CHECKED_IN'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : pass.status === 'SCHEDULED'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                : 'bg-white/10 text-white/70 border-white/10'
                            }`}
                          >
                            {pass.status}
                          </span>
                        </div>
                        <div className="text-xs text-white/60 mt-1 flex items-center gap-2">
                          <span className="font-mono font-bold text-white tracking-wider">{pass.vehicleNumber}</span>
                          <span>•</span>
                          <span className="font-extrabold text-blue-400">Bay {pass.parkingSlot?.slotNumber}</span>
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
                            className="px-2.5 py-1.5 liquid-pill bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all"
                            title="One-Tap Extend Stay"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
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
                            className="px-2.5 py-1.5 liquid-pill text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                            title="Cancel Pass & Free Slot"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            <span>Cancel</span>
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                      </div>
                    </div>

                    {/* Arrival Status & Time info */}
                    <div className="text-[11px] text-white/40 pt-2 border-t border-white/10 flex items-center justify-between">
                      <span>Valid: {new Date(pass.validUntil).toLocaleString('en-IN', { timeStyle: 'short', dateStyle: 'short' })}</span>
                      {pass.arrivalStatus && pass.arrivalStatus !== 'SCHEDULED' && (
                        <span className="font-extrabold text-blue-400">Status: {pass.arrivalStatus}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="liquid-glass-dark rounded-3xl p-8 text-center border border-white/10 shadow-xl text-xs text-white/50">
                <Car className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-400" />
                <p className="font-bold text-white/70">No visitor passes found for this filter.</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL: JOIN WAITLIST (Feature 1) */}
      {waitlistModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-dark rounded-3xl max-w-sm w-full p-6 border border-white/15 shadow-2xl relative text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-black text-white tracking-wide">Join Parking Waitlist</h3>
              <button 
                onClick={() => setWaitlistModalOpen(false)} 
                className="w-8 h-8 rounded-full liquid-glass border border-white/10 flex items-center justify-center text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-white/60 mb-4 leading-relaxed">
              Enter visitor details. The moment any bay frees up at the security gate, ParkPass auto-promotes you and sends an instant WhatsApp pass.
            </p>

            <form onSubmit={handleJoinWaitlist} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-white/70 block mb-1">Visitor Name *</label>
                <input
                  type="text"
                  required
                  value={waitlistVisitorName}
                  onChange={(e) => setWaitlistVisitorName(e.target.value)}
                  placeholder="Visitor name"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="font-semibold text-white/70 block mb-1">Vehicle Registration Number *</label>
                <input
                  type="text"
                  required
                  value={waitlistVehicle}
                  onChange={(e) => setWaitlistVehicle(e.target.value.toUpperCase())}
                  placeholder="e.g. MH 02 AB 1234"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 font-mono font-bold uppercase text-white placeholder-white/30 tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-white/70 block mb-1">Vehicle Type</label>
                  <select
                    value={waitlistVehicleType}
                    onChange={(e) => setWaitlistVehicleType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 [color-scheme:dark]"
                  >
                    <option value="CAR">Car</option>
                    <option value="TWO_WHEELER">Two-Wheeler</option>
                    <option value="SUV">SUV</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-white/70 block mb-1">Duration</label>
                  <select
                    value={waitlistDuration}
                    onChange={(e) => setWaitlistDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 [color-scheme:dark]"
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
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-purple-600/30 active:scale-95"
                >
                  {waitlistLoading ? 'Submitting...' : 'Confirm Waitlist Spot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPLE WALLET BOARDING PASS MODAL */}
      {confirmedPass && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-sm w-full relative max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200">
            {/* The Apple Wallet / Southwest Boarding Pass Card */}
            <div className="relative bg-gradient-to-br from-[#0c2f82] via-[#0047bb] to-[#0a2366] text-white rounded-3xl overflow-hidden border border-blue-400/30 shadow-2xl">
              
              {/* Close Button Floating */}
              <button
                onClick={() => setConfirmedPass(null)}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur border border-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Pass Header */}
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
                      <Car className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-base font-black tracking-tight text-white block leading-none">
                        ParkPass
                      </span>
                      <span className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">
                        Priority Pass
                      </span>
                    </div>
                  </div>
                  <div className="text-right pr-8">
                    <div className="text-xs font-mono font-black text-white/90">
                      {confirmedPass.passCode}
                    </div>
                    <div className="text-[10px] text-white/70 uppercase">
                      {confirmedPass.parkingSlot?.zone || 'MAIN DECK'}
                    </div>
                  </div>
                </div>

                {/* Parking Bay Hero Section */}
                <div className="mt-5 border-y border-white/15 py-3.5">
                  <div className="liquid-glass rounded-2xl p-4 border border-white/20 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-extrabold text-blue-200 uppercase tracking-widest">
                        ALLOCATED PARKING BAY
                      </div>
                      <div className="text-3xl font-black text-amber-300 tracking-tight mt-0.5">
                        {confirmedPass.parkingSlot?.slotNumber || confirmedPass.slotNumber}
                      </div>
                      <div className="text-[11px] text-white/80 font-medium">
                        {confirmedPass.parkingSlot?.zone || 'MAIN DECK'} • {confirmedPass.parkingSlot?.parkingType || 'RESERVED'}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
                        STATUS
                      </div>
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase">
                        {confirmedPass.status || 'CONFIRMED'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Passenger Name & Pills */}
                <div className="mt-4">
                  <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                    VISITOR / GUEST
                  </div>
                  <div className="text-lg font-black tracking-tight uppercase mt-0.5">
                    {confirmedPass.visitorName}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="px-2.5 py-0.5 rounded-lg liquid-pill text-[10px] font-extrabold uppercase border border-white/20">
                      {confirmedPass.vehicleType || '4-WHEELER'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg liquid-pill text-[10px] font-extrabold uppercase border border-white/20">
                      {confirmedPass.vehicleNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase">
                      PRE-APPROVED
                    </span>
                  </div>
                </div>

                {/* Boarding Specs Grid */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/15 text-center">
                  <div>
                    <div className="text-[9px] font-bold text-white/60 uppercase">VALID UNTIL</div>
                    <div className="text-xs font-black mt-0.5">
                      {confirmedPass.validUntil
                        ? new Date(confirmedPass.validUntil).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        : 'Active'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-white/60 uppercase">PASS TYPE</div>
                    <div className="text-xs font-black mt-0.5">VIP PASS</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-white/60 uppercase">BAY #</div>
                    <div className="text-xs font-black text-amber-300 mt-0.5">
                      {confirmedPass.parkingSlot?.slotNumber || confirmedPass.slotNumber}
                    </div>
                  </div>
                </div>
              </div>

              {/* TICKET PERFORATION & CUTOUT NOTCHES */}
              <div className="relative my-1">
                <div className="ticket-notch-left"></div>
                <div className="ticket-notch-right"></div>
                <div className="border-t-2 border-dashed border-white/20 mx-8"></div>
              </div>

              {/* QR Section */}
              <div className="px-6 pt-3 pb-6 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-[10px] font-extrabold text-white mb-3">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>PARKPASS SECURITY VERIFIED ✓</span>
                </div>

                <div className="bg-white rounded-3xl p-4 inline-block shadow-2xl mx-auto">
                  {confirmedQrUrl ? (
                    <img src={confirmedQrUrl} alt="Pass QR" className="w-44 h-44 mx-auto rounded-xl" />
                  ) : null}
                  <div className="mt-2 text-center">
                    <span className="font-mono font-black text-slate-950 text-xs tracking-widest block">
                      {confirmedPass.passCode}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Present at gate scanner for contactless barrier opening
                    </span>
                  </div>
                </div>

                {/* Instant Extend Buttons */}
                {(confirmedPass.status === 'SCHEDULED' || confirmedPass.status === 'CHECKED_IN') && (
                  <div className="mt-4 p-3 rounded-2xl liquid-glass border border-white/20">
                    <div className="flex items-center justify-between text-xs font-extrabold text-amber-300 mb-2">
                      <span className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Extend Duration
                      </span>
                      <span className="text-[10px] font-semibold text-white/70">One-Tap</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 4].map((hrs) => (
                        <button
                          key={hrs}
                          type="button"
                          disabled={extendingPassId === confirmedPass.id}
                          onClick={() => handleOneTapExtend(confirmedPass.id, hrs)}
                          className="py-1.5 px-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl active:scale-95 transition-all shadow-md flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <Zap className="w-3 h-3 text-slate-950" />
                          <span>+{hrs}h</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pass Actions */}
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.open(confirmedWaLink, '_blank');
                    }}
                    className="w-full py-3 px-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>Share Pass via WhatsApp</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => copyCoordinationLink(confirmedPass.secureToken)}
                      className="py-2.5 px-3 rounded-xl liquid-glass border border-white/20 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-white/20 transition-all active:scale-95"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedToken === confirmedPass.secureToken ? 'Copied!' : 'Copy Link'}</span>
                    </button>

                    <a
                      href={`/pass/${confirmedPass.secureToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl liquid-glass border border-white/20 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-white/20 transition-all active:scale-95 text-center"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Ticket</span>
                    </a>
                  </div>

                  {confirmedPass.status === 'SCHEDULED' && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleCancelPass(confirmedPass.id)}
                      className="w-full mt-1 py-2.5 px-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      <span>{actionLoading ? 'Cancelling...' : 'Cancel Pass & Free Bay'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION CENTER MODAL */}
      {notificationsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-dark rounded-3xl max-w-sm w-full p-5 border border-white/15 shadow-2xl relative max-h-[85vh] flex flex-col text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Live Notifications</h3>
                  <p className="text-[11px] text-white/60">Gate handovers & parking alerts</p>
                </div>
              </div>
              <button
                onClick={() => setNotificationsOpen(false)}
                className="w-7 h-7 rounded-full liquid-glass border border-white/10 flex items-center justify-center text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {allNotifications.length === 0 ? (
                <div className="text-center py-8 text-white/40 text-xs">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-white" />
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
                          ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-200'
                          : isExpiry
                          ? 'bg-amber-950/60 border-amber-500/30 text-amber-200'
                          : 'liquid-glass border-white/10 text-white/90'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className={`font-black text-[10px] uppercase tracking-wider ${
                          isArrival ? 'text-emerald-400' : isExpiry ? 'text-amber-400' : 'text-blue-400'
                        }`}>
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-white/40 font-mono">
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
                            className="text-[10px] font-bold text-white/60 hover:text-white underline"
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

            <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-white/50 text-[11px]">
                {unreadNotifications.length} unread alert{unreadNotifications.length === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                className="py-1.5 px-3 rounded-xl liquid-glass border border-white/20 text-white font-extrabold text-xs hover:bg-white/20 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING LIQUID GLASS BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40">
        <div className="liquid-glass-dark rounded-3xl p-2 border border-white/15 shadow-2xl backdrop-blur-2xl flex items-center justify-around">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 text-[11px] font-bold py-1 px-3 rounded-2xl transition-all ${
              activeTab === 'home'
                ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40 shadow-inner'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveTab('visitors')}
            className={`flex flex-col items-center gap-1 text-[11px] font-bold py-1 px-3 rounded-2xl transition-all ${
              activeTab === 'visitors'
                ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40 shadow-inner'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Visitors</span>
          </button>

          {/* Elevated Book Button */}
          <button
            onClick={() => setActiveTab('book')}
            className="w-12 h-12 -mt-6 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-xl shadow-blue-600/40 border-2 border-white/20 transition-transform active:scale-95"
            title="Book Visitor Parking"
          >
            <PlusCircle className="w-6 h-6" />
          </button>

          {/* Waitlist Tab with counter badge */}
          <button
            onClick={() => setActiveTab('waitlist')}
            className={`flex flex-col items-center gap-1 text-[11px] font-bold py-1 px-3 rounded-2xl relative transition-all ${
              activeTab === 'waitlist'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-inner'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <ListOrdered className="w-5 h-5" />
            <span>Waitlist</span>
            {activeWaitlistCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md">
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

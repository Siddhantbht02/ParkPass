'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchApi } from '@/lib/api';
import {
  QrCode,
  UserPlus,
  Car,
  History,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Clock,
  Building,
  Camera,
  StopCircle,
  RefreshCw,
  LogOut,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Home,
  Check,
  X,
  Phone,
  Trash2,
  Navigation,
  Compass,
  ListOrdered,
} from 'lucide-react';

export default function GuardTerminal() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Active view: 'home' (Screen 5), 'scan' (Screen 6), 'active' (Screen 7), 'walkin' (Screen 8), 'history'
  const [activeTab, setActiveTab] = useState<'home' | 'scan' | 'active' | 'walkin' | 'history'>('home');

  // Guard Dashboard summary
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [selectedGate, setSelectedGate] = useState<string>('Main Gate');

  // Screen 6: Scanner & Verification State
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [confirmingEntry, setConfirmingEntry] = useState(false);
  const scannerRef = useRef<any>(null);

  // Screen 7: Active Parking & Checkout State
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [activeSearch, setActiveSearch] = useState('');
  const [loadingActive, setLoadingActive] = useState(false);
  const [checkoutModalSession, setCheckoutModalSession] = useState<any>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  // Screen 8: Walk-in State
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinVehicle, setWalkinVehicle] = useState('');
  const [walkinFlatId, setWalkinFlatId] = useState('');
  const [walkinVehicleType, setWalkinVehicleType] = useState('CAR');
  const [walkinCategory, setWalkinCategory] = useState('GUEST');
  const [walkinDuration, setWalkinDuration] = useState(4);
  const [availableFlats, setAvailableFlats] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [walkinLoading, setWalkinLoading] = useState(false);
  const [walkinMessage, setWalkinMessage] = useState<string | null>(null);

  // History State
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Load Dashboard Data
  const loadDashboard = async () => {
    try {
      const data = await fetchApi('/api/v1/guard/dashboard');
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load guard dashboard:', err);
    }
  };

  // Load Active Parking
  const loadActiveParking = async () => {
    try {
      setLoadingActive(true);
      const data = await fetchApi(`/api/v1/guard/active-parking?search=${encodeURIComponent(activeSearch)}`);
      setActiveSessions(data.sessions || []);
    } catch (err) {
      console.error('Failed to load active parking:', err);
    } finally {
      setLoadingActive(false);
    }
  };

  // Load History
  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await fetchApi('/api/v1/guard/entry-history');
      setHistoryList(data.sessions || []);
    } catch (err) {
      console.error('Failed to load entry history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load Flats & Available Slots for Walk-in
  const loadFlatsAndSlots = async () => {
    try {
      const [flatsData, slotsData] = await Promise.all([
        fetchApi('/api/v1/admin/flats'),
        fetchApi('/api/v1/resident/parking-availability?durationHours=4'),
      ]);
      setAvailableFlats(flatsData.flats || []);
      if (flatsData.flats?.length > 0 && !walkinFlatId) {
        setWalkinFlatId(flatsData.flats[0].id);
      }
      setAvailableSlots(slotsData.slots || []);
    } catch (err) {
      console.error('Failed to load flats & slots:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboard();
      loadFlatsAndSlots();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'active') {
      loadActiveParking();
    } else if (activeTab === 'history') {
      loadHistory();
    } else if (activeTab === 'walkin') {
      loadFlatsAndSlots();
    }
  }, [activeTab, activeSearch]);

  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, [activeTab]);

  // Camera Scanner using html5-qrcode
  const startCameraScanner = async () => {
    try {
      setScannerError(null);
      setIsScanning(true);

      const { Html5Qrcode } = await import('html5-qrcode');
      const devices = await Html5Qrcode.getCameras();

      if (!devices || devices.length === 0) {
        setScannerError('No camera detected. Please use manual code verification.');
        setIsScanning(false);
        return;
      }

      // If previous scanner exists, ensure it is stopped
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
        } catch (e) {}
      }

      const html5QrCode = new Html5Qrcode('guard-qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        devices[0].id,
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          // Cleanly stop scanner on success
          try {
            if (html5QrCode.isScanning) {
              await html5QrCode.stop();
            }
          } catch (e) {}
          setIsScanning(false);
          handleVerify(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      console.error('Camera error:', err);
      setScannerError(err.message || 'Camera permission required.');
      setIsScanning(false);
    }
  };

  const stopCameraScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const [autoMarkExit, setAutoMarkExit] = useState(false);
  const [markingExit, setMarkingExit] = useState(false);

  // Verify Pass Code / Token
  const handleVerify = async (codeToVerify: string) => {
    const code = codeToVerify.trim();
    if (!code) return;

    setVerifying(true);
    setVerifyResult(null);

    try {
      const res = await fetchApi('/api/v1/guard/verify-pass', {
        method: 'POST',
        body: JSON.stringify({ qrData: code, autoCheckout: autoMarkExit }),
      });
      setVerifyResult(res);

      // If auto-checkout completed immediately
      if (res.action === 'EXIT_COMPLETED') {
        loadDashboard();
        loadActiveParking();
      }
    } catch (err: any) {
      setVerifyResult({
        isValid: false,
        code: 'NETWORK_ERROR',
        message: err.message || 'Pass verification failed.',
      });
    } finally {
      setVerifying(false);
    }
  };

  // Mark Vehicle Left from Building (Checkout)
  const handleMarkExit = async (passId: string, sessionId?: string) => {
    setMarkingExit(true);
    try {
      let res;
      if (sessionId) {
        res = await fetchApi(`/api/v1/guard/checkout/${sessionId}`, {
          method: 'POST',
        });
      } else {
        res = await fetchApi('/api/v1/guard/mark-exit', {
          method: 'POST',
          body: JSON.stringify({ passId }),
        });
      }

      alert(`✅ ${res.message || 'Visitor marked as left from building! Slot released.'}`);
      setVerifyResult(null);
      setManualCode('');
      loadDashboard();
      loadActiveParking();
      setActiveTab('active');
    } catch (err: any) {
      alert(`Failed to mark exit: ${err.message}`);
    } finally {
      setMarkingExit(false);
    }
  };

  // Confirm Vehicle Entry
  const handleConfirmEntry = async (passId: string) => {
    setConfirmingEntry(true);
    try {
      const res = await fetchApi('/api/v1/guard/confirm-entry', {
        method: 'POST',
        body: JSON.stringify({ passId }),
      });

      alert(`✅ Entry confirmed! Assigned Slot: ${verifyResult?.pass?.slotNumber}. Vehicle allowed inside.`);
      setVerifyResult(null);
      setManualCode('');
      loadDashboard();
      setActiveTab('active');
    } catch (err: any) {
      alert(`Entry confirmation failed: ${err.message}`);
    } finally {
      setConfirmingEntry(false);
    }
  };

  const [cancellingPass, setCancellingPass] = useState(false);

  // Guard Cancels Pass at Gate
  const handleGuardCancelPass = async (passId: string) => {
    if (!confirm('Are you sure you want to cancel this visitor pass? The reserved slot will be freed immediately.')) {
      return;
    }
    setCancellingPass(true);
    try {
      const res = await fetchApi('/api/v1/guard/cancel-pass', {
        method: 'POST',
        body: JSON.stringify({ passId, reason: 'Visitor cancelled at gate' }),
      });
      alert('✅ ' + (res.message || 'Pass cancelled and slot freed.'));
      setVerifyResult(null);
      setManualCode('');
      loadDashboard();
      loadActiveParking();
    } catch (err: any) {
      alert('Failed to cancel pass: ' + (err.message || 'Error'));
    } finally {
      setCancellingPass(false);
    }
  };

  // Check out Vehicle
  const handleCheckout = async (sessionId: string) => {
    setCheckingOut(true);
    try {
      const res = await fetchApi(`/api/v1/guard/checkout/${sessionId}`, {
        method: 'POST',
      });
      alert(`✅ ${res.message}`);
      setCheckoutModalSession(null);
      loadActiveParking();
      loadDashboard();
    } catch (err: any) {
      alert(`Checkout failed: ${err.message}`);
    } finally {
      setCheckingOut(false);
    }
  };

  // Submit Walk-in
  const handleWalkinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalkinLoading(true);
    setWalkinMessage(null);

    try {
      const res = await fetchApi('/api/v1/guard/walk-in', {
        method: 'POST',
        body: JSON.stringify({
          visitorName: walkinName.trim(),
          visitorPhone: walkinPhone.trim() || undefined,
          vehicleNumber: walkinVehicle.trim().toUpperCase(),
          flatId: walkinFlatId,
          vehicleType: walkinVehicleType,
          visitorCategory: walkinCategory,
          durationHours: Number(walkinDuration),
        }),
      });

      setWalkinMessage(`✅ Walk-in registered! Slot ${res.slotNumber} assigned.`);
      setWalkinName('');
      setWalkinPhone('');
      setWalkinVehicle('');
      loadDashboard();
      setTimeout(() => {
        setActiveTab('active');
        setWalkinMessage(null);
      }, 1800);
    } catch (err: any) {
      setWalkinMessage(`❌ Error: ${err.message}`);
    } finally {
      setWalkinLoading(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentDateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="max-w-md mx-auto px-4 pt-5 pb-6">

        {/* SCREEN 5: SECURITY GUARD HOME */}
        {activeTab === 'home' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-blue-600 tracking-wider">
                  ParkPass Security
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {selectedGate} • {user.societyName}
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                SG
              </div>
            </div>

            {/* Greeting */}
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Good evening</h1>
              <p className="text-xs text-slate-500 font-medium">{currentDateStr}</p>
            </div>

            {/* Stat Boxes Row (Parked, Available, Total, Waitlist) */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Parked</span>
                <div className="text-lg font-extrabold text-slate-900">
                  {dashboardData?.stats?.parkedVehicles ?? 0}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-[10px] font-semibold text-emerald-600 block mb-0.5">Available</span>
                <div className="text-lg font-extrabold text-emerald-600">
                  {dashboardData?.stats?.availableSlots ?? 20}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-[10px] font-semibold text-purple-600 block mb-0.5">Waitlist</span>
                <div className="text-lg font-extrabold text-purple-700">
                  {dashboardData?.stats?.activeWaitlist ?? 0}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Total</span>
                <div className="text-lg font-extrabold text-slate-900">
                  {dashboardData?.stats?.totalSlots ?? 20}
                </div>
              </div>
            </div>

            {/* Large Hero Blue Card: Scan Visitor Pass */}
            <div
              onClick={() => {
                setActiveTab('scan');
                startCameraScanner();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-3xl p-6 shadow-lg shadow-blue-500/25 transition-all cursor-pointer relative overflow-hidden group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                  <QrCode className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">Scan Visitor Pass</h2>
                  <p className="text-xs text-blue-100 font-medium mt-0.5">Verify entry in seconds</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-blue-100">
                <span>Tap to launch smartphone scanner</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveTab('walkin')}
                className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-blue-400 transition-all text-left flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Walk-in</div>
                  <div className="text-[10px] text-slate-500">Unscheduled visitor</div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('active')}
                className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:border-blue-400 transition-all text-left flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <Car className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Active Parking</div>
                  <div className="text-[10px] text-slate-500">Vehicles inside</div>
                </div>
              </button>
            </div>

            {/* Smart Arrival Coordination Live Stream (Feature 3) */}
            {dashboardData?.expectedArrivals && dashboardData.expectedArrivals.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                    <span>Expected Arrivals Today ({dashboardData.expectedArrivals.length})</span>
                  </h3>
                </div>

                <div className="space-y-2">
                  {dashboardData.expectedArrivals.map((exp: any) => (
                    <div
                      key={exp.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        exp.arrivalStatus === 'ARRIVED'
                          ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                          : exp.arrivalStatus === 'ON_THE_WAY'
                          ? 'bg-blue-50/70 border-blue-200 shadow-sm'
                          : 'bg-white border-slate-200/80 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{exp.visitorName}</span>
                            {exp.arrivalStatus === 'ARRIVED' && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white animate-pulse flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" /> AT GATE NOW
                              </span>
                            )}
                            {exp.arrivalStatus === 'ON_THE_WAY' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
                                <Compass className="w-2.5 h-2.5 text-blue-600" /> On Way (~{exp.etaMinutes || 15}m)
                              </span>
                            )}
                            {exp.arrivalStatus === 'DELAYED' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                Delayed (~{exp.etaMinutes || 30}m)
                              </span>
                            )}
                            {(!exp.arrivalStatus || exp.arrivalStatus === 'SCHEDULED') && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                Expected {new Date(exp.validFrom).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-800">{exp.vehicleNumber}</span>
                            <span>•</span>
                            <span className="font-semibold text-blue-600">Slot {exp.parkingSlot?.slotNumber}</span>
                            <span>•</span>
                            <span>Flat {exp.resident?.flat?.flatNumber || ''}</span>
                          </div>
                        </div>

                        {/* Quick 1-tap verify button */}
                        <button
                          type="button"
                          onClick={() => {
                            setManualCode(exp.passCode || exp.secureToken);
                            setActiveTab('scan');
                            handleVerify(exp.passCode || exp.secureToken);
                          }}
                          className={`px-3 py-1.5 font-bold text-xs rounded-xl shadow-sm transition-all ${
                            exp.arrivalStatus === 'ARRIVED'
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-white border border-slate-200 hover:border-blue-400 text-blue-600'
                          }`}
                        >
                          {exp.arrivalStatus === 'ARRIVED' ? 'Allow Entry' : 'Verify'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Activity</h3>
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  View all
                </button>
              </div>

              {dashboardData?.recentSessions && dashboardData.recentSessions.length > 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm divide-y divide-slate-100">
                  {dashboardData.recentSessions.slice(0, 4).map((session: any) => (
                    <div key={session.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">
                            {session.pass.vehicleNumber}
                          </span>
                          <span className="text-slate-600 font-medium">({session.pass.visitorName})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Slot {session.parkingSlot.slotNumber} • Flat {session.pass.resident.flat?.flatNumber}
                        </div>
                      </div>
                      <span className="font-semibold text-slate-500 text-[11px]">
                        {new Date(session.actualEntryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 text-center text-xs text-slate-400">
                  No activity logged today.
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCREEN 6: SCANNER & VERIFICATION */}
        {activeTab === 'scan' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  stopCameraScanner();
                  setActiveTab('home');
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <h2 className="text-sm font-bold text-slate-900">Scan Visitor QR Code</h2>
              <button
                onClick={() => setVerifyResult(null)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Reset
              </button>
            </div>

            {/* Scanner Viewfinder Box */}
            <div className="bg-slate-950 rounded-3xl p-4 text-center relative overflow-hidden border border-slate-800">
              <div className="relative w-full max-w-[260px] min-h-[240px] mx-auto rounded-2xl bg-slate-900 flex items-center justify-center overflow-hidden">
                {/* Strictly empty mount target for html5-qrcode */}
                <div id="guard-qr-reader" className="w-full h-full min-h-[240px]" />

                {/* Sibling placeholder overlay when camera is idle */}
                {!isScanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center pointer-events-none bg-slate-900 z-10">
                    <Camera className="w-10 h-10 mx-auto mb-2 text-slate-500 opacity-60" />
                    <p className="text-slate-300 font-semibold text-xs">Ready to scan QR</p>
                    <p className="text-[11px] text-slate-500 mt-1">Point smartphone camera at pass</p>
                  </div>
                )}
              </div>

              {scannerError && (
                <p className="text-xs text-amber-400 mt-2">{scannerError}</p>
              )}

              <div className="mt-3 flex justify-center gap-2">
                {!isScanning ? (
                  <button
                    onClick={startCameraScanner}
                    className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Start Camera</span>
                  </button>
                ) : (
                  <button
                    onClick={stopCameraScanner}
                    className="py-2 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    <span>Stop Camera</span>
                  </button>
                )}
              </div>
            </div>

            {/* Manual Code Input Fallback */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Or enter pass code manually:
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-blue-600 font-medium">
                  <input
                    type="checkbox"
                    checked={autoMarkExit}
                    onChange={(e) => setAutoMarkExit(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span>Auto-mark exit on scan</span>
                </label>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. PP-95116 or pk_..."
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleVerify(manualCode)}
                  disabled={verifying || !manualCode.trim()}
                  className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-50"
                >
                  {verifying ? 'Checking...' : 'Verify'}
                </button>
              </div>
            </div>

            {/* VERIFICATION RESULT CARD (Screen 6 Bottom Sheet) */}
            {verifyResult && (
              <div
                className={`p-5 rounded-3xl border shadow-lg animate-in fade-in zoom-in-95 duration-150 ${
                  verifyResult.isValid
                    ? verifyResult.action === 'EXIT'
                      ? 'bg-amber-50/70 border-amber-300'
                      : verifyResult.action === 'EXIT_COMPLETED'
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-white border-emerald-300'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                {/* 1. VISITOR LEAVING BUILDING (EXIT ACTION) */}
                {verifyResult.isValid && verifyResult.action === 'EXIT' ? (
                  <div className="space-y-4">
                    {/* Header: Visitor Departing */}
                    <div className="flex items-center gap-2.5 pb-3 border-b border-amber-200">
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                        <LogOut className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="text-base font-extrabold text-slate-900">Mark as Left from Building</div>
                        <div className="text-[11px] text-amber-800 font-medium">Vehicle is currently checked in inside</div>
                      </div>
                    </div>

                    {/* Parked Duration banner */}
                    <div className="bg-amber-100/80 border border-amber-300 rounded-xl p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-amber-900 font-semibold">
                        <Clock className="w-4 h-4 text-amber-700" />
                        <span>Duration Parked:</span>
                      </div>
                      <span className="font-bold text-amber-950">
                        {Math.floor((verifyResult.session?.durationMinutes || 0) / 60)}h{' '}
                        {(verifyResult.session?.durationMinutes || 0) % 60}m
                      </span>
                    </div>

                    {verifyResult.session?.isOverstay && (
                      <div className="bg-red-100 border border-red-200 rounded-xl p-2.5 flex items-center gap-2 text-xs text-red-800 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Overstayed by {verifyResult.session.overstayMinutes} minutes!</span>
                      </div>
                    )}

                    {/* Details Table */}
                    <div className="space-y-2 text-xs bg-white/60 p-3 rounded-2xl border border-amber-200/60">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Visitor:</span>
                        <span className="font-bold text-slate-900">{verifyResult.pass.visitorName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vehicle No:</span>
                        <span className="font-mono font-bold text-slate-900">{verifyResult.pass.vehicleNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Slot to Release:</span>
                        <span className="font-black text-amber-700 text-sm">
                          {verifyResult.pass.slotNumber}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Flat Visited:</span>
                        <span className="font-semibold text-slate-800">
                          {verifyResult.pass.towerName} — Flat {verifyResult.pass.flatNumber}
                        </span>
                      </div>
                    </div>

                    {/* Action: Confirm Exit & Mark Left */}
                    <button
                      onClick={() => handleMarkExit(verifyResult.pass.id, verifyResult.session?.id)}
                      disabled={markingExit}
                      className="w-full py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <LogOut className="w-4 h-4 stroke-[2.5]" />
                      <span>{markingExit ? 'Updating...' : '🚪 Confirm Exit & Mark Left from Building'}</span>
                    </button>
                  </div>
                ) : verifyResult.isValid && verifyResult.action === 'EXIT_COMPLETED' ? (
                  /* 2. AUTO-CHECKOUT COMPLETED */
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-emerald-200">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                        <Check className="w-5 h-5 stroke-[3]" />
                      </div>
                      <div>
                        <div className="text-base font-extrabold text-emerald-950">Marked as Left from Building</div>
                        <div className="text-[11px] text-emerald-700 font-medium">Slot {verifyResult.pass.slotNumber} is now freed</div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-700 space-y-1">
                      <p>
                        Visitor <strong>{verifyResult.pass.visitorName}</strong> ({verifyResult.pass.vehicleNumber}) has departed.
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Duration: {Math.floor((verifyResult.session?.durationMinutes || 0) / 60)}h{' '}
                        {(verifyResult.session?.durationMinutes || 0) % 60}m.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setVerifyResult(null);
                        setManualCode('');
                      }}
                      className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      Done / Scan Next Pass
                    </button>
                  </div>
                ) : verifyResult.isValid ? (
                  /* 3. NORMAL ENTRY VERIFICATION */
                  <div className="space-y-4">
                    {/* Header: Visitor Verified */}
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                        <Check className="w-5 h-5 stroke-[3]" />
                      </div>
                      <div>
                        <div className="text-base font-extrabold text-slate-900">Visitor Verified</div>
                        <div className="text-[11px] text-slate-500">Pass status: Active & Authorized</div>
                      </div>
                    </div>

                    {/* Details Table */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Visitor:</span>
                        <span className="font-bold text-slate-900">{verifyResult.pass.visitorName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vehicle No:</span>
                        <span className="font-mono font-bold text-slate-900">{verifyResult.pass.vehicleNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Parking Slot:</span>
                        <span className="font-black text-emerald-600 text-sm">
                          {verifyResult.pass.slotNumber}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Destination:</span>
                        <span className="font-semibold text-slate-800">
                          {verifyResult.pass.towerName} — Flat {verifyResult.pass.flatNumber}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Valid Until:</span>
                        <span className="text-slate-800">
                          {new Date(verifyResult.pass.validUntil).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Action: Confirm Entry or Cancel Pass */}
                    <div className="space-y-2">
                      <button
                        onClick={() => handleConfirmEntry(verifyResult.pass.id)}
                        disabled={confirmingEntry || cancellingPass}
                        className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>{confirmingEntry ? 'Confirming Entry...' : 'Confirm Entry'}</span>
                      </button>

                      <button
                        onClick={() => handleGuardCancelPass(verifyResult.pass.id)}
                        disabled={confirmingEntry || cancellingPass}
                        className="w-full py-2 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        <span>{cancellingPass ? 'Cancelling Pass...' : 'Cancel Pass (Turn Away / Free Slot)'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 4. VERIFICATION FAILED / ALREADY CHECKED OUT */
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase">
                      <XCircle className="w-5 h-5" />
                      <span>{verifyResult.code === 'ALREADY_CHECKED_OUT' ? 'Visitor Already Departed' : 'Verification Failed'}</span>
                    </div>
                    <p className="text-xs text-red-800 font-medium">{verifyResult.message}</p>
                    <button
                      onClick={() => setVerifyResult(null)}
                      className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SCREEN 7: ACTIVE PARKING & CHECKOUT */}
        {activeTab === 'active' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header */}
            <div>
              <h2 className="text-xl font-bold text-slate-900">Active Parking</h2>
              <p className="text-xs text-slate-500">
                {activeSessions.length} vehicles currently parked inside society.
              </p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={activeSearch}
                onChange={(e) => setActiveSearch(e.target.value)}
                placeholder="Search vehicle, flat, or visitor..."
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Active Cards List */}
            {loadingActive ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading active vehicles...</div>
            ) : activeSessions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200/80">
                No active parked vehicles found.
              </div>
            ) : (
              <div className="space-y-3">
                {activeSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-slate-900">
                            {session.pass.vehicleNumber}
                          </span>
                          {session.isOverstay && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse">
                              OVERSTAY
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {session.pass.visitorName} • {session.pass.resident.flat?.tower.name} Flat {session.pass.resident.flat?.flatNumber}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-black text-blue-600">
                          Slot {session.parkingSlot.slotNumber}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          In: {new Date(session.actualEntryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setCheckoutModalSession(session)}
                      className="w-full py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm"
                    >
                      Check Out
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SCREEN 8: WALK-IN REGISTRATION */}
        {activeTab === 'walkin' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveTab('home')}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <h2 className="text-sm font-bold text-slate-900">Walk-in registration</h2>
              <span className="text-[11px] font-semibold text-slate-400">Step 1 of 2</span>
            </div>

            {walkinMessage && (
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
                {walkinMessage}
              </div>
            )}

            <form onSubmit={handleWalkinSubmit} className="space-y-4">
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Visitor full name *
                  </label>
                  <input
                    type="text"
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    placeholder="e.g. Ramesh Verma"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Visitor mobile number (optional)
                  </label>
                  <input
                    type="tel"
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    placeholder="+91 98765 00000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Vehicle registration number *
                  </label>
                  <input
                    type="text"
                    value={walkinVehicle}
                    onChange={(e) => setWalkinVehicle(e.target.value.toUpperCase())}
                    placeholder="e.g. MH 02 CD 5678"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Destination flat *
                  </label>
                  <select
                    value={walkinFlatId}
                    onChange={(e) => setWalkinFlatId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                  >
                    {availableFlats.map((flat) => (
                      <option key={flat.id} value={flat.id}>
                        {flat.tower?.name} — Flat {flat.flatNumber} ({flat.residents?.[0]?.name || 'Resident'})
                      </option>
                    ))}
                  </select>
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
                        onClick={() => setWalkinVehicleType(type.key)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                          walkinVehicleType === type.key
                            ? 'bg-blue-50 border-blue-600 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                    Parking duration
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 4, 8].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setWalkinDuration(h)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          walkinDuration === h
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Available Slots Preview */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Available Slots Preview
                </span>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {availableSlots.slice(0, 8).map((slot: any) => (
                    <div
                      key={slot.id}
                      className="p-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px] font-bold"
                    >
                      {slot.slotNumber}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={walkinLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20 disabled:opacity-60"
              >
                {walkinLoading ? 'Allocating Slot & Granting Entry...' : 'Register & Enter'}
              </button>
            </form>
          </div>
        )}

        {/* SCREEN HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h2 className="text-xl font-bold text-slate-900">Entry History</h2>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm divide-y divide-slate-100">
              {historyList.map((item) => (
                <div key={item.id} className="p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono font-bold text-slate-900">{item.pass.vehicleNumber}</div>
                    <div className="text-[11px] text-slate-500">
                      {item.pass.visitorName} • Slot {item.parkingSlot.slotNumber}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                      {item.status}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {new Date(item.actualEntryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* CHECKOUT MODAL (Screen 7 Checkout Confirmation) */}
      {checkoutModalSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Check out visitor?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Confirm departure to mark session complete and free the parking slot.
            </p>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs mb-5">
              <div className="flex justify-between">
                <span className="text-slate-500">Vehicle:</span>
                <span className="font-mono font-bold text-slate-900">
                  {checkoutModalSession.pass.vehicleNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Visitor:</span>
                <span className="font-semibold text-slate-900">
                  {checkoutModalSession.pass.visitorName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Parking Slot:</span>
                <span className="font-bold text-blue-600">
                  {checkoutModalSession.parkingSlot.slotNumber}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleCheckout(checkoutModalSession.id)}
                disabled={checkingOut}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
              >
                {checkingOut ? 'Recording checkout...' : 'Confirm Checkout'}
              </button>
              <button
                onClick={() => setCheckoutModalSession(null)}
                className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs"
              >
                Cancel
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

          {/* Elevated Scan Button */}
          <button
            onClick={() => {
              setActiveTab('scan');
              startCameraScanner();
            }}
            className="w-12 h-12 -mt-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 transition-transform active:scale-95"
            title="Scan QR Pass"
          >
            <QrCode className="w-6 h-6" />
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`flex flex-col items-center gap-1 text-[11px] font-semibold transition-colors ${
              activeTab === 'active' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Car className="w-5 h-5" />
            <span>Active</span>
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import { fetchApi } from '@/lib/api';
import {
  Car,
  Calendar,
  Clock,
  MapPin,
  Share2,
  Copy,
  Download,
  CheckCircle2,
  AlertCircle,
  Building2,
  ShieldCheck,
  Send,
  Trash2,
  Navigation,
  Compass,
  Check,
  AlertTriangle,
  Zap,
} from 'lucide-react';

export default function VisitorPassPage() {
  const { token } = useParams();
  const [pass, setPass] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [extending, setExtending] = useState(false);
  const [updatingArrival, setUpdatingArrival] = useState(false);
  const [arrivalMessage, setArrivalMessage] = useState<string | null>(null);
  const [showEtaSelector, setShowEtaSelector] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  const handleExtendPass = async (hours: number) => {
    setExtending(true);
    try {
      const res = await fetchApi<{
        success: boolean;
        reassigned?: boolean;
        slotNumber: string;
        validUntil: string;
        message: string;
      }>(`/api/v1/visitor/pass/${token}/extend`, {
        method: 'POST',
        body: JSON.stringify({ additionalHours: hours }),
      });
      alert('⚡ ' + (res.message || `Parking extended by ${hours} hour(s)!`));
      setPass((prev: any) => ({
        ...prev,
        validUntil: res.validUntil || prev.validUntil,
        slotNumber: res.slotNumber || prev.slotNumber,
      }));
    } catch (err: any) {
      alert('Could not extend parking: ' + (err.message || 'Parking slots full'));
    } finally {
      setExtending(false);
    }
  };

  const handleCancelPass = async () => {
    if (!confirm('Are you sure you want to cancel this visitor pass? The reserved parking slot will be freed.')) {
      return;
    }
    setCancelling(true);
    try {
      const res = await fetchApi<{ message: string }>(`/api/v1/visitor/pass/${token}/cancel`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      alert('✅ ' + (res.message || 'Visitor pass cancelled successfully. Slot freed.'));
      setPass((prev: any) => ({ ...prev, status: 'CANCELLED' }));
    } catch (err: any) {
      alert('Error cancelling pass: ' + (err.message || 'Failed to cancel'));
    } finally {
      setCancelling(false);
    }
  };

  const updateArrivalStatus = async (status: 'ON_THE_WAY' | 'ARRIVED' | 'DELAYED', etaMinutes?: number) => {
    setUpdatingArrival(true);
    setArrivalMessage(null);
    try {
      const res = await fetchApi<{ success: boolean; message: string; pass: any }>(
        `/api/v1/visitor/pass/${token}/arrival-status`,
        {
          method: 'POST',
          body: JSON.stringify({ status, etaMinutes }),
        }
      );
      setPass((prev: any) => ({
        ...prev,
        arrivalStatus: res.pass.arrivalStatus,
        etaMinutes: res.pass.etaMinutes,
        etaArrivalTime: res.pass.etaArrivalTime,
        lastCoordination: res.pass.lastCoordination,
      }));
      setArrivalMessage(res.message);
      setShowEtaSelector(false);
      setTimeout(() => setArrivalMessage(null), 5000);
    } catch (err: any) {
      alert('Could not update arrival status: ' + (err.message || 'Network error'));
    } finally {
      setUpdatingArrival(false);
    }
  };

  useEffect(() => {
    async function loadPass() {
      try {
        setLoading(true);
        const data = await fetchApi<{ pass: any }>(`/api/v1/visitor/pass/${token}`);
        setPass(data.pass);

        // Generate QR code pointing to this pass verification token
        const qr = await QRCode.toDataURL(data.pass.secureToken, {
          width: 320,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
        setQrDataUrl(qr);
      } catch (err: any) {
        setError(err.message || 'Pass not found or invalid');
      } finally {
        setLoading(false);
      }
    }
    if (token) {
      loadPass();
    }
  }, [token]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareWhatsApp = () => {
    if (!pass) return;
    const arrivalDate = new Date(pass.validFrom).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });
    const validUntilDate = new Date(pass.validUntil).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    });

    const text = `Hi ${pass.visitorName}, here is your visitor parking pass for ${pass.societyName}:
Vehicle: ${pass.vehicleNumber}
Destination: ${pass.towerName}, Flat ${pass.flatNumber}
Parking Slot: ${pass.slotNumber}
Arrival: ${arrivalDate}
Valid Until: ${validUntilDate}

Show this digital pass & QR code to security at the gate:
${window.location.href}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const printTicket = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs text-slate-600 font-medium">Loading visitor parking pass...</p>
        </div>
      </div>
    );
  }

  if (error || !pass) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center border border-slate-200 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-1">Pass Unavailable</h2>
          <p className="text-xs text-slate-600 mb-4">{error || 'This visitor pass could not be retrieved.'}</p>
          <a
            href="/"
            className="inline-block py-2 px-4 rounded-xl bg-slate-900 text-white text-xs font-semibold"
          >
            Return to ParkPass Home
          </a>
        </div>
      </div>
    );
  }

  const arrivalFormatted = new Date(pass.validFrom).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });

  const validUntilFormatted = new Date(pass.validUntil).toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/30 backdrop-blur-md">
            SCHEDULED
          </span>
        );
      case 'CHECKED_IN':
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 backdrop-blur-md">
            PARKED / CHECKED IN
          </span>
        );
      case 'CHECKED_OUT':
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 text-white/70 border border-white/20 backdrop-blur-md">
            COMPLETED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-red-500/25 text-red-300 border border-red-400/40 backdrop-blur-md">
            CANCELLED
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/25 text-amber-300 border border-amber-400/40 backdrop-blur-md">
            EXPIRED
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 text-white border border-white/20">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen ambient-glow py-8 px-4 sm:px-6 flex flex-col items-center justify-center text-white">
      {/* Top Wallet Header */}
      <div className="w-full max-w-sm mb-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl liquid-pill flex items-center justify-center">
            <Car className="w-4 h-4 text-blue-400" />
          </div>
          <span className="font-extrabold tracking-tight text-white/90 text-sm">ParkPass Wallet</span>
        </div>
        <div className="px-2.5 py-1 rounded-xl liquid-pill font-mono font-bold text-[11px] text-blue-300">
          {pass.passCode}
        </div>
      </div>

      {/* APPLE WALLET BOARDING PASS CARD (Southwest Airlines Inspired) */}
      <div
        ref={ticketRef}
        className="w-full max-w-sm bg-gradient-to-b from-[#1447db] via-[#103bb2] to-[#0c2e8c] rounded-[2.2rem] shadow-[0_25px_60px_-15px_rgba(16,66,199,0.5),_inset_0_1px_1px_rgba(255,255,255,0.4)] border border-blue-400/30 overflow-hidden relative"
      >
        {/* Pass Top Identity Bar */}
        <div className="px-6 pt-6 pb-3 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center font-black text-xs text-white">
              PP
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest font-extrabold text-blue-200">
                {pass.societyName || 'ParkPass Resident Society'}
              </div>
              <div className="text-xs font-bold text-white/90">VISITOR BOARDING PASS</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-mono font-bold text-blue-200">PASS CODE</div>
            <div className="text-xs font-mono font-extrabold text-white">{pass.passCode}</div>
          </div>
        </div>

        {/* Parking Bay Number Hero Banner */}
        <div className="px-6 py-4 relative z-10">
          <div className="liquid-glass rounded-2xl p-4 border border-white/20 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-extrabold tracking-widest text-blue-200 uppercase">
                PARKING BAY
              </div>
              <div className="text-3xl font-black text-white tracking-tight mt-0.5">
                {pass.slotNumber}
              </div>
              <div className="text-[11px] font-semibold text-blue-200 mt-0.5">
                {pass.zone || 'MAIN DECK'} • {pass.vehicleType || 'RESERVED'}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-extrabold tracking-widest text-blue-200 uppercase">
                VALID UNTIL
              </div>
              <div className="text-sm font-black text-amber-300 mt-1">
                {validUntilFormatted.split(',')[1] || validUntilFormatted}
              </div>
              <div className="text-[10px] font-medium text-blue-200/80 mt-0.5">
                Pre-Allocated Bay
              </div>
            </div>
          </div>

          {/* Passenger / Visitor Name */}
          <div className="mt-5 pt-4 border-t border-white/15">
            <div className="text-[10px] font-extrabold tracking-widest text-blue-200 uppercase">
              VISITOR NAME
            </div>
            <div className="text-xl font-black tracking-tight text-white mt-0.5 uppercase">
              {pass.visitorName}
            </div>
          </div>

          {/* Boarding Pass Pill Badges */}
          <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-bold">
            <span className="px-2.5 py-1 rounded-lg liquid-pill text-white uppercase">
              {pass.vehicleType || 'CAR'} • {pass.vehicleNumber}
            </span>
            <span className="px-2.5 py-1 rounded-lg liquid-pill text-blue-100">
              {pass.towerName} — Flat {pass.flatNumber}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/30 border border-emerald-300/40 text-emerald-200 font-extrabold">
              PRE-APPROVED ✓
            </span>
          </div>

          {/* Key Stat Grid (Southwest style: EXPECTED, TOWER, DESTINATION, BAY #) */}
          <div className="mt-4 grid grid-cols-4 gap-2 pt-3 border-t border-white/15 text-center">
            <div>
              <div className="text-[9px] font-extrabold text-blue-200 uppercase tracking-wider">EXPECTED</div>
              <div className="text-xs font-black text-white mt-0.5">{arrivalFormatted}</div>
            </div>
            <div>
              <div className="text-[9px] font-extrabold text-blue-200 uppercase tracking-wider">TOWER</div>
              <div className="text-xs font-black text-white mt-0.5">{pass.towerName || 'A'}</div>
            </div>
            <div>
              <div className="text-[9px] font-extrabold text-blue-200 uppercase tracking-wider">FLAT</div>
              <div className="text-xs font-black text-white mt-0.5">{pass.flatNumber || '—'}</div>
            </div>
            <div>
              <div className="text-[9px] font-extrabold text-blue-200 uppercase tracking-wider">BAY #</div>
              <div className="text-xs font-black text-amber-300 mt-0.5">{pass.slotNumber}</div>
            </div>
          </div>
        </div>

        {/* Perforated Divider with Cutout Notches */}
        <div className="relative my-1">
          <div className="ticket-notch-left"></div>
          <div className="ticket-notch-right"></div>
          <div className="border-t-2 border-dashed border-white/20 mx-4"></div>
        </div>

        {/* Smart Arrival Coordination Box (Feature 3) */}
        {pass.status === 'SCHEDULED' && (
          <div className="p-4 mx-4 my-2 rounded-2xl liquid-glass border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Navigation className="w-3.5 h-3.5 text-blue-300 animate-pulse" />
                <span>Arrival Coordination</span>
              </div>
              {pass.arrivalStatus === 'ARRIVED' && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/30 text-emerald-200 rounded-full border border-emerald-400/40 flex items-center gap-1">
                  <Check className="w-3 h-3" /> At Gate ✓
                </span>
              )}
              {pass.arrivalStatus === 'ON_THE_WAY' && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-400/30 text-blue-100 rounded-full border border-blue-300/40 flex items-center gap-1">
                  <Compass className="w-3 h-3" /> On Way (~{pass.etaMinutes || 15}m)
                </span>
              )}
              {pass.arrivalStatus === 'DELAYED' && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/30 text-amber-200 rounded-full border border-amber-400/40">
                  Delayed (~{pass.etaMinutes}m)
                </span>
              )}
              {(!pass.arrivalStatus || pass.arrivalStatus === 'SCHEDULED') && (
                <span className="text-[10px] font-bold px-2 py-0.5 liquid-pill text-white/80">
                  Expected {arrivalFormatted}
                </span>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowEtaSelector(!showEtaSelector)}
                disabled={updatingArrival}
                className="py-2 px-2.5 rounded-xl liquid-pill hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Compass className="w-3.5 h-3.5 text-blue-300" />
                <span>{pass.arrivalStatus === 'ON_THE_WAY' ? 'Update ETA' : "I'm on my way"}</span>
              </button>

              <button
                type="button"
                onClick={() => updateArrivalStatus('ARRIVED')}
                disabled={updatingArrival || pass.arrivalStatus === 'ARRIVED'}
                className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                  pass.arrivalStatus === 'ARRIVED'
                    ? 'bg-emerald-500/40 border border-emerald-300/50 text-white cursor-default'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{pass.arrivalStatus === 'ARRIVED' ? "At Gate ✓" : "I've arrived"}</span>
              </button>
            </div>

            {/* ETA Selector Modal */}
            {showEtaSelector && (
              <div className="mt-2.5 p-2.5 rounded-xl liquid-glass-dark border border-white/20">
                <div className="text-[11px] font-bold text-white/90 mb-1.5 flex items-center justify-between">
                  <span>Select estimated arrival:</span>
                  <button onClick={() => setShowEtaSelector(false)} className="text-white/60 hover:text-white text-xs font-bold">✕</button>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                  {[10, 20, 30, 45].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => updateArrivalStatus('ON_THE_WAY', mins)}
                      className="py-1.5 px-1 rounded-lg liquid-pill hover:bg-blue-600 text-white text-center transition-colors"
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* High-Contrast Apple Wallet QR Section */}
        <div className="px-6 py-5 text-center relative z-10">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-300 mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ParkPass Security Verified ✓</span>
          </div>

          <div className="inline-block p-4 bg-white rounded-3xl shadow-2xl shadow-black/40">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="ParkPass Boarding Pass QR"
                className="w-56 h-56 mx-auto rounded-xl object-contain"
              />
            ) : (
              <div className="w-56 h-56 bg-slate-100 animate-pulse rounded-xl"></div>
            )}
          </div>

          <div className="mt-3 font-mono font-black text-sm tracking-wider text-white">
            {pass.passCode}
          </div>
          <p className="text-[11px] font-medium text-blue-200 mt-1">
            Show this digital boarding pass & QR to security at society gate.
          </p>
        </div>

        {/* Liquid Glass Actions Footer */}
        <div className="px-6 py-5 bg-black/25 backdrop-blur-xl border-t border-white/10 space-y-3">
          {/* One-Tap Extend Stay */}
          {(pass.status === 'SCHEDULED' || pass.status === 'CHECKED_IN') && (
            <div className="p-3 rounded-2xl liquid-glass border border-amber-300/30">
              <div className="flex items-center justify-between text-xs font-bold text-amber-200 mb-2">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Extend Stay Duration
                </span>
                <span className="text-[10px] text-amber-300 font-medium">Instant</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 4].map((hrs) => (
                  <button
                    key={hrs}
                    type="button"
                    disabled={extending}
                    onClick={() => handleExtendPass(hrs)}
                    className="py-1.5 px-2 liquid-pill hover:bg-amber-400/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>+{hrs}h</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-around gap-2 text-xs">
            <button
              onClick={shareWhatsApp}
              className="flex-1 py-2.5 px-3 rounded-xl bg-white text-blue-900 font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-md"
            >
              <Send className="w-3.5 h-3.5 text-blue-700" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={copyLink}
              className="py-2.5 px-3 rounded-xl liquid-pill text-white font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              title="Copy Pass Link"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              onClick={printTicket}
              className="py-2.5 px-3 rounded-xl liquid-pill text-white font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              title="Print Pass"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>

          {pass.status === 'SCHEDULED' && (
            <button
              onClick={handleCancelPass}
              disabled={cancelling}
              className="w-full py-2.5 px-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>{cancelling ? 'Cancelling Pass...' : 'Cancel Pass & Free Slot'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

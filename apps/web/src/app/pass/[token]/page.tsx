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
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">SCHEDULED</span>;
      case 'CHECKED_IN':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">PARKED / CHECKED IN</span>;
      case 'CHECKED_OUT':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">COMPLETED</span>;
      case 'CANCELLED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">CANCELLED</span>;
      case 'EXPIRED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">EXPIRED</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 sm:px-6 flex flex-col items-center justify-center">
      {/* Top Banner */}
      <div className="w-full max-w-sm mb-4 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
          <Car className="w-4 h-4 text-blue-600" />
          <span>ParkPass Digital Ticket</span>
        </div>
        <div className="text-[11px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200">{pass.passCode}</div>
      </div>

      {/* Access Ticket Card */}
      <div
        ref={ticketRef}
        className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden"
      >
        {/* Ticket Header */}
        <div className="bg-blue-600 text-white p-5 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="text-[10px] tracking-widest font-extrabold uppercase text-blue-200 mb-1">
            PARKPASS
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">VISITOR PARKING PASS</h1>
          <p className="text-xs text-blue-100 font-medium mt-0.5">{pass.societyName}</p>
        </div>

        {/* Ticket Status Bar */}
        <div className="bg-slate-50 border-b border-slate-100 px-5 py-2.5 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Pass Status</span>
          {getStatusBadge(pass.status)}
        </div>

        {/* Smart Arrival Coordination Box (Feature 3) */}
        {pass.status === 'SCHEDULED' && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <Navigation className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                <span>Smart Arrival Coordination</span>
              </div>
              {pass.arrivalStatus === 'ARRIVED' && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Arrived at Gate
                </span>
              )}
              {pass.arrivalStatus === 'ON_THE_WAY' && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full flex items-center gap-1">
                  <Compass className="w-3 h-3" /> On Way (~{pass.etaMinutes || 15}m)
                </span>
              )}
              {pass.arrivalStatus === 'DELAYED' && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                  Delayed (~{pass.etaMinutes}m)
                </span>
              )}
              {pass.arrivalStatus === 'SCHEDULED' && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full">
                  Expected {arrivalFormatted}
                </span>
              )}
            </div>

            <p className="text-[11px] text-blue-800/80 mb-3 leading-tight">
              Keep resident and gate security updated with your live arrival status:
            </p>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowEtaSelector(!showEtaSelector)}
                disabled={updatingArrival}
                className="py-2 px-2.5 rounded-xl bg-white border border-blue-200 hover:border-blue-400 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                <Compass className="w-3.5 h-3.5 text-blue-600" />
                <span>{pass.arrivalStatus === 'ON_THE_WAY' ? 'Update ETA' : "I'm on my way"}</span>
              </button>

              <button
                type="button"
                onClick={() => updateArrivalStatus('ARRIVED')}
                disabled={updatingArrival || pass.arrivalStatus === 'ARRIVED'}
                className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 ${
                  pass.arrivalStatus === 'ARRIVED'
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{pass.arrivalStatus === 'ARRIVED' ? "At Gate ✓" : "I've arrived"}</span>
              </button>
            </div>

            {/* ETA Selector Dropdown Modal */}
            {showEtaSelector && (
              <div className="mt-2.5 p-2.5 bg-white rounded-xl border border-blue-200 shadow-md">
                <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Select your estimated arrival time:</span>
                  <button onClick={() => setShowEtaSelector(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">✕</button>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                  {[10, 20, 30, 45].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => updateArrivalStatus('ON_THE_WAY', mins)}
                      className="py-1.5 px-1 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-center transition-colors"
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => updateArrivalStatus('DELAYED', 45)}
                  className="w-full mt-2 py-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 rounded-lg text-center"
                >
                  Running Late? Notify Guard (+45m grace)
                </button>
              </div>
            )}

            {/* Confirmation Feedback */}
            {arrivalMessage && (
              <div className="mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>{arrivalMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Ticket Body */}
        <div className="p-5 space-y-4">
          {/* Key Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Visitor</span>
              <span className="font-bold text-slate-900 text-sm">{pass.visitorName}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Vehicle</span>
              <span className="font-bold text-slate-900 text-sm font-mono">{pass.vehicleNumber}</span>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Destination</span>
              <span className="font-bold text-slate-900 text-xs">
                {pass.towerName} — Flat {pass.flatNumber}
              </span>
            </div>

            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
              <span className="text-[11px] text-blue-700 font-medium block">Assigned Bay</span>
              <span className="font-black text-blue-600 text-base">{pass.slotNumber}</span>
            </div>
          </div>

          {/* Time validity */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Expected Arrival:</span>
              </span>
              <span className="font-semibold text-slate-800">{arrivalFormatted}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Valid Until:</span>
              </span>
              <span className="font-semibold text-slate-800">{validUntilFormatted}</span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="text-center pt-2">
            <div className="inline-block p-3 bg-white rounded-2xl border-2 border-dashed border-slate-300 shadow-sm">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="ParkPass QR Code"
                  className="w-56 h-56 mx-auto rounded-lg object-contain"
                />
              ) : (
                <div className="w-56 h-56 bg-slate-100 animate-pulse rounded-lg"></div>
              )}
            </div>

            <p className="text-xs font-bold text-slate-800 mt-3">
              Show this QR code to security at the society entrance.
            </p>
            <p className="text-[11px] text-blue-600 font-semibold mt-1">
              Please park only in your assigned slot ({pass.slotNumber}).
            </p>
          </div>

          {/* Disclaimer */}
          <div className="border-t border-slate-100 pt-3 text-center">
            <p className="text-[10px] text-slate-400 leading-tight">
              Entry is subject to society security verification and parking rules.
            </p>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 space-y-2.5">
          {/* One-Tap Extend Stay on Public Ticket */}
          {(pass.status === 'SCHEDULED' || pass.status === 'CHECKED_IN') && (
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900 mb-2">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  Extend Parking Stay
                </span>
                <span className="text-[10px] text-amber-700 font-medium">Instant</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 4].map((hrs) => (
                  <button
                    key={hrs}
                    type="button"
                    disabled={extending}
                    onClick={() => handleExtendPass(hrs)}
                    className="py-1.5 px-2 bg-white hover:bg-amber-100/70 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>+{hrs}h</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-around gap-2 text-xs">
            <button
              onClick={shareWhatsApp}
              className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={copyLink}
              className="py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium flex items-center justify-center gap-1.5 transition-colors"
              title="Copy Pass Link"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              onClick={printTicket}
              className="py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium flex items-center justify-center gap-1.5 transition-colors"
              title="Print or Save PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>

          {pass.status === 'SCHEDULED' && (
            <button
              onClick={handleCancelPass}
              disabled={cancelling}
              className="w-full py-2.5 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>{cancelling ? 'Cancelling Pass...' : 'Cancel Pass & Free Slot'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

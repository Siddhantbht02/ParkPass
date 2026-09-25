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
} from 'lucide-react';

export default function VisitorPassPage() {
  const { token } = useParams();
  const [pass, setPass] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);

  const handleCancelPass = async () => {
    if (!confirm('Are you sure you want to cancel this visitor pass? The reserved parking slot will be freed.')) {
      return;
    }
    setCancelling(true);
    try {
      const res = await fetchApi<{ message: string }>(`/api/v1/visitor/pass/${token}/cancel`, {
        method: 'POST',
      });
      alert('✅ ' + (res.message || 'Visitor pass cancelled successfully. Slot freed.'));
      setPass((prev: any) => ({ ...prev, status: 'CANCELLED' }));
    } catch (err: any) {
      alert('Error cancelling pass: ' + (err.message || 'Failed to cancel'));
    } finally {
      setCancelling(false);
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

  const copyInstructions = () => {
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

    const text = `PARKPASS - VISITOR ACCESS TICKET
Society: ${pass.societyName}
Visitor: ${pass.visitorName}
Vehicle: ${pass.vehicleNumber}
Destination: ${pass.towerName}, Flat ${pass.flatNumber}
Assigned Slot: ${pass.slotNumber}
Expected Arrival: ${arrivalDate}
Valid Until: ${validUntilDate}

Show this QR pass at the security gate:
${window.location.href}`;

    navigator.clipboard.writeText(text);
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

Please show this digital pass & QR code to security at the gate:
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
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
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
      {/* Top Banner on Mobile */}
      <div className="w-full max-w-sm mb-4 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
          <Car className="w-4 h-4 text-emerald-600" />
          <span>ParkPass Digital Ticket</span>
        </div>
        <div className="text-[11px] font-mono">{pass.passCode}</div>
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
              <span className="text-[11px] text-blue-700 font-medium block">Parking Slot</span>
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
              className="w-full py-2.5 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
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

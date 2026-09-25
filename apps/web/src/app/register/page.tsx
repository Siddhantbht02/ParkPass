'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  Car,
  ShieldCheck,
  User,
  Phone,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Search,
  Users,
  Shield,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Mode: 'join' (Residents & Guards joining via Society Code) or 'new-society' (Admin registering new society)
  const [tab, setTab] = useState<'join' | 'new-society'>('join');

  // Join Mode State
  const [societyCodeInput, setSocietyCodeInput] = useState(searchParams?.get('code') || '');
  const [verifiedSociety, setVerifiedSociety] = useState<any>(null);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Role: RESIDENT or GUARD
  const [selectedRole, setSelectedRole] = useState<'RESIDENT' | 'GUARD'>('RESIDENT');

  // Resident / Guard Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedTower, setSelectedTower] = useState('');
  const [selectedFlat, setSelectedFlat] = useState('');
  const [customFlat, setCustomFlat] = useState('');
  const [gateName, setGateName] = useState('');

  const [submittingJoin, setSubmittingJoin] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState<any>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  // New Society Mode State
  const [newSocName, setNewSocName] = useState('');
  const [newSocAddress, setNewSocAddress] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

  const [submittingNewSoc, setSubmittingNewSoc] = useState(false);
  const [newSocSuccess, setNewSocSuccess] = useState<any>(null);
  const [newSocError, setNewSocError] = useState<string | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);

  // Pre-fill or lookup society if code param is provided in URL
  useEffect(() => {
    const codeParam = searchParams?.get('code');
    if (codeParam) {
      setSocietyCodeInput(codeParam.toUpperCase());
      handleLookupSociety(codeParam.toUpperCase());
    }
  }, [searchParams]);

  const handleLookupSociety = async (codeToLookup?: string) => {
    const targetCode = (codeToLookup || societyCodeInput).trim().toUpperCase();
    if (!targetCode) {
      setLookupError('Please enter a valid Society Code.');
      return;
    }

    setVerifyingCode(true);
    setLookupError(null);
    setVerifiedSociety(null);

    try {
      const data = await fetchApi(`/api/v1/auth/society/lookup?code=${encodeURIComponent(targetCode)}`);
      if (data && data.found && data.society) {
        setVerifiedSociety(data.society);
        if (data.society.towers?.length > 0) {
          setSelectedTower(data.society.towers[0].name);
        }
        if (data.society.gates?.length > 0) {
          setGateName(data.society.gates[0].name);
        }
      } else {
        setLookupError('Society not found with that code.');
      }
    } catch (err: any) {
      setLookupError(err.message || 'Society code not found. Please verify with your society admin.');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);

    if (!verifiedSociety) {
      setJoinError('Please verify your Society Code first.');
      return;
    }

    if (password.length < 6) {
      setJoinError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setJoinError('Passwords do not match.');
      return;
    }

    const flatNumberToUse = selectedFlat || customFlat;
    if (selectedRole === 'RESIDENT' && !flatNumberToUse.trim()) {
      setJoinError('Please provide your flat number.');
      return;
    }

    setSubmittingJoin(true);
    try {
      const res = await fetchApi('/api/v1/auth/register-request', {
        method: 'POST',
        body: JSON.stringify({
          societyCode: verifiedSociety.code,
          role: selectedRole,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          password,
          towerName: selectedRole === 'RESIDENT' ? selectedTower : undefined,
          flatNumber: selectedRole === 'RESIDENT' ? flatNumberToUse.trim() : undefined,
          gateName: selectedRole === 'GUARD' ? gateName.trim() : undefined,
        }),
      });

      setJoinSuccess(res);
    } catch (err: any) {
      setJoinError(err.message || 'Failed to submit registration request.');
    } finally {
      setSubmittingJoin(false);
    }
  };

  const handleNewSocietySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewSocError(null);

    if (adminPassword.length < 6) {
      setNewSocError('Password must be at least 6 characters long.');
      return;
    }

    if (adminPassword !== adminConfirmPassword) {
      setNewSocError('Passwords do not match.');
      return;
    }

    setSubmittingNewSoc(true);
    try {
      const res = await fetchApi('/api/v1/auth/society/register', {
        method: 'POST',
        body: JSON.stringify({
          societyName: newSocName.trim(),
          societyAddress: newSocAddress.trim(),
          adminName: adminName.trim(),
          adminPhone: adminPhone.trim(),
          adminEmail: adminEmail.trim() || undefined,
          adminPassword,
        }),
      });

      setNewSocSuccess(res);
    } catch (err: any) {
      setNewSocError(err.message || 'Failed to register society.');
    } finally {
      setSubmittingNewSoc(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // If join request was submitted successfully
  if (joinSuccess) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200 mb-3">
            Approval Pending
          </span>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Request Sent to Admin!</h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Your account request for <strong className="text-slate-900">{joinSuccess?.society?.name || verifiedSociety?.name}</strong> has been submitted.
          </p>

          <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-2">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Applicant:</span>
              <span className="font-bold text-slate-900">{name}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Role:</span>
              <span className="font-bold text-slate-900">{selectedRole === 'RESIDENT' ? 'Resident' : 'Security Guard'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Mobile:</span>
              <span className="font-bold text-slate-900">{phone}</span>
            </div>
            {selectedRole === 'RESIDENT' && (
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Unit:</span>
                <span className="font-bold text-slate-900">{selectedTower} • Flat {selectedFlat || customFlat}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500">Society ID Code:</span>
              <span className="font-mono font-bold text-blue-600">{verifiedSociety?.code}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 text-left text-[11px] text-blue-800 leading-normal flex items-start gap-2.5 mb-6">
            <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>What happens next?</strong> The Society Secretary / Administrator will review your profile from their admin dashboard. As soon as they click <strong>Approve</strong>, you can immediately sign in.
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Back to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If new society was registered successfully
  if (newSocSuccess) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Sparkles className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 mb-3">
            Society Registered
          </span>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{newSocSuccess?.society?.name}</h2>
          <p className="text-xs text-slate-500 mt-1">Here is your Society Unique Identification Code:</p>

          {/* Unique Society Code Display */}
          <div className="my-6 p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 text-center">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-widest block mb-1">
              Official Society Unique ID
            </span>
            <div className="text-3xl font-black tracking-wider text-slate-900 font-mono my-2">
              {newSocSuccess?.societyCode}
            </div>
            <button
              onClick={() => copyToClipboard(newSocSuccess?.societyCode)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white border border-blue-300 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-all shadow-sm"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Society Code'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Give this code to your <strong>Residents</strong> and <strong>Security Guards</strong>. When they register using this code, their requests will appear in your Admin Dashboard for one-click approval.
          </p>

          <Link
            href="/admin"
            className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-500/25"
          >
            <span>Proceed to Admin Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-xl">
        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-lg p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-500/25">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">ParkPass Registration</h1>
            <p className="text-xs text-slate-500 mt-1">
              Join your society community or onboard a brand new gated complex
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-6 text-xs font-bold">
            <button
              type="button"
              onClick={() => setTab('join')}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                tab === 'join'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-blue-600" />
              <span>Join with Society Code</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('new-society')}
              className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                tab === 'new-society'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Register New Society</span>
            </button>
          </div>

          {/* TAB 1: JOIN WITH SOCIETY CODE (RESIDENT OR GUARD) */}
          {tab === 'join' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Step 1: Society Code Verification */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  Step 1: Enter Society Unique Code *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={societyCodeInput}
                      onChange={(e) => {
                        setSocietyCodeInput(e.target.value.toUpperCase());
                        setVerifiedSociety(null);
                        setLookupError(null);
                      }}
                      placeholder="e.g. SKYLINE-101"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLookupSociety()}
                    disabled={verifyingCode || !societyCodeInput.trim()}
                    className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{verifyingCode ? 'Checking...' : 'Verify Code'}</span>
                  </button>
                </div>

                {lookupError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{lookupError}</span>
                  </div>
                )}

                {/* Confirmed Society Badge */}
                {verifiedSociety && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold">{verifiedSociety.name}</div>
                        <div className="text-[10px] text-emerald-600 opacity-90">{verifiedSociety.address}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-200/60 text-emerald-900">
                      {verifiedSociety.code}
                    </span>
                  </div>
                )}
              </div>

              {/* Form shown only after Society is verified */}
              {verifiedSociety && (
                <form onSubmit={handleJoinSubmit} className="space-y-4 animate-in fade-in duration-200">
                  {joinError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{joinError}</span>
                    </div>
                  )}

                  {/* Step 2: Role Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-2">
                      Step 2: Select Your Role
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedRole('RESIDENT')}
                        className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                          selectedRole === 'RESIDENT'
                            ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <User className={`w-5 h-5 mt-0.5 ${selectedRole === 'RESIDENT' ? 'text-blue-600' : 'text-slate-400'}`} />
                        <div>
                          <div className="text-xs font-bold text-slate-900">Resident</div>
                          <div className="text-[10px] text-slate-500">Flat owner or tenant</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedRole('GUARD')}
                        className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                          selectedRole === 'GUARD'
                            ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <ShieldCheck className={`w-5 h-5 mt-0.5 ${selectedRole === 'GUARD' ? 'text-blue-600' : 'text-slate-400'}`} />
                        <div>
                          <div className="text-xs font-bold text-slate-900">Security Guard</div>
                          <div className="text-[10px] text-slate-500">Gate security personnel</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Step 3: Personal Details */}
                  <div className="space-y-3 pt-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Step 3: Account Information
                    </label>

                    <div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full Name *"
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Mobile Number *"
                          required
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email (Optional)"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Resident Specific Unit Selector */}
                    {selectedRole === 'RESIDENT' && (
                      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Tower / Wing
                          </label>
                          <input
                            type="text"
                            value={selectedTower}
                            onChange={(e) => setSelectedTower(e.target.value)}
                            placeholder="Tower A"
                            required
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Flat Number *
                          </label>
                          <input
                            type="text"
                            value={customFlat}
                            onChange={(e) => setCustomFlat(e.target.value)}
                            placeholder="e.g. 804"
                            required
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Guard Specific Gate Selector */}
                    {selectedRole === 'GUARD' && (
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Assigned Gate Duty
                        </label>
                        <input
                          type="text"
                          value={gateName}
                          onChange={(e) => setGateName(e.target.value)}
                          placeholder="e.g. Main Gate 1"
                          required
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Password (min 6 chars) *"
                          required
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm Password *"
                          required
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingJoin}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-500/25 disabled:opacity-60"
                  >
                    <span>{submittingJoin ? 'Submitting Application...' : 'Send Request to Society Admin'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: REGISTER NEW SOCIETY */}
          {tab === 'new-society' && (
            <form onSubmit={handleNewSocietySubmit} className="space-y-4 animate-in fade-in duration-200">
              {newSocError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{newSocError}</span>
                </div>
              )}

              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-900 block">Society Details</span>

                <div>
                  <input
                    type="text"
                    value={newSocName}
                    onChange={(e) => setNewSocName(e.target.value)}
                    placeholder="Society / Condominium Name (e.g. Royal Palms CHS) *"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    value={newSocAddress}
                    onChange={(e) => setNewSocAddress(e.target.value)}
                    placeholder="Society Address & City (e.g. Powai, Mumbai) *"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-900 block">RWA / Admin Account Details</span>

                <div>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Admin Full Name (e.g. Secretary / Chairman) *"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={adminPhone}
                      onChange={(e) => setAdminPhone(e.target.value)}
                      placeholder="Admin Phone *"
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="Admin Email"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Password (min 6 chars) *"
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={adminConfirmPassword}
                      onChange={(e) => setAdminConfirmPassword(e.target.value)}
                      placeholder="Confirm Password *"
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-100 text-[11px] text-purple-900 leading-normal flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <span>
                  Registering generates an instant <strong>Unique Society ID Code</strong> and provisions your initial parking inventory. You will be able to share your code immediately with residents and guards.
                </span>
              </div>

              <button
                type="submit"
                disabled={submittingNewSoc}
                className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm shadow-purple-500/25 disabled:opacity-60"
              >
                <span>{submittingNewSoc ? 'Registering Society...' : 'Register Society & Get Unique ID'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Bottom Link to Sign in */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have an approved account?{' '}
              <Link href="/login" className="font-bold text-blue-600 hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
          <div className="text-xs text-slate-400">Loading registration...</div>
        </div>
      }
    >
      <RegisterContent />
    </React.Suspense>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchApi } from '@/lib/api';
import {
  Building2,
  Car,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Download,
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  Settings,
  Lock,
  FileText,
  UserCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  LayoutDashboard,
  Grid,
  Users,
  DoorOpen,
  LogOut,
  ChevronRight,
  MoreVertical,
  X,
  Phone,
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  // Active View: 'overview' (Screen 9), 'parking' (Screen 10), 'visitors' (Screen 11), 'settings', 'audit'
  const [activeTab, setActiveTab] = useState<'overview' | 'parking' | 'visitors' | 'settings' | 'audit'>('overview');

  // Dashboard Stats (Screen 9)
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Parking Slots State (Screen 10)
  const [parkingSlots, setParkingSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [slotSearch, setSlotSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Add Slot Modal
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [newSlotNumber, setNewSlotNumber] = useState('');
  const [newSlotType, setNewSlotType] = useState('CAR');
  const [newSlotZone, setNewSlotZone] = useState('Basement 1');

  // Visitor Records State (Screen 11)
  const [records, setRecords] = useState<any[]>([]);
  const [recordsFilter, setRecordsFilter] = useState('ALL');
  const [recordsSearch, setRecordsSearch] = useState('');
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Society Config State
  const [societyInfo, setSocietyInfo] = useState<any>(null);
  const [configName, setConfigName] = useState('');
  const [configAddress, setConfigAddress] = useState('');
  const [configMaxDuration, setConfigMaxDuration] = useState(48);
  const [configApproval, setConfigApproval] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) {
      if (user?.role === 'RESIDENT') router.push('/resident');
      else if (user?.role === 'GUARD') router.push('/guard');
      else router.push('/login');
    }
  }, [user, isLoading, router]);

  const loadDashboard = async () => {
    try {
      setLoadingDashboard(true);
      const data = await fetchApi('/api/v1/admin/dashboard');
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const loadSlots = async () => {
    try {
      setLoadingSlots(true);
      const data = await fetchApi('/api/v1/admin/parking-slots');
      setParkingSlots(data.slots || []);
      if (data.slots?.length > 0 && !selectedSlot) {
        // default select first occupied or first slot
        const occ = data.slots.find((s: any) => s.status === 'OCCUPIED');
        setSelectedSlot(occ || data.slots[0]);
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const loadRecords = async () => {
    try {
      setLoadingRecords(true);
      const data = await fetchApi(
        `/api/v1/admin/visitor-records?status=${recordsFilter}&search=${encodeURIComponent(recordsSearch)}`
      );
      setRecords(data.passes || []);
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setLoadingRecords(false);
    }
  };

  const loadAudit = async () => {
    try {
      setLoadingAudit(true);
      const data = await fetchApi('/api/v1/admin/audit-logs');
      setAuditLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const loadConfig = async () => {
    try {
      const data = await fetchApi('/api/v1/admin/society-config');
      setSocietyInfo(data.society);
      setConfigName(data.society.name);
      setConfigAddress(data.society.address);
      setConfigMaxDuration(data.society.configuration?.maxParkingDurationHours || 48);
      setConfigApproval(data.society.configuration?.residentApprovalRequired ?? true);
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      loadDashboard();
      loadSlots();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'parking') loadSlots();
    else if (activeTab === 'visitors') loadRecords();
    else if (activeTab === 'audit') loadAudit();
    else if (activeTab === 'settings') loadConfig();
  }, [activeTab, recordsFilter, recordsSearch]);

  const handleExportCsv = () => {
    window.open('/api/v1/admin/visitor-records?format=csv', '_blank');
  };

  // Add Slot
  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await fetchApi('/api/v1/admin/parking-slots', {
        method: 'POST',
        body: JSON.stringify({
          slotNumber: newSlotNumber.trim().toUpperCase(),
          parkingType: newSlotType,
          zone: newSlotZone,
        }),
      });
      setIsAddSlotOpen(false);
      setNewSlotNumber('');
      loadSlots();
      loadDashboard();
    } catch (err: any) {
      alert(`Failed to add slot: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Force Release Slot
  const handleForceRelease = async () => {
    if (!overrideReason || overrideReason.trim().length < 3) {
      alert('A valid reason is required for administrative slot override.');
      return;
    }
    setActionLoading(true);
    try {
      await fetchApi(`/api/v1/admin/parking-slots/${selectedSlot.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          forceRelease: true,
          reason: overrideReason.trim(),
        }),
      });
      alert(`Slot ${selectedSlot.slotNumber} forcefully released and logged.`);
      setOverrideReason('');
      loadSlots();
      loadDashboard();
    } catch (err: any) {
      alert(`Override failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Block / Unblock
  const handleToggleBlockSlot = async (slotId: string, currentActive: boolean) => {
    try {
      await fetchApi(`/api/v1/admin/parking-slots/${slotId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          isActive: !currentActive,
          reason: !currentActive ? 'Slot unblocked by admin' : 'Slot blocked by admin',
        }),
      });
      loadSlots();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  // Save Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await fetchApi('/api/v1/admin/society-config', {
        method: 'PATCH',
        body: JSON.stringify({
          name: configName,
          address: configAddress,
          configuration: {
            maxParkingDurationHours: Number(configMaxDuration),
            residentApprovalRequired: configApproval,
          },
        }),
      });
      alert('Society configuration saved.');
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* LEFT SIDEBAR (Matching Screens 9, 10, 11) */}
      <aside className="w-full md:w-60 bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo & Society */}
          <div className="p-5 border-b border-slate-100 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-sm shadow-blue-500/30">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-slate-900 tracking-tight">ParkPass</div>
              <div className="text-[11px] text-slate-500 truncate max-w-[130px] font-medium">
                {user.societyName}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'overview'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('parking')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'parking'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Parking</span>
            </button>

            <button
              onClick={() => setActiveTab('visitors')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'visitors'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Visitors</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'settings'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'audit'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Audit logs</span>
            </button>
          </nav>
        </div>

        {/* Bottom Profile Chip */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
              AD
            </div>
            <div className="text-left text-xs">
              <div className="font-bold text-slate-900 leading-tight">Secretary</div>
              <div className="text-[10px] text-slate-400">Powai, Mumbai</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">

        {/* SCREEN 9: SOCIETY OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Bar with Date & Export */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-500 font-medium">Dashboard</div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Society Overview</h1>
              </div>

              <div className="flex items-center gap-2">
                <div className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-sm">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Today: {new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                </div>
                <button
                  onClick={handleExportCsv}
                  className="py-1.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export report</span>
                </button>
              </div>
            </div>

            {/* 4 KPI Cards (Total parking, Occupied, Available, Overdue) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Total parking</span>
                <div className="text-3xl font-black text-slate-900">
                  {dashboardData?.stats?.totalSlots ?? 20}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Designated visitor slots</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Occupied</span>
                <div className="text-3xl font-black text-blue-600">
                  {dashboardData?.stats?.occupiedSlots ?? 1}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Vehicles parked inside</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Available</span>
                <div className="text-3xl font-black text-emerald-600">
                  {dashboardData?.stats?.availableSlots ?? 19}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Ready for reservations</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Overdue</span>
                <div className="text-3xl font-black text-amber-500">
                  {dashboardData?.stats?.overstayCount ?? 0}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Overstaying vehicles</span>
              </div>
            </div>

            {/* Parking Occupancy Progress Chart (Screen 9) */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Parking occupancy</h2>
                  <p className="text-xs text-slate-500">Live visualization of active and upcoming parking slots</p>
                </div>
                <span className="text-xs font-bold text-blue-600">20 Total Bays</span>
              </div>

              {/* Progress Visualization Pillars */}
              <div className="grid grid-cols-10 sm:grid-cols-20 gap-1.5 py-2">
                {Array.from({ length: 20 }, (_, i) => {
                  const slotNum = `V-${(i + 1).toString().padStart(2, '0')}`;
                  const slotObj = parkingSlots.find((s) => s.slotNumber === slotNum);
                  const isOcc = slotObj?.status === 'OCCUPIED';
                  const isRes = slotObj?.status === 'RESERVED';
                  const isBlk = slotObj?.status === 'BLOCKED';

                  let color = 'bg-emerald-500';
                  if (isOcc) color = 'bg-blue-600';
                  else if (isRes) color = 'bg-amber-400';
                  else if (isBlk) color = 'bg-slate-300';

                  return (
                    <div
                      key={slotNum}
                      className={`h-12 rounded-lg ${color} flex items-center justify-center text-[10px] font-bold text-white shadow-sm transition-transform hover:scale-105`}
                      title={`${slotNum}: ${slotObj?.status || 'Available'}`}
                    >
                      {i + 1}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span>Reserved</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <span>Occupied</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                  <span>Blocked</span>
                </div>
              </div>
            </div>

            {/* Bottom Grid: Recent Activity & Overdue Parking */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Recent activity</h3>
                  <button
                    onClick={() => setActiveTab('visitors')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View all
                  </button>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {dashboardData?.activeSessions && dashboardData.activeSessions.length > 0 ? (
                    dashboardData.activeSessions.slice(0, 3).map((s: any) => (
                      <div key={s.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">{s.visitorName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {s.vehicleNumber} • Flat {s.flatNumber}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-blue-600">Slot {s.slotNumber}</span>
                          <div className="text-[10px] text-slate-400">
                            {new Date(s.actualEntryTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-slate-400 text-xs">No recent activity.</div>
                  )}
                </div>
              </div>

              {/* Overdue Parking Alert Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Overdue parking</h3>
                  <span className="text-xs text-slate-400">Cars past authorized exit time</span>
                </div>

                {dashboardData?.activeSessions?.filter((s: any) => s.isOverstay).length > 0 ? (
                  dashboardData.activeSessions
                    .filter((s: any) => s.isOverstay)
                    .map((overdue: any) => (
                      <div
                        key={overdue.id}
                        className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-slate-900 text-sm">{overdue.vehicleNumber}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase">
                            Overdue
                          </span>
                        </div>
                        <div className="text-slate-600 text-xs">
                          {overdue.visitorName} visiting Flat {overdue.flatNumber} • Assigned Slot: <strong>{overdue.slotNumber}</strong>
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab('parking');
                            setSelectedSlot(parkingSlots.find((s) => s.slotNumber === overdue.slotNumber));
                          }}
                          className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                        >
                          Resolve & Manage Slot
                        </button>
                      </div>
                    ))
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 opacity-60" />
                    <span>No overstaying vehicles. All parking sessions in compliance.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 10: PARKING MANAGEMENT */}
        {activeTab === 'parking' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Parking management</h1>
                <p className="text-xs text-slate-500">Monitor all designated parking bays and resolve slot conflicts.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddSlotOpen(true)}
                  className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add parking slot</span>
                </button>
              </div>
            </div>

            {/* Two-Column Layout (Parking Map + Detail Drawer) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Parking Map Grid */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">Parking map</h2>
                  <span className="text-xs text-slate-500">20 designated bays</span>
                </div>

                {/* Slots Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {parkingSlots.map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    let dotColor = 'bg-emerald-500';
                    let statusLabel = 'Available';

                    if (slot.status === 'OCCUPIED') {
                      dotColor = 'bg-blue-600';
                      statusLabel = 'Occupied';
                    } else if (slot.status === 'RESERVED') {
                      dotColor = 'bg-amber-400';
                      statusLabel = 'Reserved';
                    } else if (slot.status === 'BLOCKED') {
                      dotColor = 'bg-slate-300';
                      statusLabel = 'Blocked';
                    }

                    return (
                      <div
                        key={slot.id}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-2 ring-blue-500/20'
                            : 'border-slate-200/80 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-base font-black text-slate-900">{slot.slotNumber}</span>
                          <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></span>
                        </div>
                        <div className="text-xs font-semibold text-slate-600">{statusLabel}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate font-mono">
                          {slot.currentOccupant?.vehicleNumber || slot.parkingType}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs text-slate-600 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span>Reserved</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <span>Occupied</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                    <span>Blocked</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Slot Detail Card (Screen 10 Detail Drawer) */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
                {selectedSlot ? (
                  <>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <div className="text-xs text-slate-400 font-semibold uppercase">Slot Details</div>
                        <h3 className="text-xl font-black text-slate-900">{selectedSlot.slotNumber}</h3>
                      </div>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                          selectedSlot.status === 'OCCUPIED'
                            ? 'bg-blue-100 text-blue-800'
                            : selectedSlot.status === 'RESERVED'
                            ? 'bg-amber-100 text-amber-800'
                            : selectedSlot.status === 'AVAILABLE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {selectedSlot.status}
                      </span>
                    </div>

                    {/* Occupant Details if Occupied */}
                    {selectedSlot.currentOccupant ? (
                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Vehicle:</span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {selectedSlot.currentOccupant.vehicleNumber}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Visitor:</span>
                          <span className="font-semibold text-slate-900">
                            {selectedSlot.currentOccupant.visitorName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Flat:</span>
                          <span className="font-semibold text-slate-800">
                            {selectedSlot.currentOccupant.towerName} {selectedSlot.currentOccupant.flatNumber}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Entry Time:</span>
                          <span className="text-slate-800">
                            {new Date(selectedSlot.currentOccupant.actualEntryTime).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Valid Until:</span>
                          <span className="text-slate-800">
                            {new Date(selectedSlot.currentOccupant.validUntil).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>

                        {/* Force Release Section */}
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            Administrative override reason:
                          </label>
                          <input
                            type="text"
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            placeholder="e.g. Vehicle towed / parking violation"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={handleForceRelease}
                            disabled={actionLoading}
                            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm"
                          >
                            Release Slot
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-slate-400 text-xs space-y-1">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto opacity-70" />
                        <p className="font-semibold text-slate-700">Slot is currently free</p>
                        <p className="text-[11px] text-slate-400">Zone: {selectedSlot.zone || 'General'}</p>
                      </div>
                    )}

                    {/* Block / Unblock Button */}
                    <div className="pt-3 border-t border-slate-100">
                      <button
                        onClick={() => handleToggleBlockSlot(selectedSlot.id, selectedSlot.isActive)}
                        className="w-full py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
                      >
                        {selectedSlot.isActive ? 'Block Slot for Maintenance' : 'Unblock Slot'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Select a slot from the map to view details.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SCREEN 11: VISITOR RECORDS */}
        {activeTab === 'visitors' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Visitor records</h1>
                <p className="text-xs text-slate-500">All visitor activity, entry times, and parking session logs.</p>
              </div>

              <button
                onClick={handleExportCsv}
                className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            {/* Filter Bar (Screen 11) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={recordsSearch}
                  onChange={(e) => setRecordsSearch(e.target.value)}
                  placeholder="Search by visitor, vehicle, flat..."
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={recordsFilter}
                  onChange={(e) => setRecordsFilter(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="CHECKED_IN">Parked</option>
                  <option value="SCHEDULED">Upcoming</option>
                  <option value="CHECKED_OUT">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <button
                  onClick={loadRecords}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Data Table (Screen 11) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              {loadingRecords ? (
                <div className="py-12 text-center text-slate-400 text-xs">Loading records...</div>
              ) : records.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">No visitor records found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3.5">Visitor</th>
                        <th className="p-3.5">Vehicle No</th>
                        <th className="p-3.5">Destination</th>
                        <th className="p-3.5">Slot</th>
                        <th className="p-3.5">Entry - Exit</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Pass Code</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {records.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                                {r.visitorName.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-bold text-slate-900">{r.visitorName}</span>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-slate-900">{r.vehicleNumber}</td>
                          <td className="p-3.5">
                            {r.resident.flat?.tower.name} {r.resident.flat?.flatNumber}
                          </td>
                          <td className="p-3.5 font-black text-blue-600">{r.parkingSlot.slotNumber}</td>
                          <td className="p-3.5 text-[11px] text-slate-500">
                            {new Date(r.validFrom).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} – {new Date(r.validUntil).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                r.status === 'CHECKED_IN'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.status === 'SCHEDULED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : r.status === 'CHECKED_OUT'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {r.status === 'CHECKED_IN' ? 'Parked' : r.status === 'CHECKED_OUT' ? 'Exited' : r.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-mono font-semibold text-slate-400">
                            {r.passCode}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCREEN SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Society Settings & Rules</h2>
              <p className="text-xs text-slate-500">Configure parking time limits, society information, and gate policies.</p>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Society Name
                </label>
                <input
                  type="text"
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Society Address
                </label>
                <textarea
                  value={configAddress}
                  onChange={(e) => setConfigAddress(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Visitor Parking Duration (Hours)
                </label>
                <input
                  type="number"
                  value={configMaxDuration}
                  onChange={(e) => setConfigMaxDuration(Number(e.target.value))}
                  min={1}
                  max={72}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="approvalCheck"
                  checked={configApproval}
                  onChange={(e) => setConfigApproval(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="approvalCheck" className="text-xs font-medium text-slate-700">
                  Require resident verification for walk-in arrivals
                </label>
              </div>

              <button
                type="submit"
                disabled={savingConfig}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm"
              >
                {savingConfig ? 'Saving...' : 'Save Configuration'}
              </button>
            </form>
          </div>
        )}

        {/* SCREEN AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Audit logs</h1>
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm divide-y divide-slate-100 text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-800 px-2 py-0.5 rounded bg-blue-50 text-[11px]">
                        {log.action}
                      </span>
                      <span className="font-semibold text-slate-800">{log.actorName}</span>
                    </div>
                    {log.reason && (
                      <div className="text-[11px] text-slate-500 mt-1">Reason: {log.reason}</div>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ADD SLOT MODAL */}
      {isAddSlotOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Parking Slot</h3>
            <p className="text-xs text-slate-500 mb-4">Create a new visitor parking bay.</p>

            <form onSubmit={handleAddSlot} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Slot Number *</label>
                <input
                  type="text"
                  value={newSlotNumber}
                  onChange={(e) => setNewSlotNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. V-21"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vehicle Type</label>
                <select
                  value={newSlotType}
                  onChange={(e) => setNewSlotType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 bg-white"
                >
                  <option value="CAR">Car</option>
                  <option value="SUV">SUV</option>
                  <option value="TWO_WHEELER">Two-Wheeler</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Zone / Area</label>
                <input
                  type="text"
                  value={newSlotZone}
                  onChange={(e) => setNewSlotZone(e.target.value)}
                  placeholder="e.g. Basement 1 or Tower B"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddSlotOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

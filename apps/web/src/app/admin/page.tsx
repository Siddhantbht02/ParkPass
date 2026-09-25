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
  Edit,
  UserPlus,
  Key,
  Mail,
  Shield,
  Copy,
  Check,
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  // Active View: 'overview' (Screen 9), 'parking' (Screen 10), 'visitors' (Screen 11), 'guards', 'residents', 'settings', 'audit'
  const [activeTab, setActiveTab] = useState<'overview' | 'parking' | 'visitors' | 'guards' | 'residents' | 'settings' | 'audit'>('overview');

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

  // Capacity Configuration Modal
  const [isCapacityModalOpen, setIsCapacityModalOpen] = useState(false);
  const [targetCarSlots, setTargetCarSlots] = useState<number>(18);
  const [targetBikeSlots, setTargetBikeSlots] = useState<number>(2);
  const [savingCapacity, setSavingCapacity] = useState(false);

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

  // Users (Guards & Residents) State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [flatsList, setFlatsList] = useState<any[]>([]);
  const [guardSearch, setGuardSearch] = useState('');
  const [residentSearch, setResidentSearch] = useState('');

  // Edit Guard Modal State
  const [isEditGuardOpen, setIsEditGuardOpen] = useState(false);
  const [selectedGuard, setSelectedGuard] = useState<any>(null);
  const [editGuardName, setEditGuardName] = useState('');
  const [editGuardPhone, setEditGuardPhone] = useState('');
  const [editGuardEmail, setEditGuardEmail] = useState('');
  const [editGuardIsActive, setEditGuardIsActive] = useState(true);
  const [editGuardPassword, setEditGuardPassword] = useState('');
  const [savingGuard, setSavingGuard] = useState(false);

  // Add Guard Modal State
  const [isAddGuardOpen, setIsAddGuardOpen] = useState(false);
  const [newGuardName, setNewGuardName] = useState('');
  const [newGuardPhone, setNewGuardPhone] = useState('');
  const [newGuardEmail, setNewGuardEmail] = useState('');
  const [newGuardPassword, setNewGuardPassword] = useState('password123');

  // Edit Resident Modal State
  const [isEditResidentOpen, setIsEditResidentOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<any>(null);
  const [editResidentName, setEditResidentName] = useState('');
  const [editResidentPhone, setEditResidentPhone] = useState('');
  const [editResidentEmail, setEditResidentEmail] = useState('');
  const [editResidentFlatId, setEditResidentFlatId] = useState('');
  const [editResidentIsActive, setEditResidentIsActive] = useState(true);
  const [editResidentPassword, setEditResidentPassword] = useState('');
  const [savingResident, setSavingResident] = useState(false);

  // Add Resident Modal State
  const [isAddResidentOpen, setIsAddResidentOpen] = useState(false);
  const [newResidentName, setNewResidentName] = useState('');
  const [newResidentPhone, setNewResidentPhone] = useState('');
  const [newResidentEmail, setNewResidentEmail] = useState('');
  const [newResidentFlatId, setNewResidentFlatId] = useState('');
  const [newResidentPassword, setNewResidentPassword] = useState('password123');

  // Society Config State (Only Society Name & Address)
  const [societyInfo, setSocietyInfo] = useState<any>(null);
  const [configName, setConfigName] = useState('');
  const [configAddress, setConfigAddress] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  // Pending Registrations State (Resident & Guard Approvals)
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [actionProcessingId, setActionProcessingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

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
      if (data?.stats?.carSlots?.total !== undefined) {
        setTargetCarSlots(data.stats.carSlots.total);
      }
      if (data?.stats?.twoWheelerSlots?.total !== undefined) {
        setTargetBikeSlots(data.stats.twoWheelerSlots.total);
      }
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
      } else if (selectedSlot) {
        // keep selectedSlot reference in sync
        const updated = data.slots?.find((s: any) => s.id === selectedSlot.id);
        if (updated) setSelectedSlot(updated);
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
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await fetchApi('/api/v1/admin/users');
      setUsersList(data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadFlats = async () => {
    try {
      const data = await fetchApi('/api/v1/admin/flats');
      setFlatsList(data.flats || []);
    } catch (err) {
      console.error('Failed to load flats:', err);
    }
  };

  const loadPending = async () => {
    try {
      setLoadingPending(true);
      const data = await fetchApi('/api/v1/admin/pending-approvals');
      setPendingUsers(data.pending || []);
    } catch (err) {
      console.error('Failed to load pending approvals:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    setActionProcessingId(userId);
    try {
      const res = await fetchApi(`/api/v1/admin/approve-user/${userId}`, { method: 'POST' });
      alert(res.message || 'User registration approved successfully!');
      await Promise.all([loadPending(), loadUsers(), loadDashboard()]);
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setActionProcessingId(null);
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!confirm('Are you sure you want to reject this registration request?')) return;
    setActionProcessingId(userId);
    try {
      const res = await fetchApi(`/api/v1/admin/reject-user/${userId}`, { method: 'POST' });
      alert(res.message || 'Registration request rejected.');
      await Promise.all([loadPending(), loadUsers(), loadDashboard()]);
    } catch (err: any) {
      alert(`Rejection failed: ${err.message}`);
    } finally {
      setActionProcessingId(null);
    }
  };

  const copySocietyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      loadDashboard();
      loadSlots();
      loadUsers();
      loadFlats();
      loadPending();
      loadConfig();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'overview') {
      loadDashboard();
      loadSlots();
      loadPending();
    } else if (activeTab === 'parking') {
      loadSlots();
      loadDashboard();
    } else if (activeTab === 'visitors') {
      loadRecords();
    } else if (activeTab === 'guards') {
      loadUsers();
      loadPending();
    } else if (activeTab === 'residents') {
      loadUsers();
      loadFlats();
      loadPending();
    } else if (activeTab === 'audit') {
      loadAudit();
    } else if (activeTab === 'settings') {
      loadConfig();
    }
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
      await Promise.all([loadSlots(), loadDashboard()]);
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
      await Promise.all([loadSlots(), loadDashboard()]);
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
      await Promise.all([loadSlots(), loadDashboard()]);
      if (selectedSlot?.id === slotId) {
        setSelectedSlot((prev: any) =>
          prev
            ? {
                ...prev,
                isActive: !currentActive,
                status: !currentActive ? 'AVAILABLE' : 'BLOCKED',
              }
            : prev
        );
      }
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  // Modify Capacity (Car & Two-Wheeler spaces)
  const handleUpdateCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCapacity(true);
    try {
      const res = await fetchApi('/api/v1/admin/parking-capacity', {
        method: 'POST',
        body: JSON.stringify({
          carSlots: Number(targetCarSlots),
          twoWheelerSlots: Number(targetBikeSlots),
        }),
      });
      alert(res.message || 'Parking spaces capacity updated successfully!');
      setIsCapacityModalOpen(false);
      await Promise.all([loadSlots(), loadDashboard()]);
    } catch (err: any) {
      alert(`Failed to update parking capacity: ${err.message}`);
    } finally {
      setSavingCapacity(false);
    }
  };

  // Change individual slot type
  const handleChangeSlotType = async (slotId: string, newType: string) => {
    setActionLoading(true);
    try {
      await fetchApi(`/api/v1/admin/parking-slots/${slotId}`, {
        method: 'PATCH',
        body: JSON.stringify({ parkingType: newType }),
      });
      await Promise.all([loadSlots(), loadDashboard()]);
      if (selectedSlot?.id === slotId) {
        setSelectedSlot((prev: any) => (prev ? { ...prev, parkingType: newType } : prev));
      }
    } catch (err: any) {
      alert(`Failed to change slot type: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete individual slot
  const handleDeleteSlot = async (slot: any) => {
    if (!confirm(`Are you sure you want to delete parking slot ${slot.slotNumber}?`)) return;
    setActionLoading(true);
    try {
      await fetchApi(`/api/v1/admin/parking-slots/${slot.id}`, {
        method: 'DELETE',
      });
      alert(`Slot ${slot.slotNumber} deleted.`);
      setSelectedSlot(null);
      await Promise.all([loadSlots(), loadDashboard()]);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Save Society Settings (Only Society Name & Address)
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await fetchApi('/api/v1/admin/society-config', {
        method: 'PATCH',
        body: JSON.stringify({
          name: configName.trim(),
          address: configAddress.trim(),
        }),
      });
      alert('Society details saved successfully.');
      loadConfig();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  // Guard Management Handlers
  const openEditGuard = (guard: any) => {
    setSelectedGuard(guard);
    setEditGuardName(guard.name || '');
    setEditGuardPhone(guard.phone || '');
    setEditGuardEmail(guard.email || '');
    setEditGuardIsActive(guard.isActive !== false);
    setEditGuardPassword('');
    setIsEditGuardOpen(true);
  };

  const handleSaveGuard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuard) return;
    setSavingGuard(true);
    try {
      const payload: any = {
        name: editGuardName.trim(),
        phone: editGuardPhone.trim(),
        email: editGuardEmail.trim() || null,
        isActive: editGuardIsActive,
      };
      if (editGuardPassword && editGuardPassword.trim().length >= 6) {
        payload.password = editGuardPassword.trim();
      }
      await fetchApi(`/api/v1/admin/users/${selectedGuard.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      alert('Guard settings updated successfully.');
      setIsEditGuardOpen(false);
      loadUsers();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setSavingGuard(false);
    }
  };

  const handleCreateGuard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGuard(true);
    try {
      await fetchApi('/api/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newGuardName.trim(),
          phone: newGuardPhone.trim(),
          email: newGuardEmail.trim() || null,
          role: 'GUARD',
          password: newGuardPassword.trim() || 'password123',
        }),
      });
      alert('New guard registered successfully.');
      setIsAddGuardOpen(false);
      setNewGuardName('');
      setNewGuardPhone('');
      setNewGuardEmail('');
      setNewGuardPassword('password123');
      loadUsers();
    } catch (err: any) {
      alert(`Create failed: ${err.message}`);
    } finally {
      setSavingGuard(false);
    }
  };

  const handleToggleUserActive = async (targetUser: any) => {
    try {
      await fetchApi(`/api/v1/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !targetUser.isActive }),
      });
      loadUsers();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  // Resident Management Handlers
  const openEditResident = (res: any) => {
    setSelectedResident(res);
    setEditResidentName(res.name || '');
    setEditResidentPhone(res.phone || '');
    setEditResidentEmail(res.email || '');
    setEditResidentFlatId(res.flatId || '');
    setEditResidentIsActive(res.isActive !== false);
    setEditResidentPassword('');
    setIsEditResidentOpen(true);
  };

  const handleSaveResident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResident) return;
    setSavingResident(true);
    try {
      const payload: any = {
        name: editResidentName.trim(),
        phone: editResidentPhone.trim(),
        email: editResidentEmail.trim() || null,
        flatId: editResidentFlatId || null,
        isActive: editResidentIsActive,
      };
      if (editResidentPassword && editResidentPassword.trim().length >= 6) {
        payload.password = editResidentPassword.trim();
      }
      await fetchApi(`/api/v1/admin/users/${selectedResident.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      alert('Resident settings updated successfully.');
      setIsEditResidentOpen(false);
      loadUsers();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setSavingResident(false);
    }
  };

  const handleCreateResident = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingResident(true);
    try {
      await fetchApi('/api/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newResidentName.trim(),
          phone: newResidentPhone.trim(),
          email: newResidentEmail.trim() || null,
          role: 'RESIDENT',
          flatId: newResidentFlatId || null,
          password: newResidentPassword.trim() || 'password123',
        }),
      });
      alert('New resident registered successfully.');
      setIsAddResidentOpen(false);
      setNewResidentName('');
      setNewResidentPhone('');
      setNewResidentEmail('');
      setNewResidentFlatId('');
      setNewResidentPassword('password123');
      loadUsers();
    } catch (err: any) {
      alert(`Create failed: ${err.message}`);
    } finally {
      setSavingResident(false);
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
              onClick={() => setActiveTab('guards')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'guards'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4" />
                <span>Guard Settings</span>
              </div>
              {pendingUsers.filter((u) => u.role === 'GUARD').length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[10px] shadow-xs">
                  {pendingUsers.filter((u) => u.role === 'GUARD').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('residents')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'residents'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4" />
                <span>Resident Settings</span>
              </div>
              {pendingUsers.filter((u) => u.role === 'RESIDENT').length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[10px] shadow-xs">
                  {pendingUsers.filter((u) => u.role === 'RESIDENT').length}
                </span>
              )}
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
              <span>Society Settings</span>
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

              <div className="flex items-center gap-2 flex-wrap">
                {/* Society Unique Code Pill */}
                <div className="px-3.5 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs font-semibold text-blue-900 flex items-center gap-2 shadow-xs">
                  <Key className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-[11px] text-blue-700 font-medium">Society Code:</span>
                  <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                    {dashboardData?.societyCode || societyInfo?.code || 'SKYLINE-101'}
                  </span>
                  <button
                    onClick={() => copySocietyCode(dashboardData?.societyCode || societyInfo?.code || 'SKYLINE-101')}
                    className="p-1 rounded hover:bg-blue-100 text-blue-700 transition-colors"
                    title="Copy unique code to share with residents and guards"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

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

            {/* 4 KPI Cards (Total parking, Occupied, Available, Overdue) with Car/Two-Wheeler details */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Total parking</span>
                <div className="text-3xl font-black text-slate-900">
                  {dashboardData?.stats?.totalSlots ?? parkingSlots.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap font-medium">
                  <span className="text-blue-600 font-bold">{dashboardData?.stats?.carSlots?.total ?? parkingSlots.filter(s => s.parkingType !== 'TWO_WHEELER').length} Cars</span>
                  <span>•</span>
                  <span className="text-purple-600 font-bold">{dashboardData?.stats?.twoWheelerSlots?.total ?? parkingSlots.filter(s => s.parkingType === 'TWO_WHEELER').length} 2W</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Occupied</span>
                <div className="text-3xl font-black text-blue-600">
                  {dashboardData?.stats?.occupiedSlots ?? 0}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap font-medium">
                  <span>{dashboardData?.stats?.carSlots?.occupied ?? 0} Cars</span>
                  <span>•</span>
                  <span>{dashboardData?.stats?.twoWheelerSlots?.occupied ?? 0} 2W</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 block mb-1">Available</span>
                <div className="text-3xl font-black text-emerald-600">
                  {dashboardData?.stats?.availableSlots ?? 0}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap font-medium">
                  <span className="text-emerald-700 font-bold">{dashboardData?.stats?.carSlots?.available ?? 0} Cars</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-bold">{dashboardData?.stats?.twoWheelerSlots?.available ?? 0} 2W</span>
                </div>
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
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Parking occupancy</h2>
                  <p className="text-xs text-slate-500">Live visualization of all {parkingSlots.length} active visitor parking bays</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                    {dashboardData?.stats?.totalSlots ?? parkingSlots.length} Total Bays
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    ({dashboardData?.stats?.carSlots?.total ?? parkingSlots.filter(s => s.parkingType !== 'TWO_WHEELER').length} Cars • {dashboardData?.stats?.twoWheelerSlots?.total ?? parkingSlots.filter(s => s.parkingType === 'TWO_WHEELER').length} Two-Wheelers)
                  </span>
                  <button
                    onClick={() => {
                      setTargetCarSlots(dashboardData?.stats?.carSlots?.total ?? parkingSlots.filter(s => s.parkingType !== 'TWO_WHEELER').length);
                      setTargetBikeSlots(dashboardData?.stats?.twoWheelerSlots?.total ?? parkingSlots.filter(s => s.parkingType === 'TWO_WHEELER').length);
                      setIsCapacityModalOpen(true);
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 underline underline-offset-2 ml-1"
                  >
                    Modify Spaces
                  </button>
                </div>
              </div>

              {/* Progress Visualization Pillars - fully dynamic */}
              <div className="grid grid-cols-5 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-20 gap-1.5 py-2">
                {parkingSlots.map((slotObj, i) => {
                  const slotNum = slotObj.slotNumber;
                  const isOcc = slotObj?.status === 'OCCUPIED';
                  const isRes = slotObj?.status === 'RESERVED';
                  const isBlk = slotObj?.status === 'BLOCKED';

                  let color = 'bg-emerald-500';
                  if (isOcc) color = 'bg-blue-600';
                  else if (isRes) color = 'bg-amber-400';
                  else if (isBlk) color = 'bg-slate-300';

                  const typeLabel = slotObj.parkingType === 'TWO_WHEELER' ? '2W' : 'Car';

                  return (
                    <div
                      key={slotObj.id || slotNum}
                      onClick={() => {
                        setSelectedSlot(slotObj);
                        setActiveTab('parking');
                      }}
                      className={`h-12 rounded-lg ${color} flex flex-col items-center justify-center text-[10px] font-bold text-white shadow-sm transition-transform hover:scale-105 cursor-pointer`}
                      title={`${slotNum} (${slotObj.parkingType}): ${slotObj?.status || 'Available'}`}
                    >
                      <span>{slotNum}</span>
                      <span className="text-[8px] font-normal opacity-90">{typeLabel}</span>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-5 text-xs text-slate-600 pt-2 border-t border-slate-100 flex-wrap">
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
                <div className="ml-auto text-[11px] text-slate-400 italic">
                  Click any bay to view or manage
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
                <p className="text-xs text-slate-500">Monitor all designated parking bays, resolve conflicts, and modify society spaces.</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setTargetCarSlots(dashboardData?.stats?.carSlots?.total ?? parkingSlots.filter(s => s.parkingType !== 'TWO_WHEELER').length);
                    setTargetBikeSlots(dashboardData?.stats?.twoWheelerSlots?.total ?? parkingSlots.filter(s => s.parkingType === 'TWO_WHEELER').length);
                    setIsCapacityModalOpen(true);
                  }}
                  className="py-2 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Settings className="w-3.5 h-3.5 text-blue-600" />
                  <span>Modify Parking Spaces</span>
                </button>
                <button
                  onClick={() => setIsAddSlotOpen(true)}
                  className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add parking slot</span>
                </button>
              </div>
            </div>

            {/* Quick Capacity Control & Stats Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3 bg-blue-50/70 border border-blue-100 px-4 py-2.5 rounded-xl">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    🚗
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Car Parking Spaces</div>
                    <div className="text-base font-black text-slate-900">
                      {dashboardData?.stats?.carSlots?.total ?? parkingSlots.filter(s => s.parkingType !== 'TWO_WHEELER').length} bays
                      <span className="text-xs font-semibold text-emerald-600 ml-2">
                        ({dashboardData?.stats?.carSlots?.available ?? parkingSlots.filter(s => s.parkingType !== 'TWO_WHEELER' && s.status === 'AVAILABLE').length} free)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-purple-50/70 border border-purple-100 px-4 py-2.5 rounded-xl">
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    🛵
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Two-Wheeler Spaces</div>
                    <div className="text-base font-black text-slate-900">
                      {dashboardData?.stats?.twoWheelerSlots?.total ?? parkingSlots.filter(s => s.parkingType === 'TWO_WHEELER').length} bays
                      <span className="text-xs font-semibold text-emerald-600 ml-2">
                        ({dashboardData?.stats?.twoWheelerSlots?.available ?? parkingSlots.filter(s => s.parkingType === 'TWO_WHEELER' && s.status === 'AVAILABLE').length} free)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Two-Column Layout (Parking Map + Detail Drawer) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Parking Map Grid */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-base font-bold text-slate-900">Parking map</h2>
                  <span className="text-xs text-slate-500 font-medium">
                    {parkingSlots.length} designated bays ({parkingSlots.filter(s => s.parkingType !== 'TWO_WHEELER').length} Car • {parkingSlots.filter(s => s.parkingType === 'TWO_WHEELER').length} Two-Wheeler)
                  </span>
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

                    const typeBadge = slot.parkingType === 'TWO_WHEELER' ? '2W' : 'Car';

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
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${slot.parkingType === 'TWO_WHEELER' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                              {typeBadge}
                            </span>
                            <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></span>
                          </div>
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
                <div className="flex items-center gap-4 text-xs text-slate-600 pt-3 border-t border-slate-100 flex-wrap">
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
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black text-slate-900">{selectedSlot.slotNumber}</h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${selectedSlot.parkingType === 'TWO_WHEELER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {selectedSlot.parkingType === 'TWO_WHEELER' ? 'Two-Wheeler' : 'Car'}
                          </span>
                        </div>
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
                        <p className="text-[11px] text-slate-400">Zone: {selectedSlot.zone || 'General'} • Floor: {selectedSlot.floor || 'G'}</p>
                      </div>
                    )}

                    {/* Change Vehicle Type Selector */}
                    <div className="pt-3 border-t border-slate-100 space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Designated Space Type:
                      </label>
                      <select
                        value={selectedSlot.parkingType || 'CAR'}
                        onChange={(e) => handleChangeSlotType(selectedSlot.id, e.target.value)}
                        disabled={actionLoading || selectedSlot.status === 'OCCUPIED'}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                      >
                        <option value="CAR">Car</option>
                        <option value="SUV">SUV</option>
                        <option value="TWO_WHEELER">Two-Wheeler</option>
                      </select>
                      {selectedSlot.status === 'OCCUPIED' && (
                        <p className="text-[10px] text-slate-400">Cannot change vehicle type while occupied.</p>
                      )}
                    </div>

                    {/* Block / Unblock and Delete Buttons */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <button
                        onClick={() => handleToggleBlockSlot(selectedSlot.id, selectedSlot.isActive)}
                        className="w-full py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
                      >
                        {selectedSlot.isActive ? 'Block Slot for Maintenance' : 'Unblock Slot'}
                      </button>

                      {selectedSlot.status !== 'OCCUPIED' && selectedSlot.status !== 'RESERVED' && (
                        <button
                          onClick={() => handleDeleteSlot(selectedSlot)}
                          disabled={actionLoading}
                          className="w-full py-2 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-xs transition-colors"
                        >
                          Delete Space
                        </button>
                      )}
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

        {/* SCREEN GUARDS SETTINGS */}
        {activeTab === 'guards' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Guard Settings</h1>
                <p className="text-xs text-slate-500">Manage security personnel, contact information, credentials, and gate duty access.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddGuardOpen(true)}
                  className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add New Guard</span>
                </button>
              </div>
            </div>

            {/* PENDING GUARD APPROVALS SECTION */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Pending Guard Registration Requests</span>
                      {pendingUsers.filter((u) => u.role === 'GUARD').length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                          {pendingUsers.filter((u) => u.role === 'GUARD').length} Pending
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500">Security personnel who signed up using Society Code and need approval before gate access.</p>
                  </div>
                </div>

                <button
                  onClick={loadPending}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
                  title="Refresh pending requests"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPending ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {pendingUsers.filter((u) => u.role === 'GUARD').length === 0 ? (
                <div className="py-3 px-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>All guard registrations are approved. No pending requests.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-amber-50/60 border-b border-amber-100 text-amber-900 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Applicant Name</th>
                        <th className="p-3">Mobile Phone</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Applied Date</th>
                        <th className="p-3 text-right">Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingUsers
                        .filter((u) => u.role === 'GUARD')
                        .map((g: any) => (
                          <tr key={g.id} className="hover:bg-amber-50/30 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{g.name}</div>
                              <div className="text-[10px] text-amber-700 font-medium">Awaiting Guard Clearance</div>
                            </td>
                            <td className="p-3 font-mono font-medium text-slate-800">{g.phone}</td>
                            <td className="p-3 text-slate-500">{g.email || '—'}</td>
                            <td className="p-3 text-slate-500">
                              {g.createdAt
                                ? new Date(g.createdAt).toLocaleDateString('en-IN', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Recently'}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleApproveUser(g.id)}
                                  disabled={actionProcessingId === g.id}
                                  className="py-1 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{actionProcessingId === g.id ? 'Approving...' : 'Approve'}</span>
                                </button>
                                <button
                                  onClick={() => handleRejectUser(g.id)}
                                  disabled={actionProcessingId === g.id}
                                  className="py-1 px-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs flex items-center gap-1 disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={guardSearch}
                  onChange={(e) => setGuardSearch(e.target.value)}
                  placeholder="Search guard by name or phone..."
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadUsers}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 text-xs font-semibold"
                  title="Refresh guards"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Guards Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              {loadingUsers ? (
                <div className="py-12 text-center text-slate-400 text-xs">Loading guard accounts...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3.5">Guard Personnel</th>
                        <th className="p-3.5">Phone Number</th>
                        <th className="p-3.5">Email Address</th>
                        <th className="p-3.5">Duty Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usersList
                        .filter((u) => u.role === 'GUARD')
                        .filter((u) =>
                          guardSearch
                            ? u.name.toLowerCase().includes(guardSearch.toLowerCase()) ||
                              u.phone.includes(guardSearch)
                            : true
                        )
                        .map((guard) => (
                          <tr key={guard.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                                  {guard.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{guard.name}</div>
                                  <div className="text-[10px] text-slate-400">Security Guard</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 font-mono font-semibold text-slate-800">
                              {guard.phone}
                            </td>
                            <td className="p-3.5 text-slate-600">
                              {guard.email || <span className="text-slate-400 italic">Not set</span>}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                  guard.isActive !== false
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {guard.isActive !== false ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right space-x-2">
                              <button
                                onClick={() => openEditGuard(guard)}
                                className="py-1 px-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] transition-colors"
                              >
                                Edit Settings
                              </button>
                              <button
                                onClick={() => handleToggleUserActive(guard)}
                                className={`py-1 px-2.5 rounded-lg border font-semibold text-[11px] transition-colors ${
                                  guard.isActive !== false
                                    ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                }`}
                              >
                                {guard.isActive !== false ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {usersList.filter((u) => u.role === 'GUARD').length === 0 && (
                    <div className="py-12 text-center text-slate-400 text-xs">No guards found in this society.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCREEN RESIDENTS SETTINGS */}
        {activeTab === 'residents' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Resident Settings</h1>
                <p className="text-xs text-slate-500">Manage resident directory, flat assignments, phone contacts, and access permissions.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddResidentOpen(true)}
                  className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add New Resident</span>
                </button>
              </div>
            </div>

            {/* PENDING RESIDENT APPROVALS SECTION */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Pending Resident Registration Requests</span>
                      {pendingUsers.filter((u) => u.role === 'RESIDENT').length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                          {pendingUsers.filter((u) => u.role === 'RESIDENT').length} Pending
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500">Residents who registered using Society Code and need admin approval before booking visitor passes.</p>
                  </div>
                </div>

                <button
                  onClick={loadPending}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
                  title="Refresh pending requests"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPending ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {pendingUsers.filter((u) => u.role === 'RESIDENT').length === 0 ? (
                <div className="py-3 px-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>All resident registrations are approved. No pending requests.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-blue-50/60 border-b border-blue-100 text-blue-900 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Resident Applicant</th>
                        <th className="p-3">Claimed Flat / Tower</th>
                        <th className="p-3">Mobile Phone</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Applied Date</th>
                        <th className="p-3 text-right">Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pendingUsers
                        .filter((u) => u.role === 'RESIDENT')
                        .map((r: any) => (
                          <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{r.name}</div>
                              <div className="text-[10px] text-blue-700 font-medium">New Resident Request</div>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-800 text-[11px] border border-slate-200">
                                {r.towerName || 'Tower'} Flat {r.flatNumber || '—'}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-medium text-slate-800">{r.phone}</td>
                            <td className="p-3 text-slate-500">{r.email || '—'}</td>
                            <td className="p-3 text-slate-500">
                              {r.createdAt
                                ? new Date(r.createdAt).toLocaleDateString('en-IN', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Recently'}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleApproveUser(r.id)}
                                  disabled={actionProcessingId === r.id}
                                  className="py-1 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{actionProcessingId === r.id ? 'Approving...' : 'Approve'}</span>
                                </button>
                                <button
                                  onClick={() => handleRejectUser(r.id)}
                                  disabled={actionProcessingId === r.id}
                                  className="py-1 px-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs flex items-center gap-1 disabled:opacity-50"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={residentSearch}
                  onChange={(e) => setResidentSearch(e.target.value)}
                  placeholder="Search resident by name, phone, or flat..."
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    loadUsers();
                    loadFlats();
                  }}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center gap-1.5 text-xs font-semibold"
                  title="Refresh residents"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Residents Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              {loadingUsers ? (
                <div className="py-12 text-center text-slate-400 text-xs">Loading residents directory...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3.5">Resident</th>
                        <th className="p-3.5">Flat & Tower</th>
                        <th className="p-3.5">Phone Number</th>
                        <th className="p-3.5">Email Address</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usersList
                        .filter((u) => u.role === 'RESIDENT')
                        .filter((u) => {
                          if (!residentSearch) return true;
                          const q = residentSearch.toLowerCase();
                          return (
                            u.name.toLowerCase().includes(q) ||
                            u.phone.includes(q) ||
                            (u.flatNumber && u.flatNumber.toLowerCase().includes(q)) ||
                            (u.towerName && u.towerName.toLowerCase().includes(q))
                          );
                        })
                        .map((res) => (
                          <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                                  {res.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{res.name}</div>
                                  <div className="text-[10px] text-slate-400">Society Resident</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5">
                              {res.flatNumber ? (
                                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                                  {res.towerName} {res.flatNumber}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Unassigned</span>
                              )}
                            </td>
                            <td className="p-3.5 font-mono font-semibold text-slate-800">
                              {res.phone}
                            </td>
                            <td className="p-3.5 text-slate-600">
                              {res.email || <span className="text-slate-400 italic">Not set</span>}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                  res.isActive !== false
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {res.isActive !== false ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right space-x-2">
                              <button
                                onClick={() => openEditResident(res)}
                                className="py-1 px-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] transition-colors"
                              >
                                Edit Settings
                              </button>
                              <button
                                onClick={() => handleToggleUserActive(res)}
                                className={`py-1 px-2.5 rounded-lg border font-semibold text-[11px] transition-colors ${
                                  res.isActive !== false
                                    ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                }`}
                              >
                                {res.isActive !== false ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {usersList.filter((u) => u.role === 'RESIDENT').length === 0 && (
                    <div className="py-12 text-center text-slate-400 text-xs">No residents found in this society.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCREEN SETTINGS - ONLY SOCIETY NAME & ADDRESS CAN BE CHANGED */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in duration-200 max-w-2xl">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Society Settings</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Modify the registered society name and physical address for this society.
                </p>
              </div>

              {/* Society Unique Code Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block mb-0.5">
                    Official Society Unique ID Code
                  </span>
                  <div className="text-2xl font-black font-mono text-slate-900 tracking-wider">
                    {societyInfo?.code || dashboardData?.societyCode || 'SKYLINE-101'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Share this unique code with residents and security guards so they can submit their join requests.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copySocietyCode(societyInfo?.code || dashboardData?.societyCode || 'SKYLINE-101')}
                  className="px-3.5 py-2 rounded-xl bg-white border border-blue-300 text-xs font-bold text-blue-700 hover:bg-blue-50 flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied Code!' : 'Copy Code'}</span>
                </button>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Society Name *
                  </label>
                  <input
                    type="text"
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    required
                    placeholder="e.g. Whispering Palms CHS"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">This name appears on all passes, receipts, and guard entry portals.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Society Address *
                  </label>
                  <textarea
                    value={configAddress}
                    onChange={(e) => setConfigAddress(e.target.value)}
                    required
                    rows={3}
                    placeholder="Enter full physical address..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Physical address used for visitor navigation and gate directions.</p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-60"
                  >
                    {savingConfig ? 'Saving...' : 'Save Society Details'}
                  </button>
                </div>
              </form>
            </div>
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

      {/* MODIFY CAPACITY MODAL */}
      {isCapacityModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Modify Parking Spaces</h3>
                <p className="text-xs text-slate-500">Configure total number of car and two-wheeler bays.</p>
              </div>
              <button
                onClick={() => setIsCapacityModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCapacity} className="space-y-4 text-xs">
              {/* Car Parking Spaces Field */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🚗</span>
                    <label className="font-bold text-slate-900">Car Parking Spaces</label>
                  </div>
                  <span className="text-[11px] font-semibold text-blue-600">
                    Currently: {parkingSlots.filter((s) => s.parkingType !== 'TWO_WHEELER').length}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetCarSlots((prev) => Math.max(0, prev - 1))}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-800 font-black text-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={targetCarSlots}
                    onChange={(e) => setTargetCarSlots(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 py-2 px-3 text-center text-lg font-black text-slate-900 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setTargetCarSlots((prev) => prev + 1)}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-800 font-black text-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
                  >
                    +
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Includes Standard & SUV bays. Reducing capacity will remove unreserved bays.
                </p>
              </div>

              {/* Two Wheeler Spaces Field */}
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🛵</span>
                    <label className="font-bold text-slate-900">Two-Wheeler Parking Spaces</label>
                  </div>
                  <span className="text-[11px] font-semibold text-purple-600">
                    Currently: {parkingSlots.filter((s) => s.parkingType === 'TWO_WHEELER').length}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetBikeSlots((prev) => Math.max(0, prev - 1))}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-800 font-black text-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={targetBikeSlots}
                    onChange={(e) => setTargetBikeSlots(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 py-2 px-3 text-center text-lg font-black text-slate-900 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setTargetBikeSlots((prev) => prev + 1)}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-800 font-black text-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
                  >
                    +
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Dedicated scooter and motorcycle bays for visitors.
                </p>
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between px-2 text-slate-600">
                <span className="font-semibold">New Total Spaces:</span>
                <span className="text-base font-black text-slate-900">
                  {Number(targetCarSlots) + Number(targetBikeSlots)} Bays
                </span>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingCapacity}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {savingCapacity ? 'Updating Spaces...' : 'Apply Space Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCapacityModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT GUARD SETTINGS MODAL */}
      {isEditGuardOpen && selectedGuard && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Guard Settings</h3>
                  <p className="text-xs text-slate-500">Update security staff profile and duty status.</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditGuardOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGuard} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editGuardName}
                  onChange={(e) => setEditGuardName(e.target.value)}
                  required
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number (Login ID) *</label>
                <input
                  type="text"
                  value={editGuardPhone}
                  onChange={(e) => setEditGuardPhone(e.target.value)}
                  required
                  placeholder="e.g. +919876543220"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editGuardEmail}
                  onChange={(e) => setEditGuardEmail(e.target.value)}
                  placeholder="e.g. guard@society.com (optional)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="font-bold text-slate-800">Duty / Access Status</div>
                  <div className="text-[11px] text-slate-500">Allow guard to log into guard terminal</div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditGuardIsActive(!editGuardIsActive)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    editGuardIsActive ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {editGuardIsActive ? 'Active' : 'Inactive'}
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reset Password <span className="font-normal text-slate-400">(leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  value={editGuardPassword}
                  onChange={(e) => setEditGuardPassword(e.target.value)}
                  placeholder="New password (min 6 characters)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingGuard}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {savingGuard ? 'Saving...' : 'Save Guard Settings'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditGuardOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW GUARD MODAL */}
      {isAddGuardOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add New Guard</h3>
                  <p className="text-xs text-slate-500">Register a new security staff member.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddGuardOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGuard} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newGuardName}
                  onChange={(e) => setNewGuardName(e.target.value)}
                  required
                  placeholder="e.g. Ramesh Patil"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number (Login Identifier) *</label>
                <input
                  type="text"
                  value={newGuardPhone}
                  onChange={(e) => setNewGuardPhone(e.target.value)}
                  required
                  placeholder="e.g. +919876543225"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newGuardEmail}
                  onChange={(e) => setNewGuardEmail(e.target.value)}
                  placeholder="e.g. guard@society.com (optional)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Default Password *</label>
                <input
                  type="password"
                  value={newGuardPassword}
                  onChange={(e) => setNewGuardPassword(e.target.value)}
                  required
                  placeholder="Password (min 6 characters)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingGuard}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {savingGuard ? 'Creating...' : 'Register Guard'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddGuardOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT RESIDENT SETTINGS MODAL */}
      {isEditResidentOpen && selectedResident && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Resident Settings</h3>
                  <p className="text-xs text-slate-500">Update apartment owner details and flat allotment.</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditResidentOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResident} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editResidentName}
                  onChange={(e) => setEditResidentName(e.target.value)}
                  required
                  placeholder="e.g. Siddhant Bhatnagar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Flat Assignment</label>
                <select
                  value={editResidentFlatId}
                  onChange={(e) => setEditResidentFlatId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select Flat...</option>
                  {flatsList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.tower?.name} - Flat {f.flatNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number (Login ID) *</label>
                <input
                  type="text"
                  value={editResidentPhone}
                  onChange={(e) => setEditResidentPhone(e.target.value)}
                  required
                  placeholder="e.g. +919876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editResidentEmail}
                  onChange={(e) => setEditResidentEmail(e.target.value)}
                  placeholder="e.g. resident@email.com (optional)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="font-bold text-slate-800">Account Status</div>
                  <div className="text-[11px] text-slate-500">Allow resident to generate visitor passes</div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditResidentIsActive(!editResidentIsActive)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    editResidentIsActive ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {editResidentIsActive ? 'Active' : 'Inactive'}
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reset Password <span className="font-normal text-slate-400">(leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  value={editResidentPassword}
                  onChange={(e) => setEditResidentPassword(e.target.value)}
                  placeholder="New password (min 6 characters)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingResident}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {savingResident ? 'Saving...' : 'Save Resident Settings'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditResidentOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW RESIDENT MODAL */}
      {isAddResidentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add New Resident</h3>
                  <p className="text-xs text-slate-500">Register a new resident with flat assignment.</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddResidentOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateResident} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newResidentName}
                  onChange={(e) => setNewResidentName(e.target.value)}
                  required
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Flat Assignment</label>
                <select
                  value={newResidentFlatId}
                  onChange={(e) => setNewResidentFlatId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select Flat...</option>
                  {flatsList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.tower?.name} - Flat {f.flatNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number (Login ID) *</label>
                <input
                  type="text"
                  value={newResidentPhone}
                  onChange={(e) => setNewResidentPhone(e.target.value)}
                  required
                  placeholder="e.g. +919876543299"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newResidentEmail}
                  onChange={(e) => setNewResidentEmail(e.target.value)}
                  placeholder="e.g. priya@example.com (optional)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Default Password *</label>
                <input
                  type="password"
                  value={newResidentPassword}
                  onChange={(e) => setNewResidentPassword(e.target.value)}
                  required
                  placeholder="Password (min 6 characters)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingResident}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {savingResident ? 'Creating...' : 'Register Resident'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddResidentOpen(false)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
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

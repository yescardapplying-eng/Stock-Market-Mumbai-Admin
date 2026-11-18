'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Users,
  LayoutGrid,
  MessageSquare,
  Calendar,
  Search,
  RotateCcw,
  Download,
  Table as TableIcon,
  Eye,
  Trash2,
  LogOut,
  X,
  Phone,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';
import type { LeadRecord } from '@/lib/admin-db';

interface Stats {
  total: number;
  popup: number;
  contact: number;
  today: number;
}

interface Pagination {
  current_page: number;
  limit: number;
  total_items: number;
  total_pages: number;
  has_prev: boolean;
  has_next: boolean;
}

export default function AdminDashboardClient({ username }: { username: string }) {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, popup: 0, contact: 0, today: 0 });
  const [pagination, setPagination] = useState<Pagination>({
    current_page: 1,
    limit: 100,
    total_items: 0,
    total_pages: 1,
    has_prev: false,
    has_next: false,
  });
  const [storageMode, setStorageMode] = useState<'mysql' | 'preview'>('mysql');
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [formType, setFormType] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateMode, setDateMode] = useState<'single' | 'range'>('single');
  const [singleDate, setSingleDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
  const [editStatus, setEditStatus] = useState<LeadRecord['status']>('new');
  const [editNotes, setEditNotes] = useState('');
  const [savingDossier, setSavingDossier] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<LeadRecord | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const [refreshTick, setRefreshTick] = useState(0);

  const loadLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        form_type: formType,
        status: statusFilter,
        search: debouncedSearch,
      });
      if (dateMode === 'single' && singleDate) {
        params.set('date', singleDate);
      } else if (dateMode === 'range') {
        if (dateFrom) params.set('date_from', dateFrom);
        if (dateTo) params.set('date_to', dateTo);
      }

      const res = await fetch(`/api/leads?${params.toString()}`, { cache: 'no-store' });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setLeads(json.data || []);
        setStats(json.stats || { total: 0, popup: 0, contact: 0, today: 0 });
        setPagination(json.pagination);
        setStorageMode(json.storageMode || 'preview');
      }
    } catch {
      showToast('Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  }, [page, limit, formType, statusFilter, debouncedSearch, dateMode, singleDate, dateFrom, dateTo, router]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) {
        await loadLeads();
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [loadLeads, refreshTick]);

  const triggerReload = () => {
    setLoading(true);
    setRefreshTick((t) => t + 1);
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const handleReset = () => {
    setSearch('');
    setDebouncedSearch('');
    setFormType('all');
    setStatusFilter('all');
    setSingleDate('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    setLoading(true);
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams({
      form_type: formType,
      status: statusFilter,
      search: debouncedSearch,
    });
    if (dateMode === 'single' && singleDate) params.set('date', singleDate);
    else {
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
    }
    const anchor = document.createElement('a');
    anchor.href = `/api/export-csv?${params.toString()}`;
    anchor.download = `stock-market-mumbai-leads.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const openDossier = (lead: LeadRecord) => {
    setSelectedLead(lead);
    setEditStatus(lead.status);
    setEditNotes(lead.notes || '');
  };

  const saveDossier = async () => {
    if (!selectedLead) return;
    setSavingDossier(true);
    try {
      const res = await fetch('/api/lead-detail', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedLead.id,
          status: editStatus,
          notes: editNotes,
        }),
      });
      if (res.ok) {
        showToast('Lead updated successfully');
        setSelectedLead(null);
        triggerReload();
      }
    } finally {
      setSavingDossier(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const res = await fetch(`/api/delete-lead?id=${deleteTarget.id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Inquiry deleted');
      setDeleteTarget(null);
      triggerReload();
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B]">
      {/* Top Bar */}
      <header className="bg-[#0B2545] text-white border-b border-[#13345E] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white p-1.5 rounded-lg shrink-0">
              <Image
                src="/images/brand/stock-market-mumbai-logo.png"
                alt="Stock Market Mumbai"
                width={150}
                height={50}
                className="h-7 w-auto object-contain"
              />
            </div>
            <div className="hidden sm:block truncate">
              <div className="text-sm font-extrabold tracking-wide">STOCK MARKET MUMBAI ADMIN</div>
              <div className="text-[11px] text-slate-300">Lead &amp; Inquiry Desk • Asia/Kolkata (IST)</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span
              className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                storageMode === 'mysql'
                  ? 'bg-[#16A34A]/20 text-[#4ADE80] border-[#16A34A]/40'
                  : 'bg-amber-500/20 text-amber-200 border-amber-400/30'
              }`}
            >
              <Database className="w-3 h-3" />
              {storageMode === 'mysql' ? 'MySQL Live' : 'Preview Store (Set DB_HOST for MySQL)'}
            </span>

            <div className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-semibold hidden sm:flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
              <span>{username}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-600 text-red-100 hover:text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Stat Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Inquiries</p>
              <p className="text-2xl sm:text-3xl font-black text-[#0B2545] mt-1">{stats.total}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#0B2545]/10 text-[#0B2545] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Popup Leads</p>
              <p className="text-2xl sm:text-3xl font-black text-[#16A34A] mt-1">{stats.popup}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
              <LayoutGrid className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Contact Us</p>
              <p className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">{stats.contact}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Today (IST)</p>
              <p className="text-2xl sm:text-3xl font-black text-purple-600 mt-1">{stats.today}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </section>

        {/* Filters Toolbar */}
        <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
            <div className="lg:col-span-4">
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Search Inquiries
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, phone, state, segment..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-[#16A34A] outline-hidden"
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Source Form
              </label>
              <select
                value={formType}
                onChange={(e) => {
                  setFormType(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white"
              >
                <option value="all">All Sources</option>
                <option value="popup">Popup Form</option>
                <option value="contact">Contact Us</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="enrolled">Enrolled</option>
                <option value="not_interested">Not Interested</option>
                <option value="invalid">Invalid</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase text-slate-500">Date (IST)</label>
                <button
                  type="button"
                  onClick={() => setDateMode(dateMode === 'single' ? 'range' : 'single')}
                  className="text-[11px] font-semibold text-[#16A34A] hover:underline cursor-pointer"
                >
                  {dateMode === 'single' ? 'Range' : 'Single'}
                </button>
              </div>
              {dateMode === 'single' ? (
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => {
                    setSingleDate(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
                />
              ) : (
                <div className="flex gap-1.5">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-1/2 px-2 py-2 text-xs rounded-xl border border-slate-300"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-1/2 px-2 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              )}
            </div>

            <div className="lg:col-span-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-[#0B2545] hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                className="flex-1 px-3 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
            </div>
          </div>
        </section>

        {/* Table / Cards Container */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-[#0B2545]">Incoming Inquiries</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#15803D]">
                {pagination.total_items} Records
              </span>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-[#0B2545] shadow-xs' : 'text-slate-500'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white text-[#0B2545] shadow-xs' : 'text-slate-500'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">Loading inquiries...</div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No inquiries found yet. Submissions from Stock Market Mumbai Popup &amp; Contact Us forms will appear here live.
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[780px]">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Ref ID • IST Time</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Mobile</th>
                    <th className="py-3 px-4">State</th>
                    <th className="py-3 px-4">Focus / Message</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono text-xs font-bold text-[#0B2545]">{lead.lead_reference}</div>
                        <div className="text-[11px] text-slate-400">{lead.created_at_formatted}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            lead.form_type === 'popup'
                              ? 'bg-[#DCFCE7] text-[#15803D]'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {lead.form_type === 'popup' ? 'Popup Form' : 'Contact Us'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#0B2545]">{lead.full_name}</td>
                      <td className="py-3 px-4 font-mono">+91 {lead.mobile_number}</td>
                      <td className="py-3 px-4 text-slate-600">{lead.state || '—'}</td>
                      <td className="py-3 px-4 max-w-[220px] truncate text-slate-600">
                        {lead.form_type === 'popup'
                          ? `${lead.segment || '—'} • ${lead.capital_range || '—'}`
                          : lead.message || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-[#0B2545] capitalize">
                          {lead.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openDossier(lead)}
                          className="p-2 rounded-lg bg-[#0B2545]/10 hover:bg-[#0B2545] text-[#0B2545] hover:text-white transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(lead)}
                          className="p-2 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {leads.map((lead) => (
                <div key={lead.id} className="rounded-2xl border border-slate-200 p-4 space-y-2.5 bg-[#F8FAFC]">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        lead.form_type === 'popup' ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {lead.form_type === 'popup' ? 'Popup Form' : 'Contact Us'}
                    </span>
                    <span className="text-[11px] text-slate-400">{lead.time_ago}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#0B2545]">{lead.full_name}</h3>
                    <p className="text-xs font-mono text-slate-600">+91 {lead.mobile_number}</p>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {lead.form_type === 'popup'
                      ? `${lead.segment || '—'} (${lead.capital_range || '—'})`
                      : lead.message || 'No message'}
                  </p>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400">{lead.lead_reference}</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => openDossier(lead)}
                        className="px-2.5 py-1 rounded-lg bg-[#0B2545] text-white text-xs font-bold cursor-pointer"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(lead)}
                        className="px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-bold cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="p-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing page {pagination.current_page} of {pagination.total_pages} ({pagination.total_items} total)
            </div>
            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100 / page</option>
                <option value={200}>200</option>
              </select>

              <button
                type="button"
                disabled={!pagination.has_prev}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              <button
                type="button"
                disabled={!pagination.has_next}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Lead Dossier Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-[#0B2545]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#0B2545] text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Inquiry Dossier</h3>
                <span className="text-xs font-mono text-[#4ADE80]">{selectedLead.lead_reference}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                  <span className="text-slate-400 block">Full Name</span>
                  <strong className="text-[#0B2545]">{selectedLead.full_name}</strong>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                  <span className="text-slate-400 block">Mobile Number</span>
                  <strong className="text-[#0B2545]">+91 {selectedLead.mobile_number}</strong>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                  <span className="text-slate-400 block">State</span>
                  <strong>{selectedLead.state || '—'}</strong>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                  <span className="text-slate-400 block">Submitted (IST)</span>
                  <strong>{selectedLead.created_at_formatted}</strong>
                </div>
                {selectedLead.form_type === 'popup' ? (
                  <>
                    <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                      <span className="text-slate-400 block">Segment</span>
                      <strong>{selectedLead.segment || '—'}</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                      <span className="text-slate-400 block">Capital Range</span>
                      <strong>{selectedLead.capital_range || '—'}</strong>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                    <span className="text-slate-400 block">Message</span>
                    <p className="mt-1 text-[#1E293B]">{selectedLead.message || '—'}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <a
                  href={`tel:+91${selectedLead.mobile_number}`}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#0B2545] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call Learner
                </a>
                <a
                  href={`https://wa.me/91${selectedLead.mobile_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#16A34A] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5"
                >
                  WhatsApp
                </a>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Counselor Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as LeadRecord['status'])}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="enrolled">Enrolled</option>
                    <option value="not_interested">Not Interested</option>
                    <option value="invalid">Invalid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Counselor Notes
                  </label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add follow-up notes..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300"
                  />
                </div>
                <button
                  type="button"
                  onClick={saveDossier}
                  disabled={savingDossier}
                  className="w-full py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold cursor-pointer"
                >
                  {savingDossier ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-[#0B2545]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-[#0B2545]">Delete Inquiry?</h3>
            <p className="text-xs text-slate-600">
              Permanently delete <strong className="font-mono">{deleteTarget.lead_reference}</strong> ({deleteTarget.full_name})?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0B2545] text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { Invoice, InvoiceStatus, InvoiceType } from '../types';
import { printInvoice } from '../utils/invoiceUtils';
import {
  FileText,
  Download,
  Printer,
  CheckCircle2,
  Send,
  DollarSign,
  ChevronDown,
  Search,
  ArrowLeft,
} from 'lucide-react';

interface InvoicesViewProps {
  invoices: Invoice[];
  onUpdateInvoice: (invoiceId: string, updates: Partial<Invoice>) => void;
  onBack: () => void;
}

const TYPE_LABELS: Record<InvoiceType, string> = {
  deposit: 'Deposit (30%)',
  material_delivery: 'Material Delivery (30%)',
  final_payment: 'Final Payment (40%)',
};

const STATUS_BADGE: Record<InvoiceStatus, { label: string; classes: string }> = {
  draft: { label: 'Draft', classes: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]' },
  sent: { label: 'Sent', classes: 'bg-amber-500/15 text-amber-500 border border-amber-500/25' },
  paid: { label: 'Paid', classes: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/25' },
};

const YEAR_OPTIONS = ['All Years', '2024', '2025', '2026'];

const formatCAD = (n: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);

const formatDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' }) : '\u2014';

const InvoicesView: React.FC<InvoicesViewProps> = ({ invoices, onUpdateInvoice, onBack }) => {
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all');
  const [filterYear, setFilterYear] = useState('All Years');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'issuedDate' | 'total' | 'status'>('issuedDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [paidDateInput, setPaidDateInput] = useState<Record<string, string>>({});
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  const filtered = useMemo(() => {
    let list = [...invoices];

    if (filterStatus !== 'all') {
      list = list.filter(i => i.status === filterStatus);
    }

    if (filterYear !== 'All Years') {
      list = list.filter(i => i.invoiceNumber.startsWith(`INV-${filterYear}-`));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.customerName.toLowerCase().includes(q) ||
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.jobTitle.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let valA: string | number;
      let valB: string | number;
      if (sortField === 'issuedDate') {
        valA = a.issuedDate;
        valB = b.issuedDate;
      } else if (sortField === 'total') {
        valA = a.total;
        valB = b.total;
      } else {
        valA = a.status;
        valB = b.status;
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [invoices, filterStatus, filterYear, search, sortField, sortDir]);

  const stats = useMemo(() => {
    const total = invoices.reduce((s, i) => s + i.total, 0);
    const collected = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    const outstanding = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total, 0);
    return { total, collected, outstanding, count: invoices.length };
  }, [invoices]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const handleMarkSent = (inv: Invoice) => {
    onUpdateInvoice(inv.id, { status: 'sent' });
  };

  const handleMarkPaid = (inv: Invoice) => {
    const paidDate = paidDateInput[inv.id] || new Date().toISOString().split('T')[0];
    onUpdateInvoice(inv.id, { status: 'paid', paidDate });
  };

  const handleExportCSV = () => {
    const headers = ['Invoice #', 'Customer', 'Job', 'Type', 'Issued Date', 'Subtotal', 'HST', 'Total', 'Status'];
    const rows = filtered.map(i => [
      i.invoiceNumber,
      i.customerName,
      i.jobTitle,
      TYPE_LABELS[i.type],
      i.issuedDate,
      i.subtotal.toFixed(2),
      i.hstAmount.toFixed(2),
      i.total.toFixed(2),
      i.status,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusTabs: Array<{ key: InvoiceStatus | 'all'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'sent', label: 'Sent' },
    { key: 'paid', label: 'Paid' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Header */}
      <div className="border-b border-[var(--border-color)] bg-[var(--card-bg)] px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm font-medium"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--brand-gold)]/15 flex items-center justify-center border border-[var(--brand-gold)]/25">
                <FileText size={16} className="text-[var(--brand-gold)]" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight">Invoices</h1>
                <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">
                  {invoices.length} total
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/20 transition-all"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Invoiced', value: formatCAD(stats.total), icon: <FileText size={14} />, color: 'text-[var(--brand-gold)]' },
            { label: 'Collected', value: formatCAD(stats.collected), icon: <CheckCircle2 size={14} />, color: 'text-emerald-500' },
            { label: 'Outstanding', value: formatCAD(stats.outstanding), icon: <DollarSign size={14} />, color: 'text-amber-500' },
            { label: 'Invoices', value: String(stats.count), icon: <FileText size={14} />, color: 'text-[var(--text-secondary)]' },
          ].map(s => (
            <div key={s.label} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl px-5 py-4">
              <div className={`flex items-center gap-2 ${s.color} mb-2`}>
                {s.icon}
                <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
              </div>
              <p className={`text-xl font-black font-mono ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status tabs */}
          <div className="flex bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-1 gap-0.5">
            {statusTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === tab.key
                    ? 'bg-[var(--brand-gold)] text-white shadow'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Year dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowYearDropdown(v => !v)}
              className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            >
              {filterYear}
              <ChevronDown size={12} />
            </button>
            {showYearDropdown && (
              <div className="absolute top-full left-0 mt-1 w-36 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-xl z-20 overflow-hidden">
                {YEAR_OPTIONS.map(y => (
                  <button
                    key={y}
                    onClick={() => { setFilterYear(y); setShowYearDropdown(false); }}
                    className="w-full text-left px-4 py-2.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by customer, invoice #, or job..."
              className="w-full pl-9 pr-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-gold)]/50 transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center">
              <FileText size={24} className="text-[var(--text-tertiary)]" />
            </div>
            <p className="text-sm font-bold text-[var(--text-secondary)]">No invoices found</p>
            <p className="text-xs text-[var(--text-tertiary)]">
              Generate invoices from a job's Payment Schedule card.
            </p>
          </div>
        ) : (
          <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                      Invoice #
                    </th>
                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                      Customer
                    </th>
                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] hidden lg:table-cell">
                      Job
                    </th>
                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] hidden md:table-cell">
                      Type
                    </th>
                    <th
                      className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                      onClick={() => handleSort('issuedDate')}
                    >
                      Issued {sortField === 'issuedDate' ? (sortDir === 'desc' ? '\u2193' : '\u2191') : ''}
                    </th>
                    <th className="text-right px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] hidden sm:table-cell">
                      Subtotal
                    </th>
                    <th className="text-right px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] hidden sm:table-cell">
                      HST
                    </th>
                    <th
                      className="text-right px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                      onClick={() => handleSort('total')}
                    >
                      Total {sortField === 'total' ? (sortDir === 'desc' ? '\u2193' : '\u2191') : ''}
                    </th>
                    <th
                      className="text-center px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      Status {sortField === 'status' ? (sortDir === 'desc' ? '\u2193' : '\u2191') : ''}
                    </th>
                    <th className="text-right px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filtered.map(inv => {
                    const badge = STATUS_BADGE[inv.status];
                    return (
                      <tr key={inv.id} className="hover:bg-[var(--bg-secondary)]/40 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-bold text-[var(--brand-gold)]">
                            {inv.invoiceNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-xs text-[var(--text-primary)] leading-tight">
                            {inv.customerName}
                          </p>
                          {inv.customerPhone && (
                            <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{inv.customerPhone}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <p className="text-xs text-[var(--text-secondary)] max-w-[160px] truncate">
                            {inv.jobTitle}
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-[10px] text-[var(--text-tertiary)]">{TYPE_LABELS[inv.type]}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-[var(--text-secondary)]">{formatDate(inv.issuedDate)}</p>
                          {inv.paidDate && (
                            <p className="text-[10px] text-emerald-500 mt-0.5">Paid {formatDate(inv.paidDate)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          <span className="text-xs font-mono text-[var(--text-secondary)]">
                            {formatCAD(inv.subtotal)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right hidden sm:table-cell">
                          <span className="text-xs font-mono text-[var(--text-secondary)]">
                            {formatCAD(inv.hstAmount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-black font-mono text-[var(--text-primary)]">
                            {formatCAD(inv.total)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${badge.classes}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Print */}
                            <button
                              onClick={() => printInvoice(inv)}
                              title="Print Invoice"
                              className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/20 transition-all"
                            >
                              <Printer size={12} />
                            </button>

                            {/* Mark as Sent */}
                            {inv.status === 'draft' && (
                              <button
                                onClick={() => handleMarkSent(inv)}
                                title="Mark as Sent"
                                className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all text-[9px] font-black uppercase tracking-widest"
                              >
                                <Send size={10} />
                                Sent
                              </button>
                            )}

                            {/* Mark as Paid */}
                            {inv.status === 'sent' && (
                              <div className="flex items-center gap-1">
                                <input
                                  type="date"
                                  value={paidDateInput[inv.id] || new Date().toISOString().split('T')[0]}
                                  onChange={e => setPaidDateInput(prev => ({ ...prev, [inv.id]: e.target.value }))}
                                  className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[9px] text-[var(--text-secondary)] focus:outline-none focus:border-emerald-500/50 w-[110px]"
                                />
                                <button
                                  onClick={() => handleMarkPaid(inv)}
                                  title="Mark as Paid"
                                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-all text-[9px] font-black uppercase tracking-widest"
                                >
                                  <CheckCircle2 size={10} />
                                  Paid
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoicesView;

import React, { useState, useMemo } from 'react';
import {
  Search, Users, TrendingUp, UserCheck, Clock, ChevronDown, ChevronUp,
  Phone, Mail, MapPin, Tag, Calendar, Download, X, Building2
} from 'lucide-react';
import type { Customer, CustomerStatus, Job } from '../types';
import { JobStatus } from '../types';

interface CustomersViewProps {
  customers: Customer[];
  jobs: Job[];
  onUpdateCustomer: (customerId: string, updates: Partial<Customer>) => void;
  onBack: () => void;
}

// Normalise a phone string to digits-only so "(613) 555-1234" matches "6135551234"
const normPhone = (p?: string): string => (p || '').replace(/\D/g, '');
const normEmail = (e?: string): string => (e || '').trim().toLowerCase();

/**
 * Build a synthetic Customer record from a Job. Used to populate the
 * Customers Hub from the live jobs pipeline so leads + customers we've
 * touched but never explicitly created in the customers table still show
 * up. Persisted customer records take precedence over synthesised ones.
 */
function synthesizeCustomersFromJobs(jobs: Job[], persisted: Customer[]): Customer[] {
  // Index persisted customers by phone + email so we can dedupe
  const persistedKeys = new Set<string>();
  for (const c of persisted) {
    const p = normPhone(c.phone);
    const e = normEmail(c.email);
    if (p) persistedKeys.add(`p:${p}`);
    if (e) persistedKeys.add(`e:${e}`);
  }

  // Group jobs by contact key (phone or email or name+address fallback)
  const byKey = new Map<string, Job[]>();
  for (const j of jobs) {
    const p = normPhone(j.clientPhone);
    const e = normEmail(j.clientEmail);
    const key = p ? `p:${p}` : e ? `e:${e}` : `na:${(j.clientName || '').toLowerCase()}|${(j.projectAddress || '').toLowerCase()}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(j);
  }

  const synthesized: Customer[] = [];
  for (const [key, group] of byKey) {
    // Skip if a persisted customer already covers this contact
    if (persistedKeys.has(key)) continue;
    // Pick the most recent job for canonical contact info
    const sorted = [...group].sort((a, b) => (b.scheduledDate || '').localeCompare(a.scheduledDate || ''));
    const head = sorted[0];

    // Aggregate
    const completedJobs = group.filter((j) => j.status === JobStatus.COMPLETED);
    const lifetimeValue = completedJobs.reduce((sum, j) => sum + (j.totalAmount || j.estimateAmount || 0), 0);
    const lastServiceDate = completedJobs
      .map((j) => j.scheduledDate)
      .filter(Boolean)
      .sort()
      .reverse()[0];

    // Status mapping: any completed job → active_client; otherwise infer from
    // estimate status / pipeline stage; fallback cold_lead
    let status: CustomerStatus = 'cold_lead';
    if (completedJobs.length > 0) status = 'active_client';
    else if (group.some((j) => j.status === JobStatus.SCHEDULED || j.status === JobStatus.IN_PROGRESS || j.status === JobStatus.QC_PENDING)) status = 'active_client';
    else if (group.some((j) => j.estimateStatus === 'sent' || j.estimateStatus === 'revised' || j.estimateStatus === 'accepted')) status = 'quoted_not_converted';
    else if (group.some((j) => j.estimateStatus === 'in_progress' || j.estimateStatus === 'pending')) status = 'prospect';

    // Split name
    const nameParts = (head.clientName || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    synthesized.push({
      id: `job-derived:${key}`,
      firstName,
      lastName,
      displayName: head.clientName || 'Unknown',
      phone: head.clientPhone || '',
      email: head.clientEmail || '',
      customerType: 'homeowner',
      addresses: head.projectAddress
        ? [{
            streetLine1: head.projectAddress,
            city: '',
            province: 'ON',
            postalCode: '',
            isBilling: true,
          }]
        : [],
      tags: [],
      notes: `Derived from ${group.length} job${group.length === 1 ? '' : 's'} in pipeline`,
      leadSource: head.leadSource,
      lifetimeValue,
      lastServiceDate,
      createdAt: sorted[sorted.length - 1].scheduledDate || new Date().toISOString(),
      status,
      doNotService: false,
    });
  }

  return synthesized;
}

type FilterTab = 'all' | 'active_client' | 'quoted_not_converted' | 'cold_lead';
type SortKey = 'name' | 'lifetimeValue' | 'lastServiceDate';

const STATUS_CONFIG: Record<CustomerStatus, { label: string; colour: string }> = {
  active_client: { label: 'Active Client', colour: 'bg-[var(--brand-gold)]/15 text-[var(--brand-gold)] border-[var(--brand-gold)]/30' },
  quoted_not_converted: { label: 'Quoted', colour: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  cold_lead: { label: 'Cold Lead', colour: 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] border-[var(--border-color)]' },
  prospect: { label: 'Prospect', colour: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
};

function formatCurrency(n: number): string {
  return n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function downloadCSV(customers: Customer[]): void {
  const headers = [
    'ID', 'First Name', 'Last Name', 'Display Name', 'Phone', 'Email',
    'Company', 'Customer Type', 'Status', 'Lifetime Value', 'Lead Source',
    'Last Service Date', 'Created At', 'Tags', 'Notes',
  ];
  const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const rows = customers.map(c => [
    c.id, c.firstName, c.lastName, c.displayName, c.phone, c.email,
    c.company ?? '', c.customerType, c.status, c.lifetimeValue, c.leadSource ?? '',
    c.lastServiceDate ?? '', c.createdAt, c.tags.join('; '), c.notes,
  ].map(String).map(escape).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fieldpro_customers_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const CustomerCard: React.FC<{
  customer: Customer;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ customer, isExpanded, onToggle }) => {
  const status = STATUS_CONFIG[customer.status] ?? STATUS_CONFIG.cold_lead;
  const primaryAddress = customer.addresses[0];

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl overflow-hidden transition-all">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-[var(--bg-secondary)]/40 transition-colors"
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-xl bg-[var(--brand-gold)]/10 border border-[var(--brand-gold)]/20 flex items-center justify-center shrink-0">
          <span className="text-sm font-black text-[var(--brand-gold)]">
            {(customer.firstName[0] ?? customer.displayName[0] ?? '?').toUpperCase()}
          </span>
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-[var(--text-primary)]">{customer.displayName}</span>
            {customer.company && (
              <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                <Building2 size={10} /> {customer.company}
              </span>
            )}
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${status.colour}`}>
              {status.label}
            </span>
            {customer.doNotService && (
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                Do Not Service
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            {customer.phone && (
              <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                <Phone size={10} /> {customer.phone}
              </span>
            )}
            {customer.email && (
              <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                <Mail size={10} /> {customer.email}
              </span>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {customer.lifetimeValue > 0 && (
            <span className="text-sm font-black text-[var(--brand-gold)] font-mono">
              {formatCurrency(customer.lifetimeValue)}
            </span>
          )}
          {customer.leadSource && (
            <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-tertiary)] border border-[var(--border-color)]">
              {customer.leadSource}
            </span>
          )}
          {customer.lastServiceDate && (
            <span className="text-[9px] text-[var(--text-tertiary)] flex items-center gap-1">
              <Calendar size={8} /> {formatDate(customer.lastServiceDate)}
            </span>
          )}
          {isExpanded ? <ChevronUp size={14} className="text-[var(--text-tertiary)] mt-1" /> : <ChevronDown size={14} className="text-[var(--text-tertiary)] mt-1" />}
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="border-t border-[var(--border-color)] px-5 py-4 space-y-4 bg-[var(--bg-secondary)]/30">
          {/* Addresses */}
          {customer.addresses.length > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-2 flex items-center gap-1.5">
                <MapPin size={9} /> Addresses
              </p>
              <div className="space-y-1.5">
                {customer.addresses.map((addr, i) => (
                  <div key={i} className="text-xs text-[var(--text-secondary)]">
                    {addr.streetLine1}
                    {addr.streetLine2 ? `, ${addr.streetLine2}` : ''}
                    {`, ${addr.city}, ${addr.province} ${addr.postalCode}`}
                    {addr.isBilling && <span className="ml-2 text-[9px] font-bold text-[var(--brand-gold)] uppercase">(billing)</span>}
                    {addr.notes && <span className="block text-[var(--text-tertiary)] text-[10px] mt-0.5">{addr.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {customer.tags.length > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-2 flex items-center gap-1.5">
                <Tag size={9} /> Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {customer.tags.map((tag, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {customer.notes && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-1.5">Notes</p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{customer.notes}</p>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-6 pt-1 border-t border-[var(--border-color)]">
            {customer.hcpId && (
              <span className="text-[9px] text-[var(--text-tertiary)]">HCP ID: {customer.hcpId}</span>
            )}
            <span className="text-[9px] text-[var(--text-tertiary)]">Created: {formatDate(customer.createdAt)}</span>
            <span className="text-[9px] text-[var(--text-tertiary)] capitalize">{customer.customerType}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const CustomersView: React.FC<CustomersViewProps> = ({ customers, jobs, onUpdateCustomer: _onUpdateCustomer, onBack: _onBack }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Merge persisted customers with customers synthesized from the live jobs
  // pipeline. Persisted records win on duplicate phone/email.
  const mergedCustomers = useMemo(
    () => [...customers, ...synthesizeCustomersFromJobs(jobs, customers)],
    [customers, jobs],
  );

  const filtered = useMemo(() => {
    let result = [...mergedCustomers];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.displayName.toLowerCase().includes(q) ||
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q)
      );
    }

    // Filter tab
    if (filter !== 'all') {
      result = result.filter(c => c.status === filter);
    }

    // Sort
    result.sort((a, b) => {
      if (sort === 'name') return a.displayName.localeCompare(b.displayName);
      if (sort === 'lifetimeValue') return b.lifetimeValue - a.lifetimeValue;
      if (sort === 'lastServiceDate') {
        if (!a.lastServiceDate) return 1;
        if (!b.lastServiceDate) return -1;
        return b.lastServiceDate.localeCompare(a.lastServiceDate);
      }
      return 0;
    });

    return result;
  }, [mergedCustomers, search, filter, sort]);

  const stats = useMemo(() => ({
    total: mergedCustomers.length,
    active: mergedCustomers.filter(c => c.status === 'active_client').length,
    quoted: mergedCustomers.filter(c => c.status === 'quoted_not_converted').length,
    revenue: mergedCustomers.reduce((sum, c) => sum + c.lifetimeValue, 0),
  }), [mergedCustomers]);

  const tabs: Array<{ key: FilterTab; label: string; count: number }> = [
    { key: 'all', label: 'All', count: mergedCustomers.length },
    { key: 'active_client', label: 'Active Clients', count: stats.active },
    { key: 'quoted_not_converted', label: 'Quoted', count: stats.quoted },
    { key: 'cold_lead', label: 'Cold Leads', count: mergedCustomers.filter(c => c.status === 'cold_lead').length },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-display text-[var(--text-primary)]">Customers</h1>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {customers.length > 0
              ? `${customers.length} from CRM · ${mergedCustomers.length - customers.length} from active pipeline`
              : `${mergedCustomers.length} from active pipeline`}
          </p>
        </div>
        <button
          onClick={() => downloadCSV(filtered)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand-gold)]/40 transition-all"
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Customers', value: stats.total.toLocaleString(), icon: Users },
          { label: 'Active Clients', value: stats.active.toLocaleString(), icon: UserCheck },
          { label: 'Quoted', value: stats.quoted.toLocaleString(), icon: Clock },
          { label: 'Total Revenue', value: formatCurrency(stats.revenue), icon: TrendingUp },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={12} className="text-[var(--brand-gold)]" />
              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">{label}</span>
            </div>
            <p className="text-lg font-black text-[var(--text-primary)] font-mono leading-none">{value}</p>
          </div>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by name, phone or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-gold)]/50 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortKey)}
          className="px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-secondary)] focus:outline-none focus:border-[var(--brand-gold)]/50 transition-colors cursor-pointer"
        >
          <option value="name">Sort: Name</option>
          <option value="lifetimeValue">Sort: Value</option>
          <option value="lastServiceDate">Sort: Last Service</option>
        </select>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filter === key
                ? 'bg-[var(--brand-gold)] text-black shadow-lg shadow-[var(--brand-gold)]/20'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] hover:border-[var(--brand-gold)]/30'
            }`}
          >
            {label}
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
              filter === key ? 'bg-black/20 text-black' : 'bg-[var(--bg-secondary)] text-[var(--text-tertiary)] border border-[var(--border-color)]'
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-xs text-[var(--text-tertiary)]">
        Showing {filtered.length.toLocaleString()} of {mergedCustomers.length.toLocaleString()} customers
      </p>

      {/* Customer list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-tertiary)]">
            <Users size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-bold">No customers found</p>
            <p className="text-xs mt-1">Try adjusting your search or filter</p>
          </div>
        ) : (
          filtered.map(customer => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              isExpanded={expandedId === customer.id}
              onToggle={() => setExpandedId(prev => prev === customer.id ? null : customer.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CustomersView;

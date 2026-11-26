import React, { useMemo, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
  Phone,
  Plus,
  Search,
  Smartphone,
  Trash2,
  UserPlus,
  Wallet,
  X,
} from 'lucide-react';
import type {
  LoanCustomerSummary,
  LoanTransaction,
  PaymentMode,
} from '../types';
import {
  formatDateShort,
  formatINR,
  formatTime,
  getTodayDateStr,
} from '../utils/format';
import { ConfirmModal } from '../components/ConfirmModal';

interface LoansPageProps {
  customers: LoanCustomerSummary[];
  transactions: LoanTransaction[];
  onCreateCustomer: (name: string, phone: string) => Promise<void>;
  onDeleteCustomer: (customerId: number) => Promise<void>;
  onAddCredit: (customerId: number, amount: number, note: string) => Promise<void>;
  onRecordPayment: (
    customerId: number,
    amount: number,
    mode: PaymentMode,
    note: string
  ) => Promise<void>;
  onDeleteTransaction: (txId: number) => Promise<void>;
}

const QUICK_AMOUNTS = [10, 15, 20, 30, 50, 100];

export const LoansPage: React.FC<LoansPageProps> = ({
  customers,
  transactions,
  onCreateCustomer,
  onDeleteCustomer,
  onAddCredit,
  onRecordPayment,
  onDeleteTransaction,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'due' | 'settled'>('all');

  // New Customer Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Per-card custom credit input
  const [customAmounts, setCustomAmounts] = useState<Record<number, string>>({});
  const [customNotes, setCustomNotes] = useState<Record<number, string>>({});

  // Payment modal state
  const [payTarget, setPayTarget] = useState<LoanCustomerSummary | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState<PaymentMode>('Cash');
  const [payNote, setPayNote] = useState('');

  // Expanded history per customer
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Delete confirmation
  const [deleteCustTarget, setDeleteCustTarget] = useState<LoanCustomerSummary | null>(null);

  const totals = useMemo(() => {
    let outstanding = 0;
    let activeDueCount = 0;
    let totalCollected = 0;
    for (const c of customers) {
      outstanding += c.balance;
      totalCollected += c.total_paid;
      if (c.balance > 0) activeDueCount += 1;
    }
    return { outstanding, activeDueCount, totalCollected };
  }, [customers]);

  const txByCustomer = useMemo(() => {
    const map = new Map<number, LoanTransaction[]>();
    for (const t of transactions) {
      const list = map.get(t.customer_id) ?? [];
      list.push(t);
      map.set(t.customer_id, list);
    }
    return map;
  }, [transactions]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (filter === 'due' && c.balance <= 0) return false;
      if (filter === 'settled' && c.balance > 0) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.phone.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [customers, search, filter]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await onCreateCustomer(newName.trim(), newPhone.trim());
    setNewName('');
    setNewPhone('');
    setAddModalOpen(false);
  };

  const handleCustomCredit = async (customerId: number) => {
    const raw = customAmounts[customerId] ?? '';
    const amt = Number(raw);
    if (!Number.isFinite(amt) || amt <= 0) return;
    const note = customNotes[customerId] ?? '';
    await onAddCredit(customerId, amt, note);
    setCustomAmounts((prev) => ({ ...prev, [customerId]: '' }));
    setCustomNotes((prev) => ({ ...prev, [customerId]: '' }));
  };

  const openPayModal = (c: LoanCustomerSummary) => {
    setPayTarget(c);
    setPayAmount(String(c.balance));
    setPayMode('Cash');
    setPayNote('');
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget) return;
    const amt = Number(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    await onRecordPayment(payTarget.id, amt, payMode, payNote);
    setPayTarget(null);
  };

  return (
    <div className="space-y-5">
      {/* Hero Summary Card */}
      <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-100">
              <Wallet className="h-3.5 w-3.5" />
              <span>Customer Khata &amp; Loan Accounts</span>
            </div>
            <h1 className="mt-2.5 text-xl font-extrabold tracking-tight sm:text-2xl">
              Credit Ledger
            </h1>
            <p className="mt-1 text-xs text-indigo-200">
              Add money to any customer&apos;s account and clear bills daily, weekly, or monthly
            </p>
          </div>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-600"
          >
            <UserPlus className="h-4 w-4" />
            <span>New Customer</span>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="min-w-0 rounded-xl bg-white/10 p-3.5 backdrop-blur-sm">
            <div className="text-xs font-medium text-indigo-200">Total Outstanding</div>
            <div className="tabular-nums mt-1 text-2xl font-extrabold text-amber-300">
              {formatINR(totals.outstanding)}
            </div>
            <div className="mt-1 text-[11px] text-indigo-200">
              To collect from {totals.activeDueCount} customer{totals.activeDueCount === 1 ? '' : 's'}
            </div>
          </div>

          <div className="min-w-0 rounded-xl bg-white/10 p-3.5 backdrop-blur-sm">
            <div className="text-xs font-medium text-indigo-200">Total Collected</div>
            <div className="tabular-nums mt-1 text-2xl font-bold text-emerald-300">
              {formatINR(totals.totalCollected)}
            </div>
            <div className="mt-1 text-[11px] text-indigo-200">
              Cleared payments all-time
            </div>
          </div>

          <div className="min-w-0 rounded-xl bg-white/10 p-3.5 backdrop-blur-sm">
            <div className="text-xs font-medium text-indigo-200">Total Accounts</div>
            <div className="tabular-nums mt-1 text-2xl font-bold text-white">
              {customers.length}
            </div>
            <div className="mt-1 text-[11px] text-indigo-200">
              {customers.length - totals.activeDueCount} settled at ₹0
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filter Bar */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex min-w-[200px] flex-1 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer name or phone..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'due', label: 'Has Balance' },
              { id: 'settled', label: 'Settled (₹0)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === tab.id
                  ? 'bg-[#4F46E5] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Customer Cards */}
      {filteredCustomers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <Wallet className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            {customers.length === 0
              ? 'No customer loan accounts yet.'
              : 'No customers match your filter.'}
          </p>
          {customers.length === 0 && (
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#4F46E5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4338CA]"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add First Customer</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredCustomers.map((c) => {
            const custTx = txByCustomer.get(c.id) ?? [];
            const isExpanded = expandedId === c.id;
            const hasBalance = c.balance > 0;

            return (
              <article
                key={c.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
                        {c.name}
                      </h2>
                      {!hasBalance && c.tx_count > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Settled
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      {c.phone && (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Phone className="h-3 w-3" />
                          {c.phone}
                        </span>
                      )}
                      {c.last_tx_date && (
                        <span className="tabular-nums">
                          Last: {formatDateShort(c.last_tx_date)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                      Balance Due
                    </div>
                    <div
                      className={`tabular-nums text-2xl font-extrabold ${
                        hasBalance
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatINR(c.balance)}
                    </div>
                  </div>
                </div>

                {/* Quick-Add Money Section (Always available, even after settling!) */}
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-700/80 dark:bg-slate-900/50">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Quick Add Credit (₹)
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => onAddCredit(c.id, amt, '')}
                        className="tabular-nums rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/60"
                      >
                        +₹{amt}
                      </button>
                    ))}
                  </div>

                  {/* Custom Amount + Optional Note */}
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={customAmounts[c.id] ?? ''}
                      onChange={(e) =>
                        setCustomAmounts((prev) => ({ ...prev, [c.id]: e.target.value }))
                      }
                      placeholder="Custom ₹"
                      className="tabular-nums w-28 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      value={customNotes[c.id] ?? ''}
                      onChange={(e) =>
                        setCustomNotes((prev) => ({ ...prev, [c.id]: e.target.value }))
                      }
                      placeholder="Note (optional)"
                      className="min-w-[120px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleCustomCredit(c.id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#4F46E5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4338CA]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-700/70">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <History className="h-3.5 w-3.5" />
                      <span>History ({custTx.length})</span>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteCustTarget(c)}
                      className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                      aria-label="Delete customer"
                      title="Delete customer account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {hasBalance && (
                    <button
                      type="button"
                      onClick={() => openPayModal(c)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Clear Payment ({formatINR(c.balance)})</span>
                    </button>
                  )}
                </div>

                {/* Expandable History */}
                {isExpanded && (
                  <div className="mt-3 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
                    {custTx.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-400">
                        No transactions yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200/70 dark:divide-slate-700/70">
                        {custTx.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between gap-2 py-2 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    t.type === 'payment'
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                                  }`}
                                >
                                  {t.type === 'payment' ? `Paid (${t.payment_mode})` : 'Credit'}
                                </span>
                                {t.note && (
                                  <span className="truncate text-slate-600 dark:text-slate-300">
                                    {t.note}
                                  </span>
                                )}
                              </div>
                              <div className="tabular-nums mt-0.5 text-[11px] text-slate-400">
                                {formatDateShort(t.tx_date)} · {formatTime(t.created_at)}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`tabular-nums font-bold ${
                                  t.type === 'payment'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {t.type === 'payment' ? '-' : '+'}
                                {formatINR(t.amount)}
                              </span>
                              <button
                                type="button"
                                onClick={() => onDeleteTransaction(t.id)}
                                className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                                aria-label="Delete entry"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* New Customer Modal */}
      {addModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                New Loan Customer
              </h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="mt-4 space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Customer Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Ramesh Bhai, Office Staff"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Phone Number (optional)
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g., 9876543210"
                  className="tabular-nums w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#4F46E5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4338CA]"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear / Record Payment Modal */}
      {payTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Clear Payment — {payTarget.name}
                </h3>
                <p className="tabular-nums text-xs text-slate-500 dark:text-slate-400">
                  Current due: {formatINR(payTarget.balance)} · {formatDateShort(getTodayDateStr())}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="mt-4 space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Payment Amount (₹)
                  </label>
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(payTarget.balance))}
                    className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    Full ({formatINR(payTarget.balance)})
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="tabular-nums w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Cash', 'UPI'] as PaymentMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPayMode(mode)}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl border py-2 text-xs font-semibold transition ${
                        payMode === mode
                          ? 'border-[#4F46E5] bg-[#4F46E5] text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
                      }`}
                    >
                      {mode === 'Cash' ? (
                        <Banknote className="h-4 w-4" />
                      ) : (
                        <Smartphone className="h-4 w-4" />
                      )}
                      <span>{mode}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="e.g., Monthly settlement"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPayTarget(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation */}
      <ConfirmModal
        open={Boolean(deleteCustTarget)}
        title="Delete Loan Customer?"
        description={`Delete "${deleteCustTarget?.name}" and all their credit/payment history? This cannot be undone.`}
        confirmLabel="Delete Account"
        variant="danger"
        onCancel={() => setDeleteCustTarget(null)}
        onConfirm={async () => {
          if (deleteCustTarget) {
            await onDeleteCustomer(deleteCustTarget.id);
            setDeleteCustTarget(null);
          }
        }}
      />
    </div>
  );
};

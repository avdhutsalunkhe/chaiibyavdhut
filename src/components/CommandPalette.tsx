import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  Coffee,
  Download,
  ListOrdered,
  PlusCircle,
  Search,
  Settings,
  Store,
  UtensilsCrossed,
  Wallet,
  X,
} from 'lucide-react';
import type { MenuItem, NavTab, PaymentMode } from '../types';
import { formatINR } from '../utils/format';

interface CommandPaletteProps {
  open: boolean;
  menuItems: MenuItem[];
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
  onQuickSale: (item: MenuItem, mode: PaymentMode) => void;
  onDailyBackup: () => void;
  onOpenExpenseModal: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  menuItems,
  onClose,
  onNavigate,
  onQuickSale,
  onDailyBackup,
  onOpenExpenseModal,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const navActions: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
    { id: 'today', label: 'Go to Today (POS)', icon: <Store className="h-4 w-4" /> },
    { id: 'calendar', label: 'Go to Sales Calendar', icon: <CalendarDays className="h-4 w-4" /> },
    { id: 'ledger', label: 'Go to Sales & Expenses', icon: <ListOrdered className="h-4 w-4" /> },
    { id: 'analytics', label: 'Go to Analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'loans', label: 'Go to Loan Accounts', icon: <Wallet className="h-4 w-4" /> },
    { id: 'menu', label: 'Go to Menu & Prices', icon: <UtensilsCrossed className="h-4 w-4" /> },
    { id: 'settings', label: 'Go to Backup & Settings', icon: <Settings className="h-4 w-4" /> },
  ];

  const q = query.trim().toLowerCase();

  const filteredNav = useMemo(
    () => navActions.filter((n) => !q || n.label.toLowerCase().includes(q)),
    [q]
  );

  const filteredItems = useMemo(
    () =>
      menuItems
        .filter((m) => m.is_active === 1)
        .filter((m) => !q || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
        .slice(0, 6),
    [menuItems, q]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-16 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search menu items, screens, or actions..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {filteredItems.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Quick Log Sale (Cash ×1)
              </div>
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onQuickSale(item, 'Cash');
                    onClose();
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300"
                >
                  <span className="flex items-center gap-2.5">
                    <Coffee className="h-4 w-4 text-indigo-500" />
                    <span className="font-medium">{item.name}</span>
                  </span>
                  <span className="tabular-nums text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {formatINR(item.price)}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="mb-2">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Actions
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenExpenseModal();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <PlusCircle className="h-4 w-4 text-rose-500" />
              <span>Add Daily Expense</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onDailyBackup();
                onClose();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Download className="h-4 w-4 text-emerald-500" />
              <span>Download Daily SQLite Backup</span>
            </button>
          </div>

          {filteredNav.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Navigation
              </div>
              {filteredNav.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    onNavigate(n.id);
                    onClose();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <span className="text-slate-400">{n.icon}</span>
                  <span>{n.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

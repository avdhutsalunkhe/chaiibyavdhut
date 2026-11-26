import { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import {
  addMenuItem,
  clearTodayData,
  createLoanCustomer,
  deleteExpense,
  deleteLoanCustomer,
  deleteLoanTransaction,
  deleteMenuItem,
  deleteSale,
  exportJsonBackup,
  exportSalesCsv,
  exportSqliteBytes,
  factoryReset,
  getAppMeta,
  getDailySummariesMap,
  getDaySummary,
  getDbStats,
  getExpenses,
  getItemSoldCountsForDate,
  getLoanCustomerSummaries,
  getLoanTransactions,
  getMenuItems,
  getSales,
  importJsonBackup,
  importSqliteBytes,
  initDatabase,
  recordExpense,
  recordLoanTransaction,
  recordSale,
  setMetaValue,
  setThemeMeta,
  swapMenuOrder,
  updateMenuItem,
} from './db/database';
import type {
  AppMeta,
  Category,
  DbStats,
  ExpenseRecord,
  LoanCustomerSummary,
  LoanTransaction,
  MenuItem,
  NavTab,
  PaymentMode,
  SaleRecord,
} from './types';
import { formatINR, getTodayDateStr } from './utils/format';
import { Layout } from './components/Layout';
import { ExpenseModal } from './components/ExpenseModal';
import { CommandPalette } from './components/CommandPalette';
import { TodayPos } from './pages/TodayPos';
import { CalendarPage } from './pages/CalendarPage';
import { LedgerPage } from './pages/LedgerPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LoansPage } from './pages/LoansPage';
import { MenuPage } from './pages/MenuPage';
import { SettingsPage } from './pages/SettingsPage';

interface ToastState {
  message: string;
  undoSaleId?: number;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function App() {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [rev, setRev] = useState(0);

  const [activeTab, setActiveTab] = useState<NavTab>('today');
  const [selectedPosDate, setSelectedPosDate] = useState<string>(getTodayDateStr());
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const bump = useCallback(() => setRev((r) => r + 1), []);

  const showToast = useCallback((message: string, undoSaleId?: number) => {
    setToast({ message, undoSaleId });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    initDatabase()
      .then(() => {
        setReady(true);
      })
      .catch((err) => {
        setInitError(err instanceof Error ? err.message : 'Failed to initialize SQLite database');
      });
  }, []);

  // Global Ctrl+K shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const meta: AppMeta = useMemo(() => {
    if (!ready) {
      return { shop_name: 'Chaii', daily_cup_target: 150, last_backup_at: '', theme: 'light' };
    }
    return getAppMeta();
  }, [ready, rev]);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (meta.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [meta.theme]);

  const todayStr = getTodayDateStr();

  const menuItems: MenuItem[] = useMemo(() => (ready ? getMenuItems(false) : []), [ready, rev]);
  const allSales: SaleRecord[] = useMemo(() => (ready ? getSales() : []), [ready, rev]);
  const allExpenses: ExpenseRecord[] = useMemo(() => (ready ? getExpenses() : []), [ready, rev]);
  const summariesMap = useMemo(() => (ready ? getDailySummariesMap() : new Map()), [ready, rev]);

  const todaySummary = useMemo(
    () =>
      ready
        ? getDaySummary(todayStr)
        : {
            date: todayStr,
            cups: 0,
            revenue: 0,
            expenses: 0,
            netProfit: 0,
            cashRevenue: 0,
            upiRevenue: 0,
          },
    [ready, rev, todayStr]
  );

  const posDaySummary = useMemo(
    () => (ready ? getDaySummary(selectedPosDate) : todaySummary),
    [ready, rev, selectedPosDate, todaySummary]
  );

  const posDayCounts = useMemo(
    () => (ready ? getItemSoldCountsForDate(selectedPosDate) : new Map<number, number>()),
    [ready, rev, selectedPosDate]
  );

  const posDaySales = useMemo(
    () => allSales.filter((s) => s.sale_date === selectedPosDate),
    [allSales, selectedPosDate]
  );

  const dbStats: DbStats = useMemo(
    () =>
      ready
        ? getDbStats()
        : { sizeBytes: 0, menuCount: 0, salesCount: 0, expensesCount: 0, metaCount: 0 },
    [ready, rev]
  );

  const loanCustomers: LoanCustomerSummary[] = useMemo(
    () => (ready ? getLoanCustomerSummaries() : []),
    [ready, rev]
  );
  const loanTransactions: LoanTransaction[] = useMemo(
    () => (ready ? getLoanTransactions() : []),
    [ready, rev]
  );

  // Handlers
  const handleTapItem = async (item: MenuItem, qty: number, mode: PaymentMode) => {
    const id = await recordSale({
      item_id: item.id,
      item_name: item.name,
      qty,
      unit_price: item.price,
      payment_mode: mode,
      sale_date: selectedPosDate,
    });
    bump();
    showToast(
      `Logged ${qty}× ${item.name} (${formatINR(item.price * qty)} · ${mode})`,
      id
    );
  };

  const handleUndoSale = async (saleId: number) => {
    await deleteSale(saleId);
    bump();
    setToast(null);
    showToast('Sale undone');
  };

  const handleDeleteSale = async (id: number) => {
    await deleteSale(id);
    bump();
    showToast('Sale deleted');
  };

  const handleSaveExpense = async (data: {
    title: string;
    amount: number;
    expense_date: string;
  }) => {
    await recordExpense(data);
    bump();
    showToast(`Expense saved: ${data.title} (${formatINR(data.amount)})`);
  };

  const handleDeleteExpense = async (id: number) => {
    await deleteExpense(id);
    bump();
    showToast('Expense deleted');
  };

  const handleToggleTheme = async () => {
    const next = meta.theme === 'dark' ? 'light' : 'dark';
    await setThemeMeta(next);
    bump();
  };

  const handleDailyBackup = async () => {
    const bytes = exportSqliteBytes();
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const blob = new Blob([copy.buffer], { type: 'application/x-sqlite3' });
    downloadBlob(blob, `chaii-${getTodayDateStr()}.sqlite`);
    await setMetaValue('last_backup_at', new Date().toISOString());
    bump();
    showToast('Daily SQLite backup downloaded');
  };

  const handleDownloadJson = () => {
    const json = exportJsonBackup();
    const blob = new Blob([json], { type: 'application/json' });
    downloadBlob(blob, `chaii-${getTodayDateStr()}.json`);
    showToast('JSON backup downloaded');
  };

  const handleDownloadCsv = () => {
    const csv = exportSalesCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `chaii-sales-${getTodayDateStr()}.csv`);
    showToast('Sales CSV exported');
  };

  const handleImportBackupFile = async (file: File) => {
    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.json')) {
        const text = await file.text();
        await importJsonBackup(text);
      } else {
        const buf = await file.arrayBuffer();
        await importSqliteBytes(new Uint8Array(buf));
      }
      bump();
      showToast('Backup restored successfully');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to restore backup');
    }
  };

  if (initError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6 dark:bg-[#0F172A]">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm dark:border-rose-800 dark:bg-slate-800">
          <h1 className="text-lg font-bold text-rose-600 dark:text-rose-400">
            Database Initialization Error
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{initError}</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#F8FAFC] dark:bg-[#0F172A]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-lg font-extrabold text-white shadow-md">
          as
        </div>
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Loading Chaii offline SQLite...
        </div>
      </div>
    );
  }

  return (
    <Layout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      meta={meta}
      todaySummary={todaySummary}
      onToggleTheme={handleToggleTheme}
      onOpenCommandPalette={() => setCommandOpen(true)}
      onDailyBackup={handleDailyBackup}
    >
      {activeTab === 'today' && (
        <TodayPos
          selectedDate={selectedPosDate}
          onChangeDate={setSelectedPosDate}
          meta={meta}
          summary={posDaySummary}
          menuItems={menuItems}
          itemCounts={posDayCounts}
          daySales={posDaySales}
          onTapItem={handleTapItem}
          onDeleteSale={handleDeleteSale}
          onOpenExpenseModal={() => setExpenseModalOpen(true)}
          onNotify={(m) => showToast(m)}
        />
      )}

      {activeTab === 'calendar' && (
        <CalendarPage
          meta={meta}
          summariesMap={summariesMap}
          onJumpToPosDate={(dateStr) => {
            setSelectedPosDate(dateStr);
            setActiveTab('today');
          }}
        />
      )}

      {activeTab === 'ledger' && (
        <LedgerPage
          sales={allSales}
          expenses={allExpenses}
          onDeleteSale={handleDeleteSale}
          onDeleteExpense={handleDeleteExpense}
          onOpenExpenseModal={() => setExpenseModalOpen(true)}
        />
      )}

      {activeTab === 'analytics' && (
        <AnalyticsPage
          sales={allSales}
          expenses={allExpenses}
          summariesMap={summariesMap}
        />
      )}

      {activeTab === 'loans' && (
        <LoansPage
          customers={loanCustomers}
          transactions={loanTransactions}
          onCreateCustomer={async (name, phone) => {
            await createLoanCustomer(name, phone);
            bump();
            showToast(`Added loan account for ${name}`);
          }}
          onDeleteCustomer={async (customerId) => {
            await deleteLoanCustomer(customerId);
            bump();
            showToast('Loan account deleted');
          }}
          onAddCredit={async (customerId, amount, note) => {
            await recordLoanTransaction({
              customer_id: customerId,
              type: 'credit',
              amount,
              note,
            });
            bump();
            showToast(`Added ${formatINR(amount)} to loan account`);
          }}
          onRecordPayment={async (customerId, amount, mode, note) => {
            await recordLoanTransaction({
              customer_id: customerId,
              type: 'payment',
              amount,
              payment_mode: mode,
              note,
            });
            bump();
            showToast(`Recorded ${formatINR(amount)} payment (${mode})`);
          }}
          onDeleteTransaction={async (txId) => {
            await deleteLoanTransaction(txId);
            bump();
            showToast('Transaction removed');
          }}
        />
      )}

      {activeTab === 'menu' && (
        <MenuPage
          menuItems={menuItems}
          onAdd={async (name: string, price: number, category: Category) => {
            await addMenuItem(name, price, category);
            bump();
            showToast(`Added "${name}"`);
          }}
          onUpdate={async (id, fields) => {
            await updateMenuItem(id, fields);
            bump();
          }}
          onSwapOrder={async (a, b) => {
            await swapMenuOrder(a.id, a.sort_order, b.id, b.sort_order);
            bump();
          }}
          onDelete={async (id) => {
            await deleteMenuItem(id);
            bump();
            showToast('Menu item deleted');
          }}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsPage
          meta={meta}
          stats={dbStats}
          onUpdateMeta={async (key, value) => {
            await setMetaValue(key, value);
            bump();
            showToast('Settings updated');
          }}
          onDailyBackup={handleDailyBackup}
          onDownloadJson={handleDownloadJson}
          onDownloadCsv={handleDownloadCsv}
          onImportBackupFile={handleImportBackupFile}
          onClearToday={async () => {
            await clearTodayData();
            bump();
            showToast("Today's entries cleared");
          }}
          onFactoryReset={async () => {
            await factoryReset();
            bump();
            showToast('Database reset to factory defaults');
          }}
        />
      )}

      {/* Modals */}
      <ExpenseModal
        open={expenseModalOpen}
        defaultDate={selectedPosDate}
        onClose={() => setExpenseModalOpen(false)}
        onSave={handleSaveExpense}
      />

      <CommandPalette
        open={commandOpen}
        menuItems={menuItems}
        onClose={() => setCommandOpen(false)}
        onNavigate={(tab) => setActiveTab(tab)}
        onQuickSale={(item, mode) => handleTapItem(item, 1, mode)}
        onDailyBackup={handleDailyBackup}
        onOpenExpenseModal={() => setExpenseModalOpen(true)}
      />

      {/* Bottom Toast with 1-click Undo */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl lg:bottom-6 dark:border dark:border-slate-700 dark:bg-slate-800">
          <span className="truncate">{toast.message}</span>
          <div className="flex shrink-0 items-center gap-2">
            {toast.undoSaleId !== undefined && (
              <button
                type="button"
                onClick={() => handleUndoSale(toast.undoSaleId!)}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-400"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Undo</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              className="rounded-lg p-1 text-slate-400 hover:text-white"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default App;

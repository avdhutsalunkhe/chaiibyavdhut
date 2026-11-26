export type Category = 'Tea' | 'Coffee' | 'Snacks';
export type PaymentMode = 'Cash' | 'UPI';
export type ThemeMode = 'light' | 'dark';

export type NavTab = 'today' | 'calendar' | 'ledger' | 'analytics' | 'loans' | 'menu' | 'settings';

export type LoanTransactionType = 'credit' | 'payment';

export interface LoanCustomer {
  id: number;
  name: string;
  phone: string;
  created_at: string;
}

export interface LoanTransaction {
  id: number;
  customer_id: number;
  type: LoanTransactionType;
  amount: number;
  payment_mode: PaymentMode;
  note: string;
  tx_date: string;
  created_at: string;
}

export interface LoanCustomerSummary extends LoanCustomer {
  total_credit: number;
  total_paid: number;
  balance: number;
  last_tx_date: string;
  tx_count: number;
}

export interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: Category;
  is_active: number;
  sort_order: number;
}

export interface SaleRecord {
  id: number;
  item_id: number | null;
  item_name: string;
  qty: number;
  unit_price: number;
  total_amount: number;
  payment_mode: PaymentMode;
  sale_date: string;
  created_at: string;
}

export interface ExpenseRecord {
  id: number;
  title: string;
  amount: number;
  expense_date: string;
  created_at: string;
}

export interface AppMeta {
  shop_name: string;
  daily_cup_target: number;
  last_backup_at: string;
  theme: ThemeMode;
}

export interface DaySummary {
  date: string;
  cups: number;
  revenue: number;
  expenses: number;
  netProfit: number;
  cashRevenue: number;
  upiRevenue: number;
}

export interface DbStats {
  sizeBytes: number;
  menuCount: number;
  salesCount: number;
  expensesCount: number;
  metaCount: number;
}


export type PricingType = 'KG' | 'GRAM' | 'FIXED';

export interface Tax {
  id: string;
  name: string;
  rate: number; // percentage
  isEnabled: boolean;
}

export interface Customer {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  address?: string;
  interestRate: number; // Percentage per annum
  createdAt: string;
  status: 'ACTIVE' | 'INACTIVE';
  balance?: number;
  createdByUserId?: string;
}

export interface Service {
  id: string;
  name: string;
  pricingType: PricingType;
  rate: number;
  createdAt: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  deliveryDate?: string;
  totalAmount: number;
  totalQuantity: number;
  taxAmount: number;
  subtotal: number;
  appliedTaxes?: { name: string; rate: number; amount: number }[];
  unit?: PricingType;
  paymentType: 'CASH' | 'ONLINE' | 'CARD' | 'CREDIT' | 'UNSET';
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'PENDING_DELIVERY' | 'DELIVERED' | 'PARTIAL' | 'REJECTED';
  items?: OrderItem[];
  remarks?: string;
  customerDetails?: { phone?: string; address?: string } | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
  rate: number;
  amount: number;
  pricingType: PricingType;
  delivered?: boolean;
}

export interface LedgerEntry {
  id: string;
  customerId: string;
  orderId?: string;
  debit: number;
  credit: number;
  interest: number;
  balance: number;
  date: string;
  notes?: string;
  type?: 'CREDIT' | 'CASH';
}

export interface AuditLog {
  id: string;
  action: string;
  module: string;
  data: any;
  timestamp: string;
}

export interface StoreSettings {
  storeName: string;
  defaultInterestRate: number;
  currency: string;
  adminName?: string;
  googleSheetUrl?: string;
  googleSheetId?: string;
  isSheetIntegrationEnabled?: boolean;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'ADMIN' | 'USER';
  name?: string;
  mobile?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}

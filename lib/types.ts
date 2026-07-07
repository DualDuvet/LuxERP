export const orderStatuses = [
  "draft",
  "confirmed",
  "in_production",
  "on_hold",
  "ready",
  "shipped",
  "closed",
  "cancelled"
] as const;

export const specificationLineTypes = [
  "group",
  "product",
  "service",
  "comment",
  "empty",
  "subtotal",
  "total",
  "discount",
  "surcharge"
] as const;

export const paymentTypes = [
  "prepayment",
  "final_payment",
  "refund",
  "correction"
] as const;

export type OrderStatus = (typeof orderStatuses)[number];
export type SpecificationLineType = (typeof specificationLineTypes)[number];
export type PaymentType = (typeof paymentTypes)[number];
export type PaymentMethod = "cash" | "card" | "bank_transfer" | "other";
export type UserRole = "admin" | "manager" | "production" | "accountant" | "viewer";

export interface Customer {
  id: string;
  name: string;
  legalType: "ООО" | "ИП" | "ч/л" | "ЗАО";
  phone?: string;
  email?: string;
  inn?: string;
  address?: string;
  comment?: string;
  isActive: boolean;
}

export interface CustomerLookupItem {
  id: string;
  name: string;
  legalType: Customer["legalType"];
  isActive: boolean;
}

export interface SpecificationLine {
  id: string;
  orderId: string;
  parentId?: string | null;
  lineType: SpecificationLineType;
  sortOrder: number;
  title?: string;
  description?: string;
  heightMm?: number;
  widthMm?: number;
  quantity?: number;
  unit?: string;
  pricePerM2?: number;
  unitAreaM2?: number;
  totalAreaM2?: number;
  unitPrice?: number;
  totalPrice?: number;
  isCalculated: boolean;
  isPrinted: boolean;
  metadata?: Record<string, unknown>;
}

export interface Payment {
  id: string;
  orderId: string;
  paymentType: PaymentType;
  amount: number;
  paymentDate: string;
  paymentMethod?: PaymentMethod;
  comment?: string;
}

export interface OrderStatusHistoryItem {
  id: string;
  orderId: string;
  status: OrderStatus;
  changedAt: string;
  changedBy?: string;
  comment?: string;
}

export interface DictionaryItem {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Order {
  id: string;
  specificationNumber: string;
  documentDate: string;
  customer: Customer;
  customerLegalType: Customer["legalType"];
  status: OrderStatus;
  productionStartedAt?: string;
  readyAt?: string;
  shippedAt?: string;
  category?: DictionaryItem;
  materialType?: DictionaryItem;
  thicknessMm?: number;
  millingType?: DictionaryItem;
  colorCode?: string;
  mainNote?: string;
  jointingNote?: string;
  deliveryRequired?: boolean;
  deliveryAddress?: string;
  totalAreaM2: number;
  subtotalAmount: number;
  discountAmount: number;
  surchargeAmount: number;
  prepaymentAmount: number;
  balanceAmount: number;
  totalAmount: number;
  lines: SpecificationLine[];
  payments: Payment[];
  statusHistory: OrderStatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderTotals {
  totalAreaM2: number;
  subtotalAmount: number;
  discountAmount: number;
  surchargeAmount: number;
  totalAmount: number;
  prepaymentAmount: number;
  balanceAmount: number;
}

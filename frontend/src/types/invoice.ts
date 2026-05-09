export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceClient {
  id: string;
  name: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  total: number | string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  subtotal: number | string;
  taxRate: number | string;
  taxAmount: number | string;
  total: number | string;
  notes: string | null;
  paidAt: string | null;
  client: InvoiceClient | null;
  lineItems?: LineItem[];
  isDeleted?: boolean;
  deletedAt?: string | null;
}

export interface TrashedInvoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  total: number | string;
  client: { name: string } | null;
  deletedAt: string;
}

export interface CreateInvoicePayload {
  clientId?: string;
  issueDate: string;
  dueDate: string;
  taxRate: number;
  taxInclusive?: boolean;
  notes?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export type ExpenseStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PAID';
export type ExpenseCategory = 'OFFICE' | 'SOFTWARE' | 'FOOD' | 'TRANSPORT' | 'UTILITY' | 'OTHER';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  vendor: string | null;
  amount: string | number;
  taxAmount: string | number | null;
  expenseDate: string;
  dueDate: string | null;
  status: ExpenseStatus;
  receiptUrl: string | null;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
}

export interface TrashedExpense {
  id: string;
  vendor: string | null;
  category: ExpenseCategory;
  amount: number | string;
  expenseDate: string;
  deletedAt: string;
}

export interface CreateExpensePayload {
  category: ExpenseCategory;
  expenseDate: string;
  amount: number;
  dueDate?: string;
  vendor?: string;
  taxAmount?: number;
  notes?: string;
  receiptUrl?: string;
}

export type UpdateExpensePayload = Partial<CreateExpensePayload>;

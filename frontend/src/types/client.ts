export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxNumber: string | null;
  createdAt: string;
}

export interface ClientFormData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxNumber?: string;
}

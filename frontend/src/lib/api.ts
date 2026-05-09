import axios from 'axios';

// Next.js rewrites /api/v1/* → http://localhost:3001/api/v1/*
// withCredentials: true → HTTP-Only cookie'yi her istekte gönderir
const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// 401 interceptor: önce token'ı yenilemeyi dener, olmadı login'e yönlendirir.
// _retry bayrağı döngüyü önler (refresh kendisi 401 dönerse sonsuz döngüye girmez).
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
        return api(original);
      } catch {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; fullName?: string; companyName?: string }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  logout: () => api.post('/auth/logout'),
};

// ── Clients ───────────────────────────────────────────────────────────────────
export const clientsApi = {
  list: () => api.get('/clients'),
  create: (data: unknown) => api.post('/clients', data),
  update: (id: string, data: unknown) => api.patch(`/clients/${id}`, data),
  remove: (id: string) => api.delete(`/clients/${id}`),
};

// ── Invoices ──────────────────────────────────────────────────────────────────
export const invoicesApi = {
  list: () => api.get('/invoices'),
  trash: () => api.get('/invoices/trash'),
  create: (data: unknown) => api.post('/invoices', data),
  markPaid: (id: string) => api.post(`/invoices/${id}/pay`),
  softDelete: (id: string) => api.delete(`/invoices/${id}`),
  restore: (id: string) => api.post(`/invoices/${id}/restore`),
  hardDelete: (id: string) => api.delete(`/invoices/${id}/hard`),
  downloadPdf: async (id: string, invoiceNumber: string) => {
    const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
  previewPdf: (id: string) =>
    window.open(`/api/v1/invoices/${id}/pdf?inline=true`, '_blank'),
};

// ── Expenses ──────────────────────────────────────────────────────────────────
export const expensesApi = {
  list: () => api.get('/expenses'),
  trash: () => api.get('/expenses/trash'),
  create: (data: unknown) => api.post('/expenses', data),
  update: (id: string, data: unknown) => api.patch(`/expenses/${id}`, data),
  softDelete: (id: string) => api.delete(`/expenses/${id}`),
  restore: (id: string) => api.post(`/expenses/${id}/restore`),
  hardDelete: (id: string) => api.delete(`/expenses/${id}/hard`),
  scan: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/expenses/scan', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  approve: (id: string) => api.post(`/expenses/${id}/approve`),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  all: (chartMonths: number, categoryMonths: number) =>
    api.get(`/dashboard/all?chartMonths=${chartMonths}&categoryMonths=${categoryMonths}`),
  summary: () => api.get('/dashboard/summary'),
  chart: (months: number) => api.get(`/dashboard/chart?months=${months}`),
  categories: (months: number) => api.get(`/dashboard/categories?months=${months}`),
  report: (period: string) => api.get(`/dashboard/report?period=${period}`),
};

export default api;

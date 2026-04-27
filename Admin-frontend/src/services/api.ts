import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request interceptor: attach JWT ──────────────────────────
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('sge_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401 ─────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('sge_token');
      sessionStorage.removeItem('sge_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  getProfile: () => api.get('/auth/profile'),
};

// ── Users / Owners ────────────────────────────────────────────
export const usersApi = {
  getAll: (status?: string) =>
    api.get('/users', { params: status ? { status } : {} }),
  getById: (id: string) => api.get(`/users/${id}`),
  createOwner: (data: CreateOwnerPayload) => api.post('/users/create-owner', data),
  resetPassword: (tenantId: string) => api.post(`/users/${tenantId}/reset-password`),
  getStats: () => api.get('/users/stats'),
};

// ── Subscriptions ─────────────────────────────────────────────
export const subscriptionsApi = {
  getAll: (status?: string) =>
    api.get('/subscriptions', { params: status ? { status } : {} }),
  getStats: () => api.get('/subscriptions/stats'),
};

// ── Revenue ───────────────────────────────────────────────────
export const revenueApi = {
  getAll: (status?: string) =>
    api.get('/revenue', { params: status ? { status } : {} }),
  getOverview: () => api.get('/revenue/overview'),
};

// ── Trials ────────────────────────────────────────────────────
export const trialsApi = {
  getAll: (status?: string) =>
    api.get('/trials', { params: status ? { status } : {} }),
  getStats: () => api.get('/trials/stats'),
};

// ── Support ───────────────────────────────────────────────────
export const supportApi = {
  getAll: (status?: string) =>
    api.get('/support', { params: status ? { status } : {} }),
  closeTicket: (id: string, resolution?: string) =>
    api.patch(`/support/${id}/close`, { resolution }),
  getStats: () => api.get('/support/stats'),
};

// ── Logs ──────────────────────────────────────────────────────
export const logsApi = {
  getAll: (limit?: number) =>
    api.get('/logs', { params: limit ? { limit } : {} }),
};

// ── Types ─────────────────────────────────────────────────────
export interface CreateOwnerPayload {
  name: string;
  email: string;
  businessName: string;
  phone?: string;
  alternativePhone?: string;
  mainBranchLocation: string;
  numberOfBranches: number;
  branchAddresses: string[];
  password?: string;
}

export default api;

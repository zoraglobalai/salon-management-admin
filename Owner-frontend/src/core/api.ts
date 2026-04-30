import type { ApiListResponse, DashboardMetrics, DashboardSummaryResponse, ResourceItem } from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const USER_KEY = "salon-growth-engine-user";

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function persistSession(user: unknown) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(USER_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      sessionStorage.removeItem("owner_user");
      sessionStorage.removeItem("owner_token");
      if (window.location.pathname !== '/login') {
        window.location.href = "/login";
      }
    }
    const errorBody = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(errorBody.message || "Request failed");
  }

  return response.json() as Promise<T>;
}

export async function fetchDashboard() {
  return request<{ metrics: DashboardMetrics }>("/dashboard");
}

export async function fetchDashboardSummary(filters?: { date?: string; branchId?: string }) {
  const token = sessionStorage.getItem("owner_token");
  const params = new URLSearchParams();

  if (filters?.date) {
    params.set("date", filters.date);
  }

  if (filters?.branchId && filters.branchId !== "all") {
    params.set("branchId", filters.branchId);
  }

  const queryString = params.toString();

  return request<DashboardSummaryResponse>(`/dashboard/summary${queryString ? `?${queryString}` : ""}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function fetchResource(resource: string) {
  return request<ApiListResponse<ResourceItem>>(`/${resource}`);
}

export type InventoryItem = {
  id: string;
  name: string;
  costPrice: number;
  unit: "ml" | "L" | "pcs";
  quantity: number;
  stock: number;
  serviceQuantity: number;
  benefits: string;
  locationId: string;
  locationName: string;
  createdAt: string;
};

export async function fetchMe() {
  const token = sessionStorage.getItem('owner_token');
  return request<{ data: any }>("/auth/me", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function fetchOwnerProfile() {
  const token = sessionStorage.getItem('owner_token');
  return request<{ data: {
    businessName: string;
    totalManagers: number;
    locations: { id: string; name: string; city?: string }[];
    profile: {
      role: 'OWNER' | 'INDEPENDENT_OWNER' | 'MANAGER' | 'SUPER_ADMIN';
      fullName: string;
      email: string;
      phone: string;
      shopName: string;
    };
  } }>("/owner/profile", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function updateOwnerProfile(payload: {
  fullName: string;
  email: string;
  phone: string;
  shopName: string;
}) {
  const token = sessionStorage.getItem('owner_token');
  return request<{ success: boolean; message: string; data: {
    role: 'OWNER' | 'INDEPENDENT_OWNER' | 'MANAGER' | 'SUPER_ADMIN';
    fullName: string;
    email: string;
    phone: string;
    shopName: string;
  } }>("/owner/profile", {
    method: "PUT",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });
}

export type OwnerSupportTicket = {
  id: string;
  issue: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SupportContact = {
  name: string;
  phone: string;
};

export type OwnerSubscriptionRecord = {
  id: string;
  plan: "BASIC" | "STANDARD" | "PRO" | "CUSTOM";
  status: "ACTIVE" | "EXPIRED";
  amountPaid: string;
  paymentMethod: string | null;
  transactionReference: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
};

export type OwnerTrialRecord = {
  id: string;
  status: "ACTIVE" | "EXPIRED" | "CONVERTED";
  startDate: string;
  endDate: string;
};

export type SubscriptionPlanOption = {
  id: "STANDARD" | "PRO" | "CUSTOM";
  label: string;
  price: number | null;
  durationDays: number;
  features: string[];
};

export type OwnerSubscriptionOverview = {
  businessName: string;
  currentSubscription: OwnerSubscriptionRecord | null;
  currentTrial: OwnerTrialRecord | null;
  tenantStatus: "ACTIVE" | "TRIAL" | "EXPIRED";
  supportContact: SupportContact;
  plans: SubscriptionPlanOption[];
};

export async function fetchOwnerSupportTickets() {
  const token = sessionStorage.getItem("owner_token");
  return request<{ success: boolean; data: OwnerSupportTicket[] }>("/support/owner", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function createOwnerSupportTicket(payload: {
  issue: string;
  description: string;
}) {
  const token = sessionStorage.getItem("owner_token");
  return request<{ success: boolean; message: string; data: OwnerSupportTicket }>("/support/owner", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });
}

export async function fetchSupportContact() {
  const token = sessionStorage.getItem("owner_token");
  return request<{ success: boolean; data: SupportContact }>("/support/owner/contact", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function fetchOwnerSubscriptionOverview() {
  const token = sessionStorage.getItem("owner_token");
  return request<{ success: boolean; data: OwnerSubscriptionOverview }>("/subscriptions/owner/current", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function checkoutOwnerSubscription(payload: {
  plan: "STANDARD" | "PRO";
  paymentMethod: "CARD" | "UPI" | "CASH";
}) {
  const token = sessionStorage.getItem("owner_token");
  return request<{ success: boolean; message: string; data: OwnerSubscriptionOverview }>("/subscriptions/owner/checkout", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });
}

export async function requestCustomSubscription(message: string) {
  const token = sessionStorage.getItem("owner_token");
  return request<{ success: boolean; message: string; data: { supportContact: SupportContact } }>("/subscriptions/owner/custom-request", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify({ message }),
  });
}

export async function fetchInventory(locationId?: string) {
  const token = sessionStorage.getItem("owner_token");
  const params = new URLSearchParams();

  if (locationId && locationId !== "all") {
    params.set("locationId", locationId);
  }

  const queryString = params.toString();
  return request<{ items: InventoryItem[] }>(`/inventory${queryString ? `?${queryString}` : ""}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function createInventoryItem(payload: {
  name: string;
  costPrice: number;
  unit: string;
  quantity: number;
  stock: number;
  benefits: string;
  locationId?: string;
}) {
  const token = sessionStorage.getItem("owner_token");
  return request<{ item: InventoryItem }>("/inventory", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });
}

export async function updateInventoryItem(id: string, payload: {
  name: string;
  costPrice: number;
  unit: string;
  quantity: number;
  stock: number;
  benefits: string;
  locationId?: string;
}) {
  const token = sessionStorage.getItem("owner_token");
  return request<{ item: InventoryItem }>(`/inventory/${id}`, {
    method: "PUT",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });
}

export async function deleteInventoryItem(id: string) {
  const token = sessionStorage.getItem("owner_token");
  return request<{ success: boolean; message: string }>(`/inventory/${id}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function moveStockToService(id: string, quantity: number) {
  const token = sessionStorage.getItem("owner_token");
  return request<{ item: InventoryItem; message: string }>(`/inventory/${id}/add-to-service-stock`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify({ quantity }),
  });
}

export type ServiceProduct = {
  id?: string;
  productId: string;
  quantityUsed: number;
  unit: string;
  productName?: string;
  productStock?: number;
};

export type ServiceItem = {
  id: string;
  name: string;
  price: number;
  duration: number;
  benefits: string;
  location_id: string;
  products: ServiceProduct[];
  created_at: string;
};

export async function fetchServices(locationId?: string) {
  const token = sessionStorage.getItem("owner_token");
  const params = new URLSearchParams();

  if (locationId && locationId !== "all") {
    params.set("locationId", locationId);
  }

  const queryString = params.toString();
  return request<{ services: ServiceItem[] }>(`/services${queryString ? `?${queryString}` : ""}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function createService(payload: {
  name: string;
  price: number;
  duration: number;
  benefits: string;
  locationId?: string;
  products: ServiceProduct[];
}) {
  const token = sessionStorage.getItem("owner_token");
  return request<{ service: ServiceItem }>("/services", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });
}

export async function updateService(id: string, payload: {
  name: string;
  price: number;
  duration: number;
  benefits: string;
  locationId?: string;
  products: ServiceProduct[];
}) {
  const token = sessionStorage.getItem("owner_token");
  return request<{ service: ServiceItem }>(`/services/${id}`, {
    method: "PUT",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });
}

export async function deleteService(id: string) {
  const token = sessionStorage.getItem("owner_token");
  return request<{ success: boolean; message: string }>(`/services/${id}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function executeService(serviceId: string) {
  const token = sessionStorage.getItem("owner_token");
  return request<{ success: boolean; message: string }>("/services/use", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify({ serviceId }),
  });
}

export type OwnerManager = {
  id: string;
  name: string;
  email: string;
  phone: string;
  shopName: string;
  branchId: string | null;
  location: string;
  status: "ACTIVE" | "INACTIVE";
};

function getOwnerAuthHeaders() {
  const token = sessionStorage.getItem("owner_token");
  return token ? ({ Authorization: `Bearer ${token}` } as Record<string, string>) : {};
}

export async function fetchOwnerManagers() {
  return request<{ data: OwnerManager[] }>("/owner/managers", {
    headers: getOwnerAuthHeaders(),
  });
}

export async function createOwnerManager(payload: {
  name: string;
  email: string;
  password: string;
  branchId: string;
}) {
  return request<{ data: OwnerManager }>("/owner/managers", {
    method: "POST",
    headers: getOwnerAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function deleteOwnerManager(managerId: string) {
  return request<{ success: boolean; message: string }>(`/owner/managers/${managerId}`, {
    method: "DELETE",
    headers: getOwnerAuthHeaders(),
  });
}

export async function resetOwnerManagerPassword(managerId: string, newPassword: string) {
  return request<{ success: boolean; message: string }>(`/owner/managers/${managerId}/reset-password`, {
    method: "PUT",
    headers: getOwnerAuthHeaders(),
    body: JSON.stringify({ newPassword }),
  });
}

// ─── Staff API ────────────────────────────────────────────────────────────────

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  phoneNumber: string;
  state: string;
  city: string;
  addressLine: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  idType: string;
  idNumber: string;
  joiningDate: string | null;
  notes: string;
  locationId: string;
  locationName: string;
  createdAt: string;
};

export type StaffInput = {
  name: string;
  role: string;
  phoneNumber: string;
  state?: string;
  city?: string;
  addressLine?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  idType?: string;
  idNumber?: string;
  joiningDate?: string | null;
  notes?: string;
  locationId?: string;
};

function getStaffAuthHeaders() {
  const token = sessionStorage.getItem("owner_token");
  return token ? ({ Authorization: `Bearer ${token}` } as Record<string, string>) : {};
}

export async function fetchStaff(locationId?: string) {
  const params = new URLSearchParams();
  if (locationId && locationId !== "all") params.set("locationId", locationId);
  const qs = params.toString();
  return request<{ staff: StaffMember[] }>(`/staff${qs ? `?${qs}` : ""}`, {
    headers: getStaffAuthHeaders(),
  });
}

export async function fetchStaffById(id: string) {
  return request<{ staff: StaffMember }>(`/staff/${id}`, {
    headers: getStaffAuthHeaders(),
  });
}

export async function createStaffMember(payload: StaffInput) {
  return request<{ staff: StaffMember }>("/staff", {
    method: "POST",
    headers: getStaffAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function updateStaffMember(id: string, payload: StaffInput) {
  return request<{ staff: StaffMember }>(`/staff/${id}`, {
    method: "PUT",
    headers: getStaffAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function deleteStaffMember(id: string) {
  return request<{ success: boolean; message: string }>(`/staff/${id}`, {
    method: "DELETE",
    headers: getStaffAuthHeaders(),
  });
}

// ─── Clients API ──────────────────────────────────────────────────────────────

export type ClientRecord = {
  id: string;
  name: string;
  phoneNumber: string;
  hairType: string;
  notes: string;
  lastVisitAt: string | null;
  totalVisits: number;
  tag: "NEW" | "REGULAR" | "VIP";
  preferredStaffId: string | null;
  nextFollowUpDate: string | null;
  locationId: string;
  locationName: string;
  problems: string[];
  createdAt: string;
};

export type ClientInput = {
  name: string;
  phoneNumber: string;
  hairType?: string;
  notes?: string;
  tag?: string;
  preferredStaffId?: string | null;
  nextFollowUpDate?: string | null;
  problems?: string[];
  locationId?: string;
};

export type ClientFilters = {
  search?: string;
  tag?: string;
  hairType?: string;
  lastVisit?: "today" | "7days" | "30days" | "inactive";
  problems?: string[];
};

function getClientAuthHeaders() {
  const token = sessionStorage.getItem("owner_token");
  return token ? ({ Authorization: `Bearer ${token}` } as Record<string, string>) : {};
}

export async function fetchClients(locationId?: string, filters: ClientFilters = {}) {
  const params = new URLSearchParams();
  if (locationId && locationId !== "all") params.set("locationId", locationId);
  if (filters.search) params.set("search", filters.search);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.hairType) params.set("hairType", filters.hairType);
  if (filters.lastVisit) params.set("lastVisit", filters.lastVisit);
  if (filters.problems?.length) filters.problems.forEach((p) => params.append("problems", p));
  const qs = params.toString();
  return request<{ clients: ClientRecord[] }>(`/clients${qs ? `?${qs}` : ""}`, {
    headers: getClientAuthHeaders(),
  });
}

export async function fetchClientById(id: string) {
  return request<{ client: ClientRecord }>(`/clients/${id}`, {
    headers: getClientAuthHeaders(),
  });
}

export async function createClient(payload: ClientInput) {
  return request<{ client: ClientRecord }>("/clients", {
    method: "POST",
    headers: getClientAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function updateClient(id: string, payload: ClientInput) {
  return request<{ client: ClientRecord }>(`/clients/${id}`, {
    method: "PUT",
    headers: getClientAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function deleteClient(id: string) {
  return request<{ success: boolean; message: string }>(`/clients/${id}`, {
    method: "DELETE",
    headers: getClientAuthHeaders(),
  });
}

// ─── Sales API ────────────────────────────────────────────────────────────────

export type SaleRecord = {
  id: string;
  clientName: string;
  clientPhone: string;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
  locationName: string;
};

export type SaleDetail = SaleRecord & {
  subtotal: number;
  discount: number;
  discountType: string;
  paidAmount: number;
  services: Array<{
    id: string;
    service_name: string;
    staff_name: string;
    price: number;
  }>;
  products: Array<{
    id: string;
    product_name: string;
    quantity: number;
    price: number;
  }>;
};

export type SaleInput = {
  phoneNumber: string;
  clientName?: string;
  locationId?: string;
  services: Array<{ serviceId: string; staffId: string }>;
  products: Array<{ productId: string; quantity: number }>;
  discount: number;
  discountType: "flat" | "percent";
  paymentMethod: "CASH" | "UPI" | "CARD";
  paidAmount: number;
};

export async function fetchSales(locationId?: string) {
  const params = new URLSearchParams();
  if (locationId && locationId !== "all") params.set("locationId", locationId);
  const qs = params.toString();
  return request<{ sales: SaleRecord[] }>(`/sales${qs ? `?${qs}` : ""}`, {
    headers: getOwnerAuthHeaders(),
  });
}

export async function fetchSaleById(id: string) {
  return request<{ sale: SaleDetail }>(`/sales/${id}`, {
    headers: getOwnerAuthHeaders(),
  });
}

export async function createSale(payload: SaleInput) {
  return request<{ saleId: string; totalAmount: number }>("/sales", {
    method: "POST",
    headers: getOwnerAuthHeaders(),
    body: JSON.stringify(payload),
  });
}


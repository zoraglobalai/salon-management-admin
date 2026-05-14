import type { ApiListResponse, DashboardMetrics, DashboardSummaryResponse, ResourceItem } from "./types";
import { clearOwnerSession } from "../modules/auth/services/sessionSync";

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

function getOwnerAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("owner_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
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
      clearOwnerSession({ redirectToLogin: true });
    }
    const errorBody = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(errorBody.message || "Request failed");
  }

  return response.json() as Promise<T>;
}

export async function fetchDashboard() {
  return request<{ metrics: DashboardMetrics }>("/dashboard");
}

export async function fetchDashboardSummary(filters?: { date?: string; branchId?: string; trendRange?: "7d" | "month" | "prev_month" }) {
  const token = sessionStorage.getItem("owner_token");
  const params = new URLSearchParams();

  if (filters?.date) {
    params.set("date", filters.date);
  }

  if (filters?.branchId && filters.branchId !== "all") {
    params.set("branchId", filters.branchId);
  }

  if (filters?.trendRange) {
    params.set("trendRange", filters.trendRange);
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
  unit: "ml" | "pcs";
  quantity: number;
  stock: number;
  lowStockThreshold: number;
  serviceQuantity: number;
  benefits: string;
  locationId: string;
  locationName: string;
  vendorId: string | null;
  vendorName: string | null;
  lastPurchaseId: string | null;
  lastPurchaseDate: string | null;
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
  basePlanPrice?: string;
  remainingCredit?: string;
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
  trialPeriodDays: number;
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
  quotedFinalAmount?: number;
  quotedRemainingCredit?: number;
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
  lowStockThreshold: number;
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
  lowStockThreshold: number;
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

export type VendorRecord = {
  id: string;
  vendorName: string;
  companyName: string;
  category: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  status: "ACTIVE" | "INACTIVE";
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type VendorInput = {
  vendorName: string;
  companyName?: string;
  category?: string;
  phone: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  status?: "ACTIVE" | "INACTIVE";
  notes?: string;
};

export async function fetchVendors(filters: { search?: string; status?: "ACTIVE" | "INACTIVE" | "ALL" } = {}) {
  const token = sessionStorage.getItem("owner_token");
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status && filters.status !== "ALL") params.set("status", filters.status);
  const qs = params.toString();
  return request<{ vendors: VendorRecord[] }>(`/vendors${qs ? `?${qs}` : ""}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function createVendor(payload: VendorInput) {
  const token = sessionStorage.getItem("owner_token");
  return request<{ vendor: VendorRecord }>("/vendors", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });
}

export async function updateVendor(id: string, payload: VendorInput) {
  const token = sessionStorage.getItem("owner_token");
  return request<{ vendor: VendorRecord }>(`/vendors/${id}`, {
    method: "PUT",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });
}

export async function deleteVendor(id: string) {
  const token = sessionStorage.getItem("owner_token");
  return request<{ success: boolean; message: string }>(`/vendors/${id}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export type PurchaseItemInput = {
  productName: string;
  category?: string;
  unit: "ML" | "PCS" | "KG" | "Litre";
  costPrice: number;
  gst: number;
  gstType?: "AMOUNT" | "PERCENT";
  initialStock: number;
  initialQuantity: number;
  lowStockAlert: number;
  serviceStock: number;
  expiryDate?: string;
  batchNumber?: string;
};

export type PurchaseRecord = {
  id: string;
  vendorId: string;
  vendorName: string;
  locationId: string;
  locationName: string;
  purchaseDate: string;
  invoiceNumber: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  notes: string;
  createdAt: string;
  productsBought?: string;
  totalStock?: number;
  perProductCost?: number;
  perProductGst?: number;
  items?: Array<{
    id: string;
    purchaseId: string;
    productName: string;
    category: string;
    unit: string;
    costPrice: number;
    gst: number;
    gstType?: "AMOUNT" | "PERCENT";
    initialStock: number;
    initialQuantity: number;
    lowStockAlert: number;
    serviceStock: number;
    expiryDate: string | null;
    batchNumber: string;
    createdAt: string;
  }>;
};

export async function fetchPurchases(locationId?: string) {
  const token = sessionStorage.getItem("owner_token");
  const params = new URLSearchParams();
  if (locationId && locationId !== "all") params.set("locationId", locationId);
  const qs = params.toString();
  return request<{ purchases: PurchaseRecord[] }>(`/purchases${qs ? `?${qs}` : ""}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function fetchPurchaseById(id: string) {
  const token = sessionStorage.getItem("owner_token");
  return request<{ purchase: PurchaseRecord }>(`/purchases/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function createPurchase(payload: {
  vendorId: string;
  locationId?: string;
  purchaseDate: string;
  invoiceNumber?: string;
  paymentStatus: string;
  paymentMethod: string;
  notes?: string;
  items: PurchaseItemInput[];
}) {
  const token = sessionStorage.getItem("owner_token");
  return request<{ purchase: PurchaseRecord; items: PurchaseRecord["items"] }>("/purchases", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });
}

export async function updatePurchase(id: string, payload: {
  vendorId: string;
  locationId?: string;
  purchaseDate: string;
  invoiceNumber?: string;
  paymentStatus: string;
  paymentMethod: string;
  notes?: string;
  items: PurchaseItemInput[];
}) {
  const token = sessionStorage.getItem("owner_token");
  try {
    return await request<{ purchase: PurchaseRecord; items: PurchaseRecord["items"] }>(`/purchases/${id}`, {
      method: "PUT",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!message.toLowerCase().includes("route not found")) {
      throw error;
    }
    return request<{ purchase: PurchaseRecord; items: PurchaseRecord["items"] }>(`/purchases/${id}`, {
      method: "PATCH",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(payload),
    });
  }
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

export type ComboServiceItem = {
  id: string;
  name: string;
  price: number;
  duration: number;
  location_id: string;
  created_at: string;
  updated_at: string;
  services: Array<{
    serviceId: string;
    serviceName: string;
    price: number;
    duration: number;
  }>;
};

export async function fetchServices(locationId?: string) {
  const token = sessionStorage.getItem("owner_token");
  const params = new URLSearchParams();

  if (locationId && locationId !== "all") {
    params.set("locationId", locationId);
  }

  const queryString = params.toString();
  return request<{ services: ServiceItem[]; comboServices?: ComboServiceItem[] }>(`/services${queryString ? `?${queryString}` : ""}`, {
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

export async function createComboService(payload: {
  name: string;
  price: number;
  duration: number;
  locationId?: string;
  serviceIds: string[];
}) {
  const token = sessionStorage.getItem("owner_token");
  return request<{ comboService: ComboServiceItem }>("/services/combos", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(payload),
  });
}

export async function updateComboService(id: string, payload: {
  name: string;
  price: number;
  duration: number;
  locationId?: string;
  serviceIds: string[];
}) {
  const token = sessionStorage.getItem("owner_token");
  return request<{ comboService: ComboServiceItem }>(`/services/combos/${id}`, {
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

export async function deleteComboService(id: string) {
  const token = sessionStorage.getItem("owner_token");
  return request<{ success: boolean; message: string }>(`/services/combos/${id}`, {
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

export type StaffPayroll = {
  salaryType: "monthly" | "weekly";
  salaryAmount: number;
  paymentMethod: "Cash" | "Bank Transfer" | "UPI";
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
};

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  phoneNumber: string;
  currentState: string;
  currentCity: string;
  currentAddressLine: string;
  state: string;
  city: string;
  addressLine: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  idType: string;
  idNumber: string;
  identificationDetails: Array<{
    idType: string;
    idNumber: string;
  }>;
  joiningDate: string | null;
  notes: string;
  locationId: string;
  locationName: string;
  payroll?: StaffPayroll;
  createdAt: string;
};

export type StaffInput = {
  name: string;
  role: string;
  phoneNumber: string;
  currentState?: string;
  currentCity?: string;
  currentAddressLine?: string;
  state?: string;
  city?: string;
  addressLine?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  idType?: string;
  idNumber?: string;
  identificationDetails?: Array<{
    idType?: string;
    idNumber?: string;
  }>;
  joiningDate?: string | null;
  notes?: string;
  locationId?: string;
  payroll?: StaffPayroll;
};

function getStaffAuthHeaders() {
  const token = sessionStorage.getItem("owner_token");
  return token ? ({ Authorization: `Bearer ${token}` } as Record<string, string>) : {};
}

type StaffResponseShape = Partial<StaffMember> & {
  phone_number?: string;
  current_state?: string;
  current_city?: string;
  current_address_line?: string;
  address_line?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  id_type?: string;
  id_number?: string;
  joining_date?: string | null;
  location_id?: string;
  location_name?: string;
  created_at?: string;
  identification_details?: Array<{
    idType?: string;
    idNumber?: string;
    id_type?: string;
    id_number?: string;
  }>;
  financialAccount?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bank_name?: string;
    account_number?: string;
    ifsc_code?: string;
  };
  payroll?: {
    salaryType?: "monthly" | "weekly";
    salary_type?: "monthly" | "weekly";
    salaryAmount?: number;
    salary_amount?: string | number;
    paymentMethod?: "Cash" | "Bank Transfer" | "UPI";
    payment_method?: "Cash" | "Bank Transfer" | "UPI";
    bankName?: string;
    bank_name?: string;
    accountNumber?: string;
    account_number?: string;
    ifscCode?: string;
    ifsc_code?: string;
    upiId?: string;
    upi_id?: string;
  };
};

type StaffIdentificationItem = {
  idType?: string;
  idNumber?: string;
  id_type?: string;
  id_number?: string;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeIdentificationDetails(raw: StaffResponseShape) {
  const collection: StaffIdentificationItem[] = Array.isArray(raw.identificationDetails)
    ? raw.identificationDetails
    : Array.isArray(raw.identification_details)
      ? raw.identification_details
      : [];

  const normalized = collection
    .map((item) => ({
      idType: normalizeText(item?.idType ?? item?.id_type),
      idNumber: normalizeText(item?.idNumber ?? item?.id_number),
    }))
    .filter((item) => item.idType || item.idNumber);

  if (normalized.length > 0) return normalized;

  const fallbackIdType = normalizeText(raw.idType ?? raw.id_type);
  const fallbackIdNumber = normalizeText(raw.idNumber ?? raw.id_number);

  return fallbackIdType || fallbackIdNumber
    ? [{ idType: fallbackIdType, idNumber: fallbackIdNumber }]
    : [];
}

function normalizeStaffMember(raw: StaffResponseShape): StaffMember {
  const financialAccount = raw.financialAccount ?? {};
  const identificationDetails = normalizeIdentificationDetails(raw);
  const payrollRaw = (raw.payroll ?? {}) as any;

  const payroll: StaffPayroll | undefined = (payrollRaw.salaryType || payrollRaw.salary_type)
    ? {
        salaryType: (payrollRaw.salaryType ?? payrollRaw.salary_type) as "monthly" | "weekly",
        salaryAmount: Number(payrollRaw.salaryAmount ?? payrollRaw.salary_amount ?? 0),
        paymentMethod: (payrollRaw.paymentMethod ?? payrollRaw.payment_method ?? "Cash") as "Cash" | "Bank Transfer" | "UPI",
        bankName: normalizeText(payrollRaw.bankName ?? payrollRaw.bank_name),
        accountNumber: normalizeText(payrollRaw.accountNumber ?? payrollRaw.account_number),
        ifscCode: normalizeText(payrollRaw.ifscCode ?? payrollRaw.ifsc_code),
        upiId: normalizeText(payrollRaw.upiId ?? payrollRaw.upi_id),
      }
    : undefined;

  return {
    id: normalizeText(raw.id),
    name: normalizeText(raw.name),
    role: normalizeText(raw.role),
    phoneNumber: normalizeText(raw.phoneNumber ?? raw.phone_number),
    currentState: normalizeText(raw.currentState ?? raw.current_state ?? raw.state),
    currentCity: normalizeText(raw.currentCity ?? raw.current_city ?? raw.city),
    currentAddressLine: normalizeText(raw.currentAddressLine ?? raw.current_address_line ?? raw.addressLine ?? raw.address_line),
    state: normalizeText(raw.state),
    city: normalizeText(raw.city),
    addressLine: normalizeText(raw.addressLine ?? raw.address_line),
    bankName: normalizeText(raw.bankName ?? raw.bank_name ?? financialAccount.bankName ?? financialAccount.bank_name ?? payroll?.bankName),
    accountNumber: normalizeText(raw.accountNumber ?? raw.account_number ?? financialAccount.accountNumber ?? financialAccount.account_number ?? payroll?.accountNumber),
    ifscCode: normalizeText(raw.ifscCode ?? raw.ifsc_code ?? financialAccount.ifscCode ?? financialAccount.ifsc_code ?? payroll?.ifscCode),
    idType: identificationDetails[0]?.idType ?? normalizeText(raw.idType ?? raw.id_type),
    idNumber: identificationDetails[0]?.idNumber ?? normalizeText(raw.idNumber ?? raw.id_number),
    identificationDetails,
    joiningDate: raw.joiningDate ?? raw.joining_date ?? null,
    notes: normalizeText(raw.notes),
    locationId: normalizeText(raw.locationId ?? raw.location_id),
    locationName: normalizeText(raw.locationName ?? raw.location_name),
    payroll,
    createdAt: normalizeText(raw.createdAt ?? raw.created_at),
  };
}

export async function fetchStaff(locationId?: string) {
  const params = new URLSearchParams();
  if (locationId && locationId !== "all") params.set("locationId", locationId);
  const qs = params.toString();
  const response = await request<{ staff: StaffResponseShape[] }>(`/staff${qs ? `?${qs}` : ""}`, {
    headers: getStaffAuthHeaders(),
  });
  return { staff: (response.staff || []).map(normalizeStaffMember) };
}

export async function fetchStaffById(id: string) {
  const response = await request<{ staff: StaffResponseShape }>(`/staff/${id}`, {
    headers: getStaffAuthHeaders(),
  });
  return { staff: normalizeStaffMember(response.staff || {}) };
}

export async function createStaffMember(payload: StaffInput) {
  const response = await request<{ staff: StaffResponseShape }>("/staff", {
    method: "POST",
    headers: getStaffAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return { staff: normalizeStaffMember(response.staff || {}) };
}

export async function updateStaffMember(id: string, payload: StaffInput) {
  const response = await request<{ staff: StaffResponseShape }>(`/staff/${id}`, {
    method: "PUT",
    headers: getStaffAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return { staff: normalizeStaffMember(response.staff || {}) };
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

export type CustomerVisitHistoryItem = {
  saleId: string;
  saleDate: string;
  totalAmount: number;
  paymentMethod: string;
  locationName: string;
  services: Array<{
    serviceName: string;
    staffName: string | null;
    price: number;
  }>;
  products: Array<{
    productName: string;
    quantity: number;
    price: number;
  }>;
};

export type CustomerDetailRecord = ClientRecord & {
  recentVisits: CustomerVisitHistoryItem[];
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
  return request<{ client: CustomerDetailRecord }>(`/clients/${id}`, {
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
  paymentMethod: string | null;
  createdAt: string;
  locationName: string;
  status: "DRAFT" | "COMPLETED";
  updatedAt?: string | null;
};

export type SaleDetail = SaleRecord & {
  client_name?: string;
  client_phone?: string;
  subtotal: number;
  discount: number;
  discountType: string;
  discount_type?: string;
  paidAmount: number;
  paid_amount?: number;
  location_id?: string;
  locationId?: string;
  services: Array<{
    id: string;
    service_id?: string;
    service_name: string;
    staff_id?: string | null;
    staff_name: string | null;
    price: number;
    combo_service_id?: string | null;
    combo_service_name?: string | null;
    combo_total_price?: number | null;
  }>;
  products: Array<{
    id: string;
    product_id?: string;
    product_name: string;
    quantity: number;
    price: number;
  }>;
};

export type SaleServiceDraftLine =
  | {
      serviceId: string;
      staffId?: string | null;
    }
  | {
      comboServiceId: string;
      services: Array<{
        serviceId: string;
        staffId?: string | null;
      }>;
    };

export type SaleDraftInput = {
  phoneNumber: string;
  clientName?: string;
  locationId?: string;
  services: SaleServiceDraftLine[];
  products: Array<{ productId: string; quantity: number }>;
  discount: number;
  discountType: "flat" | "percent";
};

export type SaleCheckoutInput = SaleDraftInput & {
  paymentMethod: "CASH" | "UPI" | "CARD";
  paidAmount: number;
};

export type SaleFilters = {
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  staffId?: string;
  serviceId?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export async function fetchSales(locationId?: string, filters: SaleFilters = {}) {
  const params = new URLSearchParams();
  if (locationId && locationId !== "all") params.set("locationId", locationId);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.paymentMethod && filters.paymentMethod !== "all") params.set("paymentMethod", filters.paymentMethod);
  if (filters.staffId && filters.staffId !== "all") params.set("staffId", filters.staffId);
  if (filters.serviceId && filters.serviceId !== "all") params.set("serviceId", filters.serviceId);
  if (filters.minAmount) params.set("minAmount", filters.minAmount.toString());
  if (filters.maxAmount) params.set("maxAmount", filters.maxAmount.toString());
  if (filters.search) params.set("search", filters.search);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);

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

export async function fetchSaleDrafts(locationId?: string) {
  const params = new URLSearchParams();
  if (locationId && locationId !== "all") params.set("locationId", locationId);
  const qs = params.toString();
  return request<{ sales: SaleRecord[] }>(`/sales/drafts${qs ? `?${qs}` : ""}`, {
    headers: getOwnerAuthHeaders(),
  });
}

export async function createSaleDraft(payload: SaleDraftInput) {
  return request<{ saleId: string; totalAmount: number; status: "DRAFT" }>("/sales/drafts", {
    method: "POST",
    headers: getOwnerAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function updateSaleDraft(id: string, payload: SaleDraftInput) {
  return request<{ saleId: string; totalAmount: number; status: "DRAFT" }>(`/sales/drafts/${id}`, {
    method: "PUT",
    headers: getOwnerAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function finalizeSaleDraft(id: string, payload: SaleCheckoutInput) {
  return request<{ saleId: string; totalAmount: number; status: "COMPLETED" }>(`/sales/drafts/${id}/checkout`, {
    method: "POST",
    headers: getOwnerAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

// ─── Reports API ──────────────────────────────────────────────────────────────

export type ReportFilters = {
  startDate?: string;
  endDate?: string;
  locationId?: string;
  paymentMethod?: string;
  interval?: string;
  page?: number;
  limit?: number;
};

export async function fetchSalesReport(filters: ReportFilters) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.locationId && filters.locationId !== "all") params.set("locationId", filters.locationId);
  if (filters.paymentMethod && filters.paymentMethod !== "all") params.set("paymentMethod", filters.paymentMethod);
  if (filters.interval) params.set("interval", filters.interval);
  if (filters.page) params.set("page", filters.page.toString());
  if (filters.limit) params.set("limit", filters.limit.toString());

  const qs = params.toString();
  return request<{ success: boolean; data: any }>(`/reports/sales${qs ? `?${qs}` : ""}`, {
    headers: getOwnerAuthHeaders(),
  });
}

export async function fetchCustomerReport(filters: { startDate?: string; endDate?: string; locationId?: string }) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.locationId && filters.locationId !== "all") params.set("locationId", filters.locationId);

  const qs = params.toString();
  return request<{ success: boolean; data: any }>(`/reports/customers${qs ? `?${qs}` : ""}`, {
    headers: getOwnerAuthHeaders(),
  });
}

export async function fetchStaffReport(filters: { startDate?: string; endDate?: string; locationId?: string }) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.locationId && filters.locationId !== "all") params.set("locationId", filters.locationId);

  const qs = params.toString();
  return request<{ success: boolean; data: any }>(`/reports/staff${qs ? `?${qs}` : ""}`, {
    headers: getOwnerAuthHeaders(),
  });
}

export async function fetchServiceReport(filters: { startDate?: string; endDate?: string; locationId?: string }) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.locationId && filters.locationId !== "all") params.set("locationId", filters.locationId);

  const qs = params.toString();
  return request<{ success: boolean; data: any }>(`/reports/services${qs ? `?${qs}` : ""}`, {
    headers: getOwnerAuthHeaders(),
  });
}

export async function fetchInventoryReport(filters: { locationId?: string }) {
  const params = new URLSearchParams();
  if (filters.locationId && filters.locationId !== "all") params.set("locationId", filters.locationId);

  const qs = params.toString();
  return request<{ success: boolean; data: any }>(`/reports/inventory${qs ? `?${qs}` : ""}`, {
    headers: getOwnerAuthHeaders(),
  });
}

export async function fetchReportsSummary(filters: { startDate?: string; endDate?: string; locationId?: string }) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.locationId && filters.locationId !== "all") params.set("locationId", filters.locationId);

  const qs = params.toString();
  return request<{ success: boolean; data: any }>(`/reports/summary${qs ? `?${qs}` : ""}`, {
    headers: getOwnerAuthHeaders(),
  });
}

export async function fetchPurchaseReport(filters: {
  startDate?: string;
  endDate?: string;
  locationId?: string;
  vendorId?: string;
  product?: string;
  category?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  createdBy?: string;
}) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.locationId && filters.locationId !== "all") params.set("locationId", filters.locationId);
  if (filters.vendorId && filters.vendorId !== "all") params.set("vendorId", filters.vendorId);
  if (filters.product) params.set("product", filters.product);
  if (filters.category && filters.category !== "all") params.set("category", filters.category);
  if (filters.paymentStatus && filters.paymentStatus !== "all") params.set("paymentStatus", filters.paymentStatus);
  if (filters.paymentMethod && filters.paymentMethod !== "all") params.set("paymentMethod", filters.paymentMethod);
  if (filters.createdBy) params.set("createdBy", filters.createdBy);

  const qs = params.toString();
  return request<{ success: boolean; data: any }>(`/reports/purchases${qs ? `?${qs}` : ""}`, {
    headers: getOwnerAuthHeaders(),
  });
}
// ─── Notifications API ──────────────────────────────────────────────────────────

export type NotificationCategory = "REVENUE" | "STAFF" | "SERVICE" | "CUSTOMER" | "BRANCH" | "INVENTORY";

export type SalonNotification = {
  id: string;
  userId: string;
  role: string;
  type: string;
  title: string;
  message: string;
  category: NotificationCategory;
  metadata: any;
  isRead: boolean;
  createdAt: string;
};

export async function fetchNotifications(limit: number = 20) {
  const token = sessionStorage.getItem("owner_token");
  return request<SalonNotification[]>(`/notifications?limit=${limit}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function markNotificationAsRead(id: string) {
  const token = sessionStorage.getItem("owner_token");
  return request<{ success: boolean }>(`/notifications/${id}/read`, {
    method: "PATCH",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function markAllNotificationsAsRead() {
  const token = sessionStorage.getItem("owner_token");
  return request<{ success: boolean }>("/notifications/read-all", {
    method: "PATCH",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

// ─── Attendance API ──────────────────────────────────────────────────────────

export type AttendanceStatus = "present" | "half_day" | "paid_leave" | "lop" | "week_off" | "holiday";

export type MonthlyAttendanceData = {
  staff: Array<{ id: string; name: string; role: string }>;
  attendance: Record<string, Record<string, AttendanceStatus>>;
};

export type StaffCalendarData = {
  events: Array<{ id: string; date: string; status: AttendanceStatus }>;
  summary: Record<string, number>;
};

export async function fetchMonthlyAttendance(month: number, year: number, branchId?: string): Promise<MonthlyAttendanceData> {
  const params = new URLSearchParams({ month: month.toString(), year: year.toString() });
  if (branchId) params.append("branchId", branchId);
  const r = await request<MonthlyAttendanceData>(`/attendance/monthly?${params}`, { headers: getOwnerAuthHeaders() });
  return r;
}

export async function upsertAttendance(data: {
  employeeId: string;
  branchId: string;
  attendanceDate: string;
  status: AttendanceStatus;
  remarks?: string;
}) {
  return request<{ success: boolean; record: any }>("/attendance", {
    method: "POST",
    headers: getOwnerAuthHeaders(),
    body: JSON.stringify(data),
  });
}

export async function bulkMarkPresent(branchId: string, date: string) {
  return request<{ success: boolean; count: number }>("/attendance/bulk", {
    method: "POST",
    headers: getOwnerAuthHeaders(),
    body: JSON.stringify({ branchId, date }),
  });
}

export async function fetchStaffCalendar(employeeId: string): Promise<StaffCalendarData> {
  return request<StaffCalendarData>(`/attendance/calendar/${employeeId}`, {
    headers: getOwnerAuthHeaders(),
  });
}

export async function deleteAttendance(employeeId: string, attendanceDate: string) {
  const params = new URLSearchParams({ employeeId, attendanceDate });
  return request<{ success: boolean }>(`/attendance?${params}`, {
    method: "DELETE",
    headers: getOwnerAuthHeaders(),
  });
}

// ─── Appointments API ────────────────────────────────────────────────────────

export type AppointmentStatus = 'booked' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: string;
  tenant_id: string;
  branch_id: string;
  customer_id?: string;
  staff_id: string;
  service_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes?: string;
  customer_name?: string;
  staff_name?: string;
  service_name?: string;
}

export interface AppointmentCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps: Appointment;
}

export interface AppointmentInput {
  customerId?: string;
  branchId: string;
  staffId: string;
  serviceId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status?: AppointmentStatus;
  notes?: string;
}

export interface Holiday {
  id: string;
  holiday_name: string;
  holiday_date: string;
  is_recurring: boolean;
  branch_id?: string;
}

export async function fetchDailyAppointments(date: string, branchId?: string): Promise<Appointment[]> {
  const params = new URLSearchParams({ date });
  if (branchId && branchId !== 'all') params.append("branchId", branchId);
  return request<Appointment[]>(`/appointments/daily?${params}`, { headers: getOwnerAuthHeaders() });
}

export async function fetchCalendarAppointments(startDate: string, endDate: string, branchId?: string): Promise<AppointmentCalendarEvent[]> {
  const params = new URLSearchParams({ startDate, endDate });
  if (branchId && branchId !== 'all') params.append("branchId", branchId);
  return request<AppointmentCalendarEvent[]>(`/appointments/calendar?${params}`, { headers: getOwnerAuthHeaders() });
}

export async function createAppointment(data: AppointmentInput): Promise<Appointment> {
  return request<Appointment>("/appointments", {
    method: "POST",
    headers: getOwnerAuthHeaders(),
    body: JSON.stringify(data),
  });
}

export async function updateAppointment(id: string, data: AppointmentInput): Promise<Appointment> {
  return request<Appointment>(`/appointments/${id}`, {
    method: "PUT",
    headers: getOwnerAuthHeaders(),
    body: JSON.stringify(data),
  });
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
  return request<Appointment>(`/appointments/${id}/status`, {
    method: "PUT",
    headers: getOwnerAuthHeaders(),
    body: JSON.stringify({ status }),
  });
}

export async function deleteAppointment(id: string): Promise<{ id: string }> {
  return request<{ id: string }>(`/appointments/${id}`, {
    method: "DELETE",
    headers: getOwnerAuthHeaders(),
  });
}

export async function fetchHolidays(branchId?: string): Promise<Holiday[]> {
  const params = new URLSearchParams();
  if (branchId && branchId !== 'all') params.append("branchId", branchId);
  return request<Holiday[]>(`/appointments/holidays?${params}`, { headers: getOwnerAuthHeaders() });
}

export async function createHoliday(data: { branchId?: string, holidayName: string, holidayDate: string, isRecurring?: boolean }): Promise<Holiday> {
  return request<Holiday>("/appointments/holidays", {
    method: "POST",
    headers: getOwnerAuthHeaders(),
    body: JSON.stringify(data),
  });
}

export async function deleteHoliday(id: string): Promise<{ id: string }> {
  return request<{ id: string }>(`/appointments/holidays/${id}`, {
    method: "DELETE",
    headers: getOwnerAuthHeaders(),
  });
}
export async function fetchBusySlots(staffId: string, date: string) {
  return request<{ start_time: string; end_time: string }[]>(`/appointments/busy-slots?staffId=${staffId}&date=${date}`, {
    headers: getOwnerAuthHeaders(),
  });
}

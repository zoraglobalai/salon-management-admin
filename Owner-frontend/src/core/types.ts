export type UserRole = "admin" | "owner" | "manager";
export type BusinessRole = "OWNER" | "MANAGER";
export type UserMode = "OPERATOR" | "MONITOR";

export type AuthUser = {
  id?: string;
  tenant_id: string | null;
  user_id: string;
  branch_id: string | null;
  type: UserRole;
  role?: BusinessRole;
  mode?: UserMode;
  email: string;
  full_name: string;
  tenant_name?: string;
  branch_name?: string;
};

export type ApiListResponse<T> = {
  items: T[];
};

export type DashboardMetrics = Record<string, number>;

export type DashboardSummaryBranch = {
  branchId: string;
  branchName: string;
  totalSales: number;
  revenue: number;
  clients: number;
  payments: number;
};

export type DashboardSummaryResponse = {
  role: UserRole;
  branchCount: number;
  totals: {
    totalSales: number;
    revenue: number;
    clients: number;
    payments: number;
    avgOrderValue: number;
  };
  today: {
    sales: number;
    revenue: number;
    clients: number;
    payments: number;
  };
  yesterday: {
    sales: number;
    revenue: number;
    clients: number;
    avgOrderValue: number;
  };
  trend: Array<{
    day: string;
    sales: number;
    revenue: number;
  }>;
  topServices: Array<{
    serviceName: string;
    salesCount: number;
    revenue: number;
  }>;
  recentSales: Array<{
    id: string;
    clientName: string;
    serviceName: string;
    totalAmount: number;
    paymentMethod: string;
    createdAt: string | null;
  }>;
  paymentMethods: Array<{
    paymentMethod: string;
    amount: number;
    count: number;
  }>;
  todayStatus: {
    completed: number;
    pending: number;
    cancelled: number;
  };
  branches: DashboardSummaryBranch[];
};

export type ResourceItem = Record<string, string | number | boolean | null>;

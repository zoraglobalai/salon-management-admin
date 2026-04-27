import type { AuthUserPayload } from "../../../shared/types/auth";

export type ResourceKey =
  | "tenants"
  | "branches"
  | "users"
  | "clients"
  | "appointments"
  | "sales"
  | "staff"
  | "services"
  | "inventory"
  | "support_tickets"
  | "audit_logs";

type ResourceConfig = {
  table: string;
  select: string;
  orderBy: string;
  roles: AuthUserPayload["type"][];
  createColumns?: string[];
  readonly?: boolean;
  ownerBranchOverride?: boolean;
  branchScopeColumn?: string;
};

export const resourceMap: Record<ResourceKey, ResourceConfig> = {
  tenants: {
    table: "tenants",
    select: "id, name, subscription_status, contact_email, created_at",
    orderBy: "created_at DESC",
    roles: ["admin"],
    createColumns: ["name", "subscription_status", "contact_email"],
  },
  branches: {
    table: "branches",
    select: "id, tenant_id, name, city, address, phone, created_at",
    orderBy: "created_at DESC",
    roles: ["admin", "owner", "manager"],
    createColumns: ["tenant_id", "name", "city", "address", "phone"],
    ownerBranchOverride: true,
    branchScopeColumn: "id",
  },
  users: {
    table: "users",
    select: "id, tenant_id, branch_id, full_name, email, type, is_active, created_at",
    orderBy: "created_at DESC",
    roles: ["admin", "owner"],
    readonly: true,
  },
  clients: {
    table: "clients",
    select: "id, tenant_id, branch_id, user_id, full_name, phone, email, last_visit_at, total_visits, created_at",
    orderBy: "created_at DESC",
    roles: ["owner", "manager"],
    createColumns: ["tenant_id", "branch_id", "user_id", "full_name", "phone", "email", "last_visit_at", "total_visits"],
    ownerBranchOverride: true,
  },
  appointments: {
    table: "appointments",
    select: "id, tenant_id, branch_id, user_id, client_id, staff_id, service_id, appointment_at, status, notes, created_at",
    orderBy: "appointment_at DESC",
    roles: ["owner", "manager"],
    createColumns: ["tenant_id", "branch_id", "user_id", "client_id", "staff_id", "service_id", "appointment_at", "status", "notes"],
    ownerBranchOverride: true,
  },
  sales: {
    table: "sales",
    select: "id, tenant_id, branch_id, user_id, client_id, appointment_id, amount, payment_method, sale_date, created_at",
    orderBy: "sale_date DESC",
    roles: ["owner", "manager"],
    createColumns: ["tenant_id", "branch_id", "user_id", "client_id", "appointment_id", "amount", "payment_method", "sale_date"],
    ownerBranchOverride: true,
  },
  staff: {
    table: "staff",
    select: "id, tenant_id, branch_id, user_id, full_name, role_title, attendance_rate, monthly_salary, performance_score, created_at",
    orderBy: "created_at DESC",
    roles: ["owner", "manager"],
    createColumns: ["tenant_id", "branch_id", "user_id", "full_name", "role_title", "attendance_rate", "monthly_salary", "performance_score"],
    ownerBranchOverride: true,
  },
  services: {
    table: "services",
    select: "id, tenant_id, branch_id, user_id, name, duration_minutes, price, category, created_at",
    orderBy: "created_at DESC",
    roles: ["owner", "manager"],
    createColumns: ["tenant_id", "branch_id", "user_id", "name", "duration_minutes", "price", "category"],
    ownerBranchOverride: true,
  },
  inventory: {
    table: "inventory",
    select: "id, tenant_id, branch_id, user_id, item_name, sku, quantity, reorder_level, unit_cost, created_at",
    orderBy: "created_at DESC",
    roles: ["owner", "manager"],
    createColumns: ["tenant_id", "branch_id", "user_id", "item_name", "sku", "quantity", "reorder_level", "unit_cost"],
    ownerBranchOverride: true,
  },
  support_tickets: {
    table: "support_tickets",
    select: "id, tenant_id, branch_id, user_id, subject, status, priority, created_at",
    orderBy: "created_at DESC",
    roles: ["admin", "owner", "manager"],
    createColumns: ["tenant_id", "branch_id", "user_id", "subject", "status", "priority"],
    ownerBranchOverride: true,
  },
  audit_logs: {
    table: "audit_logs",
    select: "id, tenant_id, branch_id, user_id, action, details, created_at",
    orderBy: "created_at DESC",
    roles: ["admin"],
    readonly: true,
  },
};

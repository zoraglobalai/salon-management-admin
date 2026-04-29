export type DashboardNavigationItem = {
  label: string;
  to: string;
  icon: string;
};

export type DashboardWorkspaceConfig = {
  title: string;
  subtitle: string;
  navigation: DashboardNavigationItem[];
};

const getBaseNavigation = (): DashboardNavigationItem[] => [
  { label: "Dashboard", to: "/dashboard", icon: "[]" },
  { label: "Sales", to: "/dashboard/sales/pos", icon: "💰" },
  { label: "Sales History", to: "/dashboard/sales/history", icon: "📜" },
  { label: "Clients", to: "/dashboard/clients", icon: "()" },
  { label: "Staff", to: "/dashboard/staff", icon: "<>" },
  { label: "Services", to: "/dashboard/services", icon: "#" },
  { label: "Inventory", to: "/dashboard/inventory", icon: "%" },
  { label: "WhatsApp", to: "/dashboard/automation", icon: "*" },
  { label: "Reports", to: "/dashboard/reports", icon: "=" },
  { label: "Settings", to: "/dashboard/settings", icon: "@" },
];

import type { User } from "../../auth/types/auth.types";
import { canAccessPOS } from "../../../shared/utils/posAccess";

export function getDashboardWorkspaceConfig(
  isManager: boolean,
  isMonitorView: boolean,
  user?: User | null
): DashboardWorkspaceConfig {
  const navigation = getBaseNavigation();

  // Hide Sales menu if user doesn't have POS access
  if (user && !canAccessPOS(user)) {
    // Remove both Sales and Sales History if no POS access
    return {
      title: isManager ? "Location Operations" : (isMonitorView ? "Multi-Location Overview" : "Business Overview"),
      subtitle: isManager ? "Location management" : "Business operations",
      navigation: navigation.filter((item) => 
        item.label !== "Sales" && item.label !== "Sales History"
      ).concat(!isManager ? [{ label: "Managers", to: "/dashboard/managers", icon: "👤" }] : []),
    };
  }

  if (!isManager) {
    navigation.push({ label: "Managers", to: "/dashboard/managers", icon: "👤" });
  }

  return {
    title: isManager ? "Location Operations" : (isMonitorView ? "Multi-Location Overview" : "Business Overview"),
    subtitle: isManager ? "Location management" : "Business operations",
    navigation,
  };
}

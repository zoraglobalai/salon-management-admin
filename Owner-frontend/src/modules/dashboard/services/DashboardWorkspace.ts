import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Wallet,
  ReceiptText,
  Users,
  UserRound,
  Scissors,
  Package,
  MessageCircleMore,
  BarChart3,
  UserCog,
} from "lucide-react";
import type { User } from "../../auth/types/auth.types";
import { canAccessPOS } from "../../../shared/utils/posAccess";

export type DashboardNavigationItem = {
  label: string;
  to: string;
  icon: LucideIcon;
};

export type DashboardWorkspaceConfig = {
  title: string;
  subtitle: string;
  navigation: DashboardNavigationItem[];
};

const getBaseNavigation = (): DashboardNavigationItem[] => [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Billing", to: "/dashboard/sales/pos", icon: Wallet },
  { label: "Billing History", to: "/dashboard/sales/history", icon: ReceiptText },
  { label: "Customers", to: "/dashboard/clients", icon: Users },
  { label: "Staff", to: "/dashboard/staff", icon: UserRound },
  { label: "Services", to: "/dashboard/services", icon: Scissors },
  { label: "Inventory", to: "/dashboard/inventory", icon: Package },
  { label: "WhatsApp", to: "/dashboard/automation", icon: MessageCircleMore },
  { label: "Reports", to: "/dashboard/reports", icon: BarChart3 },
];

export function getDashboardWorkspaceConfig(
  isManager: boolean,
  isMonitorView: boolean,
  user?: User | null
): DashboardWorkspaceConfig {
  const navigation = getBaseNavigation();

  if (user && !canAccessPOS(user)) {
    return {
      title: isManager ? "Location Operations" : (isMonitorView ? "Multi-Location Overview" : "Business Overview"),
      subtitle: isManager ? "Location management" : "Business operations",
      navigation: navigation
        .filter((item) => item.label !== "Billing" && item.label !== "Billing History")
        .concat(!isManager ? [{ label: "Managers", to: "/dashboard/managers", icon: UserCog }] : []),
    };
  }

  if (!isManager) {
    navigation.push({ label: "Managers", to: "/dashboard/managers", icon: UserCog });
  }

  return {
    title: isManager ? "Location Operations" : (isMonitorView ? "Multi-Location Overview" : "Business Overview"),
    subtitle: isManager ? "Location management" : "Business operations",
    navigation,
  };
}

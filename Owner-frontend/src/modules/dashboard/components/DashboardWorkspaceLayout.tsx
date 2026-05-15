import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { AppShell } from "../../../shared/components/AppShell";
import { getDashboardWorkspaceConfig } from "../services/DashboardWorkspace";
import { fetchInventory, fetchOwnerProfile } from "../../../core/api";

export function DashboardWorkspaceLayout() {
  const { user, isLoading } = useAuth();
  const [profile, setProfile] = useState<{
    businessName: string;
    totalManagers: number;
    locations: any[];
    profile: {
      role: "OWNER" | "INDEPENDENT_OWNER" | "MANAGER" | "SUPER_ADMIN";
      fullName: string;
      email: string;
      phone: string;
      shopName: string;
    };
  } | null>(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  
  const isManager = user?.role === 'MANAGER';

  const fetchProfile = () => {
    if (user) {
      fetchOwnerProfile()
        .then(res => setProfile(res.data))
        .catch(console.error);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user, isManager]);

  const refreshLowStockAlerts = () => {
    if (!user) {
      setLowStockCount(0);
      return;
    }

    fetchInventory(isManager ? user.branchId : undefined)
      .then((response) => {
        setLowStockCount(response.items.filter((item) => item.stock <= item.lowStockThreshold).length);
      })
      .catch(() => {
        setLowStockCount(0);
      });
  };

  useEffect(() => {
    refreshLowStockAlerts();
  }, [user?.id, user?.branchId, isManager]);

  const isMonitorView = !isManager && (
    user?.mode === 'MONITOR' ||
    (profile?.totalManagers !== undefined && profile.totalManagers > 0) ||
    ((profile?.locations?.length || 0) > 1)
  );
  const workspace = getDashboardWorkspaceConfig(isManager, isMonitorView, user);
  
  const displayTitle = !isManager && profile?.businessName
    ? `${profile.businessName} Dashboard`
    : workspace.title;

  if (isLoading) {
    return <div className="app-loading-state">Opening workspace...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell
      title={displayTitle}
      subtitle={workspace.subtitle}
      navigation={workspace.navigation}
      lowStockCount={lowStockCount}
      ownerLocations={profile?.locations}
      profileDetails={profile?.profile}
      onRefreshProfile={fetchProfile}
    >
      <Outlet context={{
        ownerLocations: profile?.locations,
        refreshProfile: fetchProfile,
        refreshLowStockAlerts,
      }} />
    </AppShell>
  );
}

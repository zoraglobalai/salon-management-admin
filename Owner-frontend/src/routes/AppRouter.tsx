import { Navigate, Route, Routes } from "react-router-dom";
import { Login } from "../modules/auth/pages/Login";
import { ForgotPassword } from "../modules/auth/pages/ForgotPassword";
import { ResetPassword } from "../modules/auth/pages/ResetPassword";
import { ChangePassword } from "../modules/auth/pages/ChangePassword";
import { ProtectedRoute } from "./ProtectedRoute";
import { POSRouteGuard } from "../shared/components/POSRouteGuard";
import { DashboardWorkspaceLayout } from "../modules/dashboard/components/DashboardWorkspaceLayout";
import { DashboardAutomationPage } from "../modules/dashboard/pages/DashboardAutomationPage";
import { DashboardClientsPage } from "../modules/dashboard/pages/DashboardClientsPage";
import { ClientDetailPage } from "../modules/dashboard/pages/ClientDetailPage";
import { DashboardPage } from "../modules/dashboard/pages/DashboardPage";
import { DashboardInventoryPage } from "../modules/dashboard/pages/DashboardInventoryPage";
import { ReportsLandingPage } from "../modules/reports/pages/ReportsLandingPage";
import { SalesReportPage } from "../modules/reports/pages/SalesReportPage";
import { CustomerReportPage } from "../modules/reports/pages/CustomerReportPage";
import { ServiceReportPage } from "../modules/reports/pages/ServiceReportPage";
import { StaffReportPage } from "../modules/reports/pages/StaffReportPage";
import { InventoryReportPage } from "../modules/reports/pages/InventoryReportPage";
import { PurchaseReportPage } from "../modules/reports/pages/PurchaseReportPage";
import { AttendanceReportPage } from "../modules/reports/pages/AttendanceReportPage";
import { DashboardSalesPOSPage } from "../modules/dashboard/pages/DashboardSalesPOSPage";
import { DashboardSalesPOSEditPage } from "../modules/dashboard/pages/DashboardSalesPOSEditPage";
import { DashboardSalesPOSCheckoutPage } from "../modules/dashboard/pages/DashboardSalesPOSCheckoutPage";
import { DashboardSalesHistoryPage } from "../modules/dashboard/pages/DashboardSalesHistoryPage";
import { DashboardServicesPage } from "../modules/dashboard/pages/DashboardServicesPage";
import { DashboardStaffPage } from "../modules/dashboard/pages/DashboardStaffPage";
import { DashboardAttendancePage } from "../modules/dashboard/pages/DashboardAttendancePage";
import { DashboardCalendarPage } from "../modules/dashboard/pages/DashboardCalendarPage";
import { StaffDetailPage } from "../modules/dashboard/pages/StaffDetailPage";
import { ManagerList } from "../modules/manager/pages/ManagerList";
import { DashboardPurchasePage } from "../modules/dashboard/pages/DashboardPurchasePage";
import { DashboardVendorsPage } from "../modules/dashboard/pages/DashboardVendorsPage";
import { ExpenseReportPage } from "../modules/reports/pages/ExpenseReportPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/change-password" element={<ChangePassword />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardWorkspaceLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="sales" element={<Navigate to="sales/pos" replace />} />
          <Route path="sales/pos" element={<POSRouteGuard><DashboardSalesPOSPage /></POSRouteGuard>} />
          <Route path="sales/pos/new" element={<POSRouteGuard><DashboardSalesPOSEditPage /></POSRouteGuard>} />
          <Route path="sales/pos/:draftId/edit" element={<POSRouteGuard><DashboardSalesPOSEditPage /></POSRouteGuard>} />
          <Route path="sales/pos/:draftId/checkout" element={<POSRouteGuard><DashboardSalesPOSCheckoutPage /></POSRouteGuard>} />
          <Route path="sales/history" element={<POSRouteGuard><DashboardSalesHistoryPage /></POSRouteGuard>} />
          <Route path="calendar" element={<DashboardCalendarPage />} />
          <Route path="clients" element={<DashboardClientsPage />} />
          <Route path="clients/:id" element={<ClientDetailPage />} />
          <Route path="staff" element={<DashboardStaffPage />} />
          <Route path="staff/:id" element={<StaffDetailPage />} />
          <Route path="attendance" element={<DashboardAttendancePage />} />
          <Route path="services" element={<DashboardServicesPage />} />
          <Route path="inventory" element={<DashboardInventoryPage />} />
          <Route path="purchase" element={<DashboardPurchasePage />} />
          <Route path="vendors" element={<DashboardVendorsPage />} />
          <Route path="automation" element={<DashboardAutomationPage />} />
          <Route path="reports">
            <Route index element={<ReportsLandingPage />} />
            <Route path="sales" element={<SalesReportPage />} />
            <Route path="customers" element={<CustomerReportPage />} />
            <Route path="services" element={<ServiceReportPage />} />
            <Route path="staff" element={<StaffReportPage />} />
            <Route path="inventory" element={<InventoryReportPage />} />
            <Route path="purchases" element={<PurchaseReportPage />} />
            <Route path="expenses" element={<ExpenseReportPage />} />
            <Route path="attendance" element={<AttendanceReportPage />} />
          </Route>
          <Route path="managers" element={<ManagerList />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import Layout from './Layout';

// Auth
import LoginPage from '../modules/auth/LoginPage';

// Dashboard
import DashboardPage from '../modules/dashboard/DashboardPage';

// Users
import {
  AllUsersPage,
  ActiveUsersPage,
  TrialUsersPage,
  ExpiredUsersPage,
} from '../modules/users/UsersListPage';
import CreateOwnerPage from '../modules/users/CreateOwnerPage';

// Other modules
import SubscriptionsPage from '../modules/subscriptions/SubscriptionsPage';
import RevenuePage from '../modules/revenue/RevenuePage';
import TrialsPage from '../modules/trials/TrialsPage';
import SupportPage from '../modules/support/SupportPage';
import LogsPage from '../modules/logs/LogsPage';

const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected — wrapped in Layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Users */}
            <Route path="/users" element={<AllUsersPage />} />
            <Route path="/users/active" element={<ActiveUsersPage />} />
            <Route path="/users/trial" element={<TrialUsersPage />} />
            <Route path="/users/expired" element={<ExpiredUsersPage />} />
            <Route path="/users/create" element={<CreateOwnerPage />} />

            {/* Subscriptions */}
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/subscriptions/active" element={<SubscriptionsPage />} />

            {/* Revenue */}
            <Route path="/revenue" element={<RevenuePage />} />
            <Route path="/revenue/transactions" element={<RevenuePage />} />

            {/* Trials */}
            <Route path="/trials" element={<TrialsPage />} />

            {/* Support */}
            <Route path="/support" element={<SupportPage />} />

            {/* Logs */}
            <Route path="/logs" element={<LogsPage />} />

            {/* Default redirect */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;

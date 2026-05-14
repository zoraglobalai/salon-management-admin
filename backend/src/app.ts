import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware, requireSuperAdmin } from './middleware/authMiddleware';
import operatorRoutes from './routes';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import subscriptionsRoutes from './modules/subscriptions/subscriptions.routes';
import revenueRoutes from './modules/revenue/revenue.routes';
import trialsRoutes from './modules/trials/trials.routes';
import supportRoutes from './modules/support/support.routes';
import logsRoutes from './modules/logs/logs.routes';
import { inventoryRouter } from './modules/inventory/inventory.routes';
import { servicesRouter } from './modules/services/services.routes';
import { staffRouter } from './modules/staff/staff.routes';
import { clientsRouter } from './modules/clients/clients.routes';
import salesRouter from './modules/sales/sales.routes';
import ownerRoutes from './modules/owner/owner.routes';
import reportsRouter from './modules/reports/reports.routes';
import notificationsRouter from './modules/notifications/notifications.routes';
import communicationsRouter from './modules/communications/communications.routes';
import attendanceRouter from './modules/attendance/attendance.routes';
import appointmentsRouter from './modules/appointments/appointments.routes';
import { vendorsRouter } from './modules/vendors/vendors.routes';
import { purchasesRouter } from './modules/purchases/purchases.routes';
import { expensesRouter } from './modules/expenses/expenses.routes';

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Salon Growth Engine API',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationsRouter);
app.use('/api/communications', communicationsRouter);
app.use('/api/users', authMiddleware, requireSuperAdmin, usersRoutes);
app.use('/api/subscriptions', authMiddleware, subscriptionsRoutes);
app.use('/api/revenue', authMiddleware, requireSuperAdmin, revenueRoutes);
app.use('/api/trials', authMiddleware, requireSuperAdmin, trialsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/logs', authMiddleware, requireSuperAdmin, logsRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/inventory', authMiddleware, inventoryRouter);
app.use('/api/vendors', authMiddleware, vendorsRouter);
app.use('/api/purchases', authMiddleware, purchasesRouter);
app.use('/api/expenses', authMiddleware, expensesRouter);
app.use('/api/services', authMiddleware, servicesRouter);
app.use('/api/staff', authMiddleware, staffRouter);
app.use('/api/clients', authMiddleware, clientsRouter);
app.use('/api/sales', authMiddleware, salesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/attendance', authMiddleware, attendanceRouter);
app.use('/api/appointments', authMiddleware, appointmentsRouter);
app.use('/api', authMiddleware, operatorRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

app.use(errorHandler);

export default app;

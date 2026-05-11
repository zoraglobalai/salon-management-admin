import { query } from "../../database/pool";
import { Notification, NotificationCategory } from "../../entities/platform/Notification";
import { format } from "date-fns";

export interface NotificationFilters {
  userId: string;
  role: string;
  limit?: number;
}

export const NotificationsService = {
  async getNotifications(filters: NotificationFilters) {
    const { userId, role, limit = 20 } = filters;

    // First, trigger "Smart Insight" generation for this user
    await this.generateSmartInsights(userId, role);

    const result = await query<any>(
      `SELECT * FROM notifications 
       WHERE user_id = $1 AND role = $2 
       ORDER BY created_at DESC 
       LIMIT $3`,
      [userId, role, limit]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      role: row.role,
      type: row.type,
      category: row.category,
      title: row.title,
      message: row.message,
      metadata: row.metadata,
      isRead: row.is_read,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  },

  async markAsRead(id: string, userId: string) {
    await query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
  },

  async markAllAsRead(userId: string, role: string) {
    await query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND role = $2`,
      [userId, role]
    );
  },

  async generateSmartInsights(userId: string, role: string) {
    const today = format(new Date(), "yyyy-MM-dd");
    const tenantResult = await query<any>("SELECT tenant_id, branch_id FROM users WHERE id = $1", [userId]);
    if (tenantResult.rows.length === 0) return;
    
    const { tenant_id, branch_id } = tenantResult.rows[0];

    if (role === "OWNER" || role === "INDEPENDENT_OWNER") {
      await this.generateOwnerInsights(userId, tenant_id, today);
    } else if (role === "MANAGER") {
      await this.generateManagerInsights(userId, tenant_id, branch_id, today);
    }
  },

  async generateOwnerInsights(userId: string, tenantId: string, date: string) {
    // 1. Top Branch Insight
    const topBranchResult = await query<any>(
      `SELECT b.name, SUM(s.total_amount) as revenue
       FROM sales s
       JOIN branches b ON b.id = COALESCE(s.location_id, s.branch_id)
       WHERE s.tenant_id = $1 AND DATE(s.created_at) = $2
       GROUP BY b.id, b.name
       ORDER BY revenue DESC LIMIT 1`,
      [tenantId, date]
    );

    if (topBranchResult.rows[0] && topBranchResult.rows[0].revenue > 0) {
      const { name, revenue } = topBranchResult.rows[0];
      await this.ensureNotification({
        userId,
        role: "OWNER",
        type: "TOP_BRANCH",
        category: NotificationCategory.BRANCH,
        title: `${name} is leading today`,
        message: `${name} became today's top revenue branch with ₹${Number(revenue).toLocaleString()} sales.`,
        metadata: { branchName: name, revenue, date }
      });
    }

    // 2. Top Performer Insight
    const topPerformerResult = await query<any>(
      `SELECT sm.name, COUNT(ss.id) as service_count, SUM(ss.price) as revenue
       FROM staff_members sm
       JOIN sale_services ss ON ss.staff_id = sm.id
       JOIN sales s ON s.id = ss.sale_id
       WHERE s.tenant_id = $1 AND DATE(s.created_at) = $2
       GROUP BY sm.id, sm.name
       ORDER BY revenue DESC LIMIT 1`,
      [tenantId, date]
    );

    if (topPerformerResult.rows[0] && topPerformerResult.rows[0].service_count > 5) {
      const { name, service_count, revenue } = topPerformerResult.rows[0];
      await this.ensureNotification({
        userId,
        role: "OWNER",
        type: "TOP_PERFORMER",
        category: NotificationCategory.STAFF,
        title: `${name} is today's top performer`,
        message: `${name} completed ${service_count} services and leads performance with ₹${Number(revenue).toLocaleString()} revenue.`,
        metadata: { staffName: name, serviceCount: service_count, revenue, date }
      });
    }

    // 3. Customer Loyalty Milestone
    const loyaltyResult = await query<any>(
      `SELECT c.name, c.total_visits 
       FROM clients c 
       WHERE c.tenant_id = $1 AND c.total_visits > 10
       ORDER BY c.last_visit_at DESC LIMIT 1`,
      [tenantId]
    );

    if (loyaltyResult.rows[0]) {
      const { name, total_visits } = loyaltyResult.rows[0];
      await this.ensureNotification({
        userId,
        role: "OWNER",
        type: "LOYALTY_MILESTONE",
        category: NotificationCategory.CUSTOMER,
        title: "High Loyalty Customer Active",
        message: `${name} has reached ${total_visits} visits! Consider a special loyalty reward.`,
        metadata: { clientName: name, totalVisits: total_visits, date }
      });
    }

    // 4. Low Stock Alert (Business Wide)
    const inventoryResult = await query<any>(
      `SELECT COUNT(*) as low_stock_count
       FROM inventory
       WHERE tenant_id = $1 AND stock <= COALESCE(low_stock_threshold, 5)`,
      [tenantId]
    );

    if (inventoryResult.rows[0] && Number(inventoryResult.rows[0].low_stock_count) > 0) {
      const count = Number(inventoryResult.rows[0].low_stock_count);
      await this.ensureNotification({
        userId,
        role: "OWNER",
        type: "LOW_STOCK_SUMMARY",
        category: NotificationCategory.INVENTORY,
        title: `${count} items are low in stock`,
        message: `There are ${count} items across your branches that require immediate restocking.`,
        metadata: { lowStockCount: count, date }
      });
    }
  },

  async generateManagerInsights(userId: string, tenantId: string, branchId: string, date: string) {
    // 1. Most Requested Service
    const topServiceResult = await query<any>(
      `SELECT ser.name, COUNT(ss.id) as bookings
       FROM sale_services ss
       JOIN services ser ON ser.id = ss.service_id
       JOIN sales s ON s.id = ss.sale_id
       WHERE s.tenant_id = $1 AND (s.location_id = $2 OR s.branch_id = $2) AND DATE(s.created_at) = $3
       GROUP BY ser.id, ser.name
       ORDER BY bookings DESC LIMIT 1`,
      [tenantId, branchId, date]
    );

    if (topServiceResult.rows[0] && topServiceResult.rows[0].bookings > 3) {
      const { name, bookings } = topServiceResult.rows[0];
      await this.ensureNotification({
        userId,
        role: "MANAGER",
        type: "MOST_REQUESTED_SERVICE",
        category: NotificationCategory.SERVICE,
        title: `${name} is trending today`,
        message: `${name} is the most requested service with ${bookings} bookings so far.`,
        metadata: { serviceName: name, bookings, date }
      });
    }

    // 2. Branch Revenue Update
    const revenueResult = await query<any>(
      `SELECT SUM(total_amount) as revenue
       FROM sales s
       WHERE s.tenant_id = $1 AND (s.location_id = $2 OR s.branch_id = $2) AND DATE(s.created_at) = $3`,
      [tenantId, branchId, date]
    );

    if (revenueResult.rows[0] && revenueResult.rows[0].revenue > 5000) {
      const { revenue } = revenueResult.rows[0];
      await this.ensureNotification({
        userId,
        role: "MANAGER",
        type: "BRANCH_REVENUE_UPDATE",
        category: NotificationCategory.REVENUE,
        title: `Daily revenue reached ₹${Number(revenue).toLocaleString()}`,
        message: `Your branch has generated ₹${Number(revenue).toLocaleString()} in sales today.`,
        metadata: { revenue, date }
      });
    }

    // 3. Low Stock Warning (Branch Specific)
    const lowStockResult = await query<any>(
      `SELECT COALESCE(name, item_name) as name, stock, COALESCE(low_stock_threshold, 5) as low_stock_threshold 
       FROM inventory 
       WHERE tenant_id = $1 AND (location_id = $2 OR branch_id = $2) AND stock <= COALESCE(low_stock_threshold, 5)
       ORDER BY stock ASC LIMIT 1`,
      [tenantId, branchId]
    );

    if (lowStockResult.rows[0]) {
      const { name, stock } = lowStockResult.rows[0];
      await this.ensureNotification({
        userId,
        role: "MANAGER",
        type: "LOW_STOCK_WARNING",
        category: NotificationCategory.INVENTORY,
        title: `Low Stock: ${name}`,
        message: `Stock level for ${name} is critical (${stock} remaining). Please reorder soon.`,
        metadata: { itemName: name, stock, date }
      });
    }
  },

  async triggerEvent(tenantId: string, branchId: string | null, eventType: string, data: any) {
    // Find relevant users to notify
    const users = await query<any>(
      `SELECT id, role FROM users 
       WHERE tenant_id = $1 AND (branch_id = $2 OR role = 'OWNER' OR role = 'INDEPENDENT_OWNER')`,
      [tenantId, branchId]
    );

    for (const user of users.rows) {
      if (eventType === "HIGH_VALUE_SALE" && (user.role === "OWNER" || user.role === "INDEPENDENT_OWNER")) {
        await this.ensureNotification({
          userId: user.id,
          role: user.role,
          type: "HIGH_VALUE_SALE",
          category: NotificationCategory.REVENUE,
          title: "High-value sale recorded",
          message: `A transaction of ₹${Number(data.amount).toLocaleString()} was completed at ${data.branchName}.`,
          metadata: { ...data, date: format(new Date(), "yyyy-MM-dd") }
        });
      }

      if (eventType === "REPEAT_CUSTOMER" && user.role === "MANAGER" && user.branch_id === branchId) {
        await this.ensureNotification({
          userId: user.id,
          role: user.role,
          type: "REPEAT_CUSTOMER",
          category: NotificationCategory.CUSTOMER,
          title: "Loyalty Insight: Repeat Customer",
          message: `${data.clientName} has visited ${data.visitCount} times. A top loyal customer!`,
          metadata: { ...data, date: format(new Date(), "yyyy-MM-dd") }
        });
      }
    }
  },

  async ensureNotification(data: {
    userId: string;
    role: string;
    type: string;
    category: NotificationCategory;
    title: string;
    message: string;
    metadata: any;
  }) {
    // Check if a notification of this type for this date already exists for this user
    // We use metadata->date to unique-ify daily insights
    const existing = await query(
      `SELECT id FROM notifications 
       WHERE user_id = $1 AND type = $2 AND metadata->>'date' = $3`,
      [data.userId, data.type, data.metadata.date]
    );

    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO notifications (user_id, role, type, category, title, message, metadata, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())`,
        [data.userId, data.role, data.type, data.category, data.title, data.message, JSON.stringify(data.metadata)]
      );
    } else {
      // Update existing notification to keep it fresh
      await query(
        `UPDATE notifications 
         SET title = $1, message = $2, metadata = $3, updated_at = NOW(), is_read = false
         WHERE id = $4`,
        [data.title, data.message, JSON.stringify(data.metadata), existing.rows[0].id]
      );
    }
  }
};

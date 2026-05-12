import { query } from "../../database/pool";
import { format } from "date-fns";

export interface Conversation {
  id: string;
  tenantId: string;
  type: 'DIRECT' | 'BROADCAST';
  branchId?: string;
  branchName?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  messageType: string;
  isRead: boolean;
  createdAt: string;
}

export const CommunicationsService = {
  async getConversations(userId: string, tenantId: string, role: string) {
    // 1. Ensure Broadcast exists
    await this.ensureConversation(tenantId, 'BROADCAST', undefined, userId);

    // 2. If Owner, ensure all branches have a direct conversation entry
    if (role !== 'MANAGER') {
      const branches = await query<any>("SELECT id FROM branches WHERE tenant_id = $1", [tenantId]);
      for (const branch of branches.rows) {
        await this.ensureConversation(tenantId, 'DIRECT', branch.id, userId);
      }
    }

    let whereClause = "WHERE c.tenant_id = $1";
    const params: any[] = [tenantId];

    if (role === 'MANAGER') {
      // Managers only see their branch direct chat OR the broadcast chat
      const userResult = await query<any>("SELECT branch_id FROM users WHERE id = $1", [userId]);
      const branchId = userResult.rows[0]?.branch_id;
      
      if (branchId) {
        await this.ensureConversation(tenantId, 'DIRECT', branchId, userId);
      }
      
      whereClause += " AND (c.type = 'BROADCAST' OR c.branch_id = $2)";
      params.push(branchId);
    }

    const finalParams = [...params, userId];
    const userIdIdx = finalParams.length;
    
    const result = await query<any>(
      `SELECT c.*, b.name as branch_name,
       (SELECT message FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
       (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
       (SELECT COUNT(*) FROM messages m 
        LEFT JOIN message_reads mr ON mr.message_id = m.id AND mr.user_id = $${userIdIdx}
        WHERE m.conversation_id = c.id AND m.sender_id != $${userIdIdx} AND mr.id IS NULL) as unread_count
       FROM conversations c
       LEFT JOIN branches b ON b.id = c.branch_id
       ${whereClause}
       ORDER BY last_message_at DESC NULLS LAST`,
      finalParams
    );

    return result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      type: row.type,
      branchId: row.branch_id,
      branchName: row.type === 'BROADCAST' ? 'All Branches' : row.branch_name,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at,
      unreadCount: parseInt(row.unread_count)
    }));
  },

  async getMessages(conversationId: string, userId: string, limit = 50) {
    const result = await query<any>(
      `SELECT m.*, u.name as sender_name, u.role as sender_role
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC
       LIMIT $2`,
      [conversationId, limit]
    );

    // Mark messages as read
    await this.markAsRead(conversationId, userId);

    return result.rows.map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      senderRole: row.sender_role,
      message: row.message,
      messageType: row.message_type,
      isRead: row.is_read,
      createdAt: row.created_at
    }));
  },

  async sendMessage(conversationId: string, senderId: string, messageContent: string) {
    const userResult = await query<any>("SELECT name, role FROM users WHERE id = $1", [senderId]);
    const senderRole = userResult.rows[0].role;
    const senderName = userResult.rows[0].name;

    const result = await query<any>(
      `INSERT INTO messages (conversation_id, sender_id, sender_role, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [conversationId, senderId, senderRole, messageContent]
    );

    await query(
      `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
      [conversationId]
    );

    const message = result.rows[0];
    
    return {
      id: message.id,
      conversationId: message.conversation_id,
      senderId: message.sender_id,
      senderName,
      senderRole: message.sender_role,
      message: message.message,
      messageType: message.message_type,
      isRead: message.is_read,
      createdAt: message.created_at
    };
  },

  async markAsRead(conversationId: string, userId: string) {
    // 1. Update is_read in messages (for direct messages)
    await query(
      `UPDATE messages SET is_read = true 
       WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
      [conversationId, userId]
    );

    // 2. Track in message_reads (for broadcast/history)
    await query(
      `INSERT INTO message_reads (message_id, user_id)
       SELECT id, $2 FROM messages 
       WHERE conversation_id = $1 AND sender_id != $2
       ON CONFLICT DO NOTHING`,
      [conversationId, userId]
    );
  },

  async ensureConversation(tenantId: string, type: 'DIRECT' | 'BROADCAST', branchId?: string, createdBy?: string) {
    let existing;
    if (type === 'BROADCAST') {
      existing = await query<any>(
        "SELECT id FROM conversations WHERE tenant_id = $1 AND type = 'BROADCAST'",
        [tenantId]
      );
    } else {
      existing = await query<any>(
        "SELECT id FROM conversations WHERE tenant_id = $1 AND type = 'DIRECT' AND branch_id = $2",
        [tenantId, branchId]
      );
    }

    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }

    const result = await query<any>(
      `INSERT INTO conversations (tenant_id, type, branch_id, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [tenantId, type, branchId, createdBy]
    );

    return result.rows[0].id;
  },

  async getTotalUnreadCount(userId: string) {
    const result = await query<any>(
      `SELECT COUNT(*) as count 
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       LEFT JOIN message_reads mr ON mr.message_id = m.id AND mr.user_id = $1
       WHERE m.sender_id != $1 AND mr.id IS NULL`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  }
};

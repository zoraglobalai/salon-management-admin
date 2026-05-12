import { Server, Socket } from "socket.io";
import { CommunicationsService } from "./communications.service";
import jwt from "jsonwebtoken";
import { ENV } from "../../config/env";

export const setupCommunicationsSocket = (io: Server) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    const authUserId = socket.handshake.auth.userId;
    const authRole = socket.handshake.auth.role;

    if (!token) {
      return next(new Error("Authentication error"));
    }

    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;
      socket.data.user = {
        ...decoded,
        id: authUserId || decoded.id,
        role: authRole || decoded.role
      };
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user;
    console.log(`User connected: ${user.id} (${user.role})`);

    // Join rooms
    socket.on("join_conversation", (conversationId: string) => {
      socket.join(conversationId);
      console.log(`User ${user.id} joined conversation: ${conversationId}`);
    });

    socket.on("leave_conversation", (conversationId: string) => {
      socket.leave(conversationId);
      console.log(`User ${user.id} left conversation: ${conversationId}`);
    });

    socket.on("send_message", async (data: { conversationId: string; content: string }) => {
      if (!data.conversationId || !data.content) {
        console.warn(`Invalid send_message data from user ${user.id}`);
        return;
      }

      try {
        const message = await CommunicationsService.sendMessage(
          data.conversationId,
          user.id,
          data.content
        );

        // Broadcast message to everyone in the room (including sender for confirmation)
        io.to(data.conversationId).emit("new_message", message);
        
        // Notify all participants about updated conversation list
        io.emit("conversation_updated", { 
          conversationId: data.conversationId,
          lastMessage: message.message,
          lastMessageAt: message.createdAt
        });
      } catch (err) {
        console.error(`Error sending message via socket for user ${user.id}:`, err);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${user.id}`);
    });
  });
};

import { Server, Socket } from "socket.io";
import { CommunicationsService } from "./communications.service";
import jwt from "jsonwebtoken";
import { ENV } from "../../config/env";

export const setupCommunicationsSocket = (io: Server) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }

    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user;
    console.log(`User connected to chat: ${user.name} (${user.role})`);

    // Join rooms
    socket.on("join_conversation", (conversationId: string) => {
      socket.join(conversationId);
      console.log(`${user.name} joined conversation: ${conversationId}`);
    });

    socket.on("leave_conversation", (conversationId: string) => {
      socket.leave(conversationId);
      console.log(`${user.name} left conversation: ${conversationId}`);
    });

    socket.on("send_message", async (data: { conversationId: string; content: string }) => {
      try {
        const message = await CommunicationsService.sendMessage(
          data.conversationId,
          user.id,
          data.content
        );

        // Broadcast message to everyone in the room
        io.to(data.conversationId).emit("new_message", message);
        
        // Notify all participants about updated conversation list (for unread counts/preview)
        // In a production app, we'd only notify relevant users. 
        // For now, we emit a global refresh event or specific ones if we had a participant list.
        io.emit("conversation_updated", { conversationId: data.conversationId });
      } catch (err) {
        console.error("Error sending message via socket:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected from chat: ${user.name}`);
    });
  });
};

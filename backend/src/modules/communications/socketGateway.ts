import type { Server } from "socket.io";

let ioServer: Server | null = null;

export function setSocketServer(io: Server) {
  ioServer = io;
}

export function getSocketServer() {
  return ioServer;
}

export function getUserSocketRoom(userId: string) {
  return `user:${userId}`;
}

export function forceLogoutUser(userId: string, reason: string) {
  if (!ioServer) {
    return;
  }

  const room = getUserSocketRoom(userId);
  ioServer.to(room).emit("force_logout", { reason });

  setTimeout(() => {
    ioServer?.in(room).disconnectSockets(true);
  }, 100);
}

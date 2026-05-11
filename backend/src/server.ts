import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import * as http from 'http';
import { AppDataSource } from './database/config';
import app from './app';
import { verifyMailerConnection } from './shared/mail/mailer';

import { Server as SocketServer } from 'socket.io';
import { setupCommunicationsSocket } from './modules/communications/communications.socket';

const DEFAULT_PORT = parseInt(process.env.PORT || '5000', 10);

const listenOnPort = (port: number): http.Server => {
  const server = http.createServer(app);
  const io = new SocketServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  setupCommunicationsSocket(io);

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.warn(`Port ${port} is already in use. Retrying on ${nextPort}...`);
      listenOnPort(nextPort);
      return;
    }

    console.error('Server startup failed:', error);
    process.exit(1);
  });

  return server;
};

AppDataSource.initialize()
  .then(async () => {
    console.log('Database connected successfully');
    await AppDataSource.runMigrations();
    await verifyMailerConnection();
    listenOnPort(DEFAULT_PORT);
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });

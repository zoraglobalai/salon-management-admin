import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ENV } from '../config/env';
import { User } from '../entities/platform/User';
import { Tenant } from '../entities/platform/Tenant';
import { Branch } from '../entities/platform/Branch';
import { Subscription } from '../entities/platform/Subscription';
import { Trial } from '../entities/platform/Trial';
import { RevenueTransaction } from '../entities/platform/RevenueTransaction';
import { SupportTicket } from '../entities/platform/SupportTicket';
import { Log } from '../entities/platform/Log';

export const databaseConfig = {
  host: ENV.DB_HOST,
  port: ENV.DB_PORT,
  database: ENV.DB_NAME,
  username: ENV.DB_USER,
  password: ENV.DB_PASSWORD,
  synchronize: false,
  logging: ENV.NODE_ENV === 'production',
  ssl: ENV.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...databaseConfig,
  entities: [User, Tenant, Branch, Subscription, Trial, RevenueTransaction, SupportTicket, Log],
  migrations: ['src/database/migrations/*.ts', 'dist/database/migrations/*.js'],
});

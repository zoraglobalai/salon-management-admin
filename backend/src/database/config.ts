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
import { CreatePlatformCoreTables1714300000000 } from './migrations/1714300000000-CreatePlatformCoreTables';
import { SyncSubscriptionPlanEnum1714400000000 } from './migrations/1714400000000-SyncSubscriptionPlanEnum';
import { CreateOperationalSchema1714500000000 } from './migrations/1714500000000-CreateOperationalSchema';
import { AddDeploymentCompatibilitySchema1714600000000 } from './migrations/1714600000000-AddDeploymentCompatibilitySchema';
import { FixSchemaAndLogicBugs1714700000000 } from './migrations/1714700000000-FixSchemaAndLogicBugs';

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
  migrations: [
    CreatePlatformCoreTables1714300000000,
    SyncSubscriptionPlanEnum1714400000000,
    CreateOperationalSchema1714500000000,
    AddDeploymentCompatibilitySchema1714600000000,
    FixSchemaAndLogicBugs1714700000000,
  ],
});

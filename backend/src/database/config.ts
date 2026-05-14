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
import { Notification } from '../entities/platform/Notification';
import { Vendor } from '../entities/platform/Vendor';
import { Purchase } from '../entities/platform/Purchase';
import { PurchaseItem } from '../entities/platform/PurchaseItem';
import { CreatePlatformCoreTables1714300000000 } from './migrations/1714300000000-CreatePlatformCoreTables';
import { SyncSubscriptionPlanEnum1714400000000 } from './migrations/1714400000000-SyncSubscriptionPlanEnum';
import { CreateOperationalSchema1714500000000 } from './migrations/1714500000000-CreateOperationalSchema';
import { AddDeploymentCompatibilitySchema1714600000000 } from './migrations/1714600000000-AddDeploymentCompatibilitySchema';
import { FixSchemaAndLogicBugs1714700000000 } from './migrations/1714700000000-FixSchemaAndLogicBugs';
import { CreatePlatformSettingsTable1714800000000 } from './migrations/1714800000000-CreatePlatformSettingsTable';
import { AddStaffIdentificationDetails1714900000000 } from './migrations/1714900000000-AddStaffIdentificationDetails';
import { AddStaffCurrentAddress1715000000000 } from './migrations/1715000000000-AddStaffCurrentAddress';
import { AddComboServices1715100000000 } from './migrations/1715100000000-AddComboServices';
import { AddInventoryLowStockThreshold1715200000000 } from './migrations/1715200000000-AddInventoryLowStockThreshold';
import { AddSalesWorkflowStatus1715300000000 } from './migrations/1715300000000-AddSalesWorkflowStatus';
import { AddSaleServiceComboFields1715400000000 } from './migrations/1715400000000-AddSaleServiceComboFields';
import { AddServiceConsumablesTracking1715500000000 } from './migrations/1715500000000-AddServiceConsumablesTracking';
import { CreateCommunicationsSchema1715600000000 } from './migrations/1715600000000-CreateCommunicationsSchema';
import { RefactorCommunicationsSchema1715600000001 } from './migrations/1715600000001-RefactorCommunicationsSchema';
import { AddCommunicationIndexes1715700000000 } from './migrations/1715700000000-AddCommunicationIndexes';
import { AddUserSessionVersion1715800000000 } from './migrations/1715800000000-AddUserSessionVersion';
import { AddSubscriptionProrationFields1715900000000 } from './migrations/1715900000000-AddSubscriptionProrationFields';
import { CreateStaffPayrollTable1715900000000 } from './migrations/1715900000000-CreateStaffPayrollTable';
import { CreateAttendanceTable1716000000000 } from './migrations/1716000000000-CreateAttendanceTable';
import { CreateAppointmentsSchema1716100000000 } from './migrations/1716100000000-CreateAppointmentsSchema';
import { CreateVendors1715900000000 } from './migrations/1715900000000-CreateVendors';
import { CreatePurchases1716000000000 } from './migrations/1716000000000-CreatePurchases';
import { CreatePurchaseItems1716100000000 } from './migrations/1716100000000-CreatePurchaseItems';
import { UpdateInventoryForPurchase1716200000000 } from './migrations/1716200000000-UpdateInventoryForPurchase';
import { AddPurchaseItemGst1716300000000 } from './migrations/1716300000000-AddPurchaseItemGst';
import { AddPurchaseItemGstType1716400000000 } from './migrations/1716400000000-AddPurchaseItemGstType';
import { AddPurchasesCreatedBy1716500000000 } from './migrations/1716500000000-AddPurchasesCreatedBy';

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
  entities: [User, Tenant, Branch, Subscription, Trial, RevenueTransaction, SupportTicket, Log, Notification, Vendor, Purchase, PurchaseItem],
  migrations: [
    CreatePlatformCoreTables1714300000000,
    SyncSubscriptionPlanEnum1714400000000,
    CreateOperationalSchema1714500000000,
    AddDeploymentCompatibilitySchema1714600000000,
    FixSchemaAndLogicBugs1714700000000,
    CreatePlatformSettingsTable1714800000000,
    AddStaffIdentificationDetails1714900000000,
    AddStaffCurrentAddress1715000000000,
    AddComboServices1715100000000,
    AddInventoryLowStockThreshold1715200000000,
    AddSalesWorkflowStatus1715300000000,
    AddSaleServiceComboFields1715400000000,
    AddServiceConsumablesTracking1715500000000,
    CreateCommunicationsSchema1715600000000,
    RefactorCommunicationsSchema1715600000001,
    AddCommunicationIndexes1715700000000,
    AddUserSessionVersion1715800000000,
    AddSubscriptionProrationFields1715900000000,
    CreateStaffPayrollTable1715900000000,
    CreateAttendanceTable1716000000000,
    CreateAppointmentsSchema1716100000000,
    CreateVendors1715900000000,
    CreatePurchases1716000000000,
    CreatePurchaseItems1716100000000,
    UpdateInventoryForPurchase1716200000000,
    AddPurchaseItemGst1716300000000,
    AddPurchaseItemGstType1716400000000,
    AddPurchasesCreatedBy1716500000000,
  ],
});

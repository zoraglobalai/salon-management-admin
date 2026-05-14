import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './Tenant';
import { RevenueTransaction } from './RevenueTransaction';

export enum SubscriptionPaymentMethod {
  CARD = 'CARD',
  UPI = 'UPI',
  CASH = 'CASH',
}

export enum SubscriptionPlan {
  STANDARD = 'STANDARD',
  PRO = 'PRO',
  CUSTOM = 'CUSTOM',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
}

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
    default: SubscriptionPlan.STANDARD,
  })
  plan!: SubscriptionPlan;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status!: SubscriptionStatus;

  @Column({ name: 'amount_paid', type: 'decimal', precision: 10, scale: 2, default: 0 })
  amountPaid!: number;

  @Column({ name: 'base_plan_price', type: 'decimal', precision: 10, scale: 2, default: 0 })
  basePlanPrice!: number;

  @Column({ name: 'remaining_credit', type: 'decimal', precision: 10, scale: 2, default: 0 })
  remainingCredit!: number;

  @Column({
    name: 'payment_method',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  paymentMethod!: SubscriptionPaymentMethod | null;

  @Column({ name: 'transaction_reference', type: 'varchar', length: 120, nullable: true })
  transactionReference!: string | null;

  @Column({ type: 'date' })
  startDate!: Date;

  @Column({ type: 'date' })
  endDate!: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.subscriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

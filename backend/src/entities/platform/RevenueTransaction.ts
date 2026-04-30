import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './Tenant';
import { Subscription, SubscriptionPaymentMethod, SubscriptionPlan } from './Subscription';

export enum TransactionStatus {
  PAID = 'PAID',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Entity('revenue_transactions')
export class RevenueTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'subscription_id', type: 'uuid', nullable: true })
  subscriptionId!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  plan!: SubscriptionPlan | null;

  @Column({
    name: 'payment_method',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  paymentMethod!: SubscriptionPaymentMethod | null;

  @Column({ name: 'transaction_reference', type: 'varchar', length: 120, nullable: true })
  transactionReference!: string | null;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PAID,
  })
  status!: TransactionStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  description!: string | null;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @ManyToOne(() => Subscription, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subscription_id' })
  subscription!: Subscription | null;

  @CreateDateColumn()
  createdAt!: Date;
}

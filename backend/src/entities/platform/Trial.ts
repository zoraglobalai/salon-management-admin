import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './Tenant';

export enum TrialStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED',
}

@Entity('trials')
export class Trial {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'date' })
  startDate!: Date;

  @Column({ type: 'date' })
  endDate!: Date;

  @Column({
    type: 'enum',
    enum: TrialStatus,
    default: TrialStatus.ACTIVE,
  })
  status!: TrialStatus;

  @ManyToOne(() => Tenant, (tenant) => tenant.trials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @CreateDateColumn()
  createdAt!: Date;
}

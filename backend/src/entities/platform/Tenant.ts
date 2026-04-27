import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Branch } from './Branch';
import { Subscription } from './Subscription';
import { Trial } from './Trial';

export enum OwnerType {
  MULTI_BRANCH = 'MULTI_BRANCH',
  INDEPENDENT = 'INDEPENDENT',
}

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  TRIAL = 'TRIAL',
  EXPIRED = 'EXPIRED',
}

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  alternativePhone!: string | null;

  @Column({ type: 'varchar', length: 255 })
  businessName!: string;

  @Column({ type: 'int', default: 1 })
  numberOfBranches!: number;

  @Column({
    type: 'enum',
    enum: OwnerType,
    default: OwnerType.INDEPENDENT,
  })
  ownerType!: OwnerType;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.TRIAL,
  })
  status!: TenantStatus;

  @OneToMany(() => Branch, (branch) => branch.tenant)
  branches!: Branch[];

  @OneToMany(() => Subscription, (sub) => sub.tenant)
  subscriptions!: Subscription[];

  @OneToMany(() => Trial, (trial) => trial.tenant)
  trials!: Trial[];

  @CreateDateColumn()
  createdAt!: Date;
}

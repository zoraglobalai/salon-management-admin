import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './Tenant';
import { Branch } from './Branch';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  INDEPENDENT_OWNER = 'INDEPENDENT_OWNER',
}

export type BusinessRole = UserRole.OWNER | UserRole.MANAGER;

export enum UserMode {
  OPERATOR = 'OPERATOR',
  MONITOR = 'MONITOR',
}

export type OperatorUserType = 'admin' | 'owner' | 'manager' | 'staff';

export interface AuthenticatedUser {
  id: string;
  tenant_id: string | null;
  branch_id: string | null;
  type: OperatorUserType;
  email: string;
  full_name: string;
  password_hash: string;
  is_active: boolean;
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  shopName!: string | null;

  @Column({ type: 'text' })
  password!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.OWNER,
  })
  role!: UserRole;

  @Column({ type: 'uuid', nullable: true })
  tenantId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant | null;

  @ManyToOne(() => Branch, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch | null;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'boolean', default: false })
  isDefaultPassword!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resetPasswordToken!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires!: Date | null;

  @Column({ type: 'boolean', default: false })
  hasManager!: boolean;
}

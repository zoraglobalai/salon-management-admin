import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum LogAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  CREATE_OWNER = 'CREATE_OWNER',
  RESET_PASSWORD = 'RESET_PASSWORD',
  UPDATE_SUBSCRIPTION = 'UPDATE_SUBSCRIPTION',
  CLOSE_TICKET = 'CLOSE_TICKET',
  VIEW_LOGS = 'VIEW_LOGS',
  CREATE_TENANT = 'CREATE_TENANT',
  UPDATE_TENANT = 'UPDATE_TENANT',
}

@Entity('logs')
export class Log {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 100,
  })
  action!: string;

  @Column({ type: 'varchar', length: 255 })
  performedBy!: string;

  @Column({ type: 'text', nullable: true })
  details!: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}

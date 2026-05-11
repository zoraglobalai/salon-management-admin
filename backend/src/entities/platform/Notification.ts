import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

export enum NotificationCategory {
  REVENUE = "REVENUE",
  STAFF = "STAFF",
  SERVICE = "SERVICE",
  CUSTOMER = "CUSTOMER",
  BRANCH = "BRANCH",
  INVENTORY = "INVENTORY",
}

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ type: "varchar", length: 50 })
  role!: string; // 'OWNER' or 'MANAGER'

  @Column({ type: "varchar", length: 100 })
  type!: string; // e.g., 'TOP_BRANCH', 'REVENUE_MILESTONE'

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text" })
  message!: string;

  @Column({
    type: "enum",
    enum: NotificationCategory,
    default: NotificationCategory.REVENUE,
  })
  category!: NotificationCategory;

  @Column({ type: "jsonb", nullable: true })
  metadata!: any;

  @Column({ name: "is_read", type: "boolean", default: false })
  isRead!: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

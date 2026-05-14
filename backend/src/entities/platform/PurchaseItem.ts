import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("purchase_items")
export class PurchaseItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "purchase_id" })
  purchaseId!: string;

  @Column({ type: "text", name: "product_name" })
  productName!: string;

  @Column({ type: "text", default: "" })
  category!: string;

  @Column({ type: "text" })
  unit!: string;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "cost_price", default: 0 })
  costPrice!: string;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  gst!: string;

  @Column({ type: "text", name: "gst_type", default: "AMOUNT" })
  gstType!: "AMOUNT" | "PERCENT";

  @Column({ type: "numeric", precision: 12, scale: 2, name: "initial_stock", default: 0 })
  initialStock!: string;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "initial_quantity", default: 0 })
  initialQuantity!: string;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "low_stock_alert", default: 5 })
  lowStockAlert!: string;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "service_stock", default: 0 })
  serviceStock!: string;

  @Column({ type: "date", name: "expiry_date", nullable: true })
  expiryDate!: string | null;

  @Column({ type: "text", name: "batch_number", default: "" })
  batchNumber!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

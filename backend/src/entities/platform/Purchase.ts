import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("purchases")
export class Purchase {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "tenant_id" })
  tenantId!: string;

  @Column({ type: "uuid", name: "location_id" })
  locationId!: string;

  @Column({ type: "uuid", name: "vendor_id" })
  vendorId!: string;

  @Column({ type: "date", name: "purchase_date" })
  purchaseDate!: string;

  @Column({ type: "text", name: "invoice_number", default: "" })
  invoiceNumber!: string;

  @Column({ type: "text", name: "payment_status", default: "PENDING" })
  paymentStatus!: string;

  @Column({ type: "text", name: "payment_method", default: "" })
  paymentMethod!: string;

  @Column({ type: "numeric", precision: 12, scale: 2, name: "total_amount", default: 0 })
  totalAmount!: string;

  @Column({ type: "text", default: "" })
  notes!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}


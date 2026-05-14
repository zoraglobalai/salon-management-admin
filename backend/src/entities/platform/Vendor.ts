import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("vendors")
export class Vendor {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "tenant_id" })
  tenantId!: string;

  @Column({ type: "text", name: "vendor_name" })
  vendorName!: string;

  @Column({ type: "text", name: "company_name", default: "" })
  companyName!: string;

  @Column({ type: "text", default: "" })
  category!: string;

  @Column({ type: "text", default: "" })
  phone!: string;

  @Column({ type: "text", default: "" })
  email!: string;

  @Column({ type: "text", default: "" })
  address!: string;

  @Column({ type: "text", name: "gst_number", default: "" })
  gstNumber!: string;

  @Column({ type: "text", default: "ACTIVE" })
  status!: "ACTIVE" | "INACTIVE";

  @Column({ type: "text", default: "" })
  notes!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}


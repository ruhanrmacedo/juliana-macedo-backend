import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from "typeorm";
import { ProfessionalProfile } from "./ProfessionalProfile";
import { ServiceModality } from "./enums/ServiceModality";

@Entity("professional_services")
@Index(["code"], { unique: true })
@Index(["slug"], { unique: true })
@Check(
  "CHK_professional_services_modality",
  `"modality" IN ('ONLINE', 'IN_PERSON')`
)
@Check(
  "CHK_professional_services_price",
  `"price" IS NULL OR "price" >= 0`
)
@Check(
  "CHK_professional_services_visible_price",
  `"show_price" = false OR "price" IS NOT NULL`
)
@Check(
  "CHK_professional_services_duration",
  `"duration_minutes" IS NULL OR "duration_minutes" > 0`
)
@Check(
  "CHK_professional_services_display_order",
  `"display_order" >= 0`
)
export class ProfessionalService {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ProfessionalProfile, (profile) => profile.services, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "professional_profile_id" })
  professionalProfile: ProfessionalProfile;

  @Column({ length: 80 })
  code: string;

  @Column({ length: 180 })
  slug: string;

  @Column({ length: 160 })
  name: string;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ type: "varchar", length: 20 })
  modality: ServiceModality;

  @Column({ type: "numeric", precision: 10, scale: 2, nullable: true })
  price?: string | null;

  @Column({ type: "char", length: 3, default: "BRL" })
  currency: string;

  @Column({ name: "show_price", default: false })
  showPrice: boolean;

  @Column({ name: "duration_minutes", type: "integer", nullable: true })
  durationMinutes?: number | null;

  @Column({ name: "is_published", default: false })
  isPublished: boolean;

  @Column({ name: "booking_enabled", default: false })
  bookingEnabled: boolean;

  @Column({ name: "display_order", type: "integer", default: 0 })
  displayOrder: number;

  @Column({ name: "is_archived", default: false })
  isArchived: boolean;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp" })
  updatedAt: Date;
}

import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from "typeorm";
import { AuthorProfile } from "./AuthorProfile";
import { ProfessionalFaq } from "./ProfessionalFaq";
import { ProfessionalService } from "./ProfessionalService";

@Entity("professional_profiles")
@Check(
  "CHK_professional_profiles_photo_focus_x",
  `"photo_focus_x" IS NULL OR ("photo_focus_x" >= 0 AND "photo_focus_x" <= 100)`
)
@Check(
  "CHK_professional_profiles_photo_focus_y",
  `"photo_focus_y" IS NULL OR ("photo_focus_y" >= 0 AND "photo_focus_y" <= 100)`
)
export class ProfessionalProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => AuthorProfile, (authorProfile) => authorProfile.professionalProfile, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "author_profile_id" })
  authorProfile: AuthorProfile;

  @Column({ length: 180, unique: true })
  slug: string;

  @Column({ length: 40 })
  crn: string;

  @Column({ name: "institutional_phrase", type: "text", nullable: true })
  institutionalPhrase?: string | null;

  @Column({ type: "text", nullable: true })
  introduction?: string | null;

  @Column({ name: "care_philosophy", type: "text", nullable: true })
  carePhilosophy?: string | null;

  @Column({ type: "text", nullable: true })
  education?: string | null;

  @Column({ name: "professional_journey", type: "text", nullable: true })
  professionalJourney?: string | null;

  @Column({ name: "online_description", type: "text", nullable: true })
  onlineDescription?: string | null;

  @Column({ name: "in_person_description", type: "text", nullable: true })
  inPersonDescription?: string | null;

  @Column({ name: "photo_url", type: "varchar", nullable: true })
  photoUrl?: string | null;

  @Column({ name: "photo_alt", type: "varchar", length: 220, nullable: true })
  photoAlt?: string | null;

  @Column({ name: "photo_focus_x", type: "smallint", nullable: true })
  photoFocusX?: number | null;

  @Column({ name: "photo_focus_y", type: "smallint", nullable: true })
  photoFocusY?: number | null;

  @Column({ name: "public_email", type: "varchar", length: 320, nullable: true })
  publicEmail?: string | null;

  @Column({ name: "public_phone", type: "varchar", length: 40, nullable: true })
  publicPhone?: string | null;

  @Column({ name: "whatsapp_number", type: "varchar", length: 20, nullable: true })
  whatsappNumber?: string | null;

  @Column({ name: "instagram_url", type: "varchar", nullable: true })
  instagramUrl?: string | null;

  @Column({ name: "contact_instructions", type: "text", nullable: true })
  contactInstructions?: string | null;

  @Column({ name: "is_published", default: false })
  isPublished: boolean;

  @Column({ name: "published_at", type: "timestamp", nullable: true })
  publishedAt?: Date | null;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp" })
  updatedAt: Date;

  @OneToMany(() => ProfessionalService, (service) => service.professionalProfile)
  services: ProfessionalService[];

  @OneToMany(() => ProfessionalFaq, (faq) => faq.professionalProfile)
  faqs: ProfessionalFaq[];
}

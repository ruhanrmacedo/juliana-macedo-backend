import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from "typeorm";
import { ProfessionalProfile } from "./ProfessionalProfile";

@Entity("professional_faqs")
@Check("CHK_professional_faqs_display_order", `"display_order" >= 0`)
export class ProfessionalFaq {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ProfessionalProfile, (profile) => profile.faqs, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "professional_profile_id" })
  professionalProfile: ProfessionalProfile;

  @Column({ length: 300 })
  question: string;

  @Column({ type: "text" })
  answer: string;

  @Column({ name: "display_order", type: "integer", default: 0 })
  displayOrder: number;

  @Column({ name: "is_published", default: false })
  isPublished: boolean;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp" })
  updatedAt: Date;
}

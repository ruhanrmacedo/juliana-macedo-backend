import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";

@Entity("password_reset_tokens")
@Index("IDX_password_reset_tokens_user_expires", ["userId", "expiresAt"])
export class PasswordResetToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id", type: "int" })
  userId: number;

  @ManyToOne(() => User, (user) => user.passwordResetTokens, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Index("UQ_password_reset_tokens_token_hash", { unique: true })
  @Column({ name: "token_hash", type: "varchar", length: 64 })
  tokenHash: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;

  @Column({ name: "used_at", type: "timestamptz", nullable: true })
  usedAt?: Date | null;

  @Column({ name: "invalidated_at", type: "timestamptz", nullable: true })
  invalidatedAt?: Date | null;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz",
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Exclude } from "class-transformer";
import { Post } from "./Post";
import { UserMetrics } from "./UserMetrics";
import { Comment } from "./Comment";
import { UserPhone } from "./user-info/UserPhone";
import { UserAddress } from "./user-info/UserAddress";
import { UserEmail } from "./user-info/UserEmail";
import { PasswordResetToken } from "./PasswordResetToken";

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ select: false })
  @Exclude()
  password: string;

  @Column({ default: "user" })
  role: UserRole;

  @Column({ name: "auth_version", type: "int", default: 0 })
  authVersion: number;

  @Column({ type: "varchar", unique: true, nullable: true })
  cpf?: string | null;

  @Column({ type: "date", name: "data_nascimento", nullable: true })
  dataNascimento?: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
  updatedAt: Date;

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  @OneToMany(() => UserMetrics, (metrics) => metrics.user, { cascade: true })
  metrics: UserMetrics[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments: Comment[];

  @OneToMany(() => UserPhone, (phone) => phone.user, { cascade: true })
  phones: UserPhone[];

  @OneToMany(() => UserAddress, (address) => address.user, { cascade: true })
  addresses: UserAddress[];

  @OneToMany(() => UserEmail, (email) => email.user, { cascade: true })
  emails: UserEmail[];

  @OneToMany(() => PasswordResetToken, (token) => token.user)
  passwordResetTokens: PasswordResetToken[];
}

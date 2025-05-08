import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { User } from "../User";

@Entity("user_emails")
export class UserEmail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @ManyToOne(() => User, (user) => user.emails, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;
}

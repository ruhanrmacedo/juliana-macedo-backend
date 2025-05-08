import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { User } from "../User";

@Entity("user_phones")
export class UserPhone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  number: string;

  @ManyToOne(() => User, (user) => user.phones, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;
}

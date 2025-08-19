import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "./User";
import { Post } from "./Post";

@Entity("comments")
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("text")
  content: string;

  @ManyToOne(() => User, (user) => user.comments, { onDelete: "CASCADE" }) // opcional
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Post, (post) => post.comments, { onDelete: "CASCADE" }) // opcional
  @JoinColumn({ name: "post_id" })
  post: Post;

  @CreateDateColumn({ name: "created_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
  editedAt: Date;

  @Column({ name: "is_edited", default: false })
  isEdited: boolean;
}

import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Post } from "./Post";

@Entity("post_likes")
export class PostLike {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Post, (post) => post.likes, { onDelete: "CASCADE" }) // opcional, alinha com FK
  @JoinColumn({ name: "post_id" })
  post: Post;

  @Column({ length: 64 })
  ip: string;

  @Column({ name: "user_agent", length: 255 })
  userAgent: string;

  @CreateDateColumn({ name: "created_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
}

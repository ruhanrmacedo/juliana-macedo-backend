import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Post } from "./Post";

@Entity("post_likes")
export class PostLike {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Post, (post) => post.likes)
  @JoinColumn({ name: "post_id" })
  post: Post;

  @Column()
  ip: string;

  @Column({ name: "user_agent" })
  userAgent: string;

  @CreateDateColumn({ name: "created_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
}

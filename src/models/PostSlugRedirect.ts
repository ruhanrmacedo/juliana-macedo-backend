import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Post } from "./Post";

@Entity("post_slug_redirects")
export class PostSlugRedirect {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 220, unique: true })
  oldSlug: string;

  @ManyToOne(() => Post, { onDelete: "CASCADE" })
  @JoinColumn({ name: "postId" })
  post: Post;

  @CreateDateColumn({ name: "created_at", type: "timestamp" })
  createdAt: Date;
}

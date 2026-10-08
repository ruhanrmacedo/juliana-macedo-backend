import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Post } from "./Post";

@Entity("categories")
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 120, unique: true })
  slug: string;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Post, (post) => post.category)
  posts: Post[];
}

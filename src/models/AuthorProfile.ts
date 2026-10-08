import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Post } from "./Post";

@Entity("author_profiles")
export class AuthorProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 160 })
  displayName: string;

  @Column({ length: 180, unique: true })
  slug: string;

  @Column({ length: 200 })
  headline: string;

  @Column({ type: "text", nullable: true })
  shortBio?: string | null;

  @Column({ type: "varchar", nullable: true })
  avatarUrl?: string | null;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Post, (post) => post.authorProfile)
  posts: Post[];
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  BeforeInsert,
} from "typeorm";
import { User } from "./User";
import { PostType } from "./enums/PostType";
import { PostLike } from "./PostLike";
import { Comment } from "./Comment";
import { Category } from "./Category";
import { Tag } from "./Tag";
import { AuthorProfile } from "./AuthorProfile";
import { EditorialChannel } from "./enums/EditorialChannel";
import { ContentFormat } from "./enums/ContentFormat";
import { EditorialStatus } from "./enums/EditorialStatus";
import { buildExcerpt, normalizeSlug } from "../utils/editorial";

@Entity("posts")
export class Post {
  @BeforeInsert()
  prepareLegacyInsert() {
    if (!this.slug) {
      this.slug = `${normalizeSlug(this.title) || "conteudo"}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    }
    if (!this.excerpt) this.excerpt = buildExcerpt(this.content);
    if (!this.channel) this.channel = EditorialChannel.CONTENT;
    if (!this.format) {
      this.format = this.postType === PostType.RECEITA ? ContentFormat.RECIPE : ContentFormat.ARTICLE;
    }
    if (!this.status) this.status = this.isActive === false ? EditorialStatus.ARCHIVED : EditorialStatus.PUBLISHED;
    if (this.status === EditorialStatus.PUBLISHED && !this.publishedAt) this.publishedAt = new Date();
    // Compatibilidade com inserções legadas que criam Post diretamente.
    // A migration cria Juliana como o primeiro perfil público.
    if (!this.authorProfile) this.authorProfile = { id: 1 } as AuthorProfile;
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column("text")
  content: string;

  @Column({ length: 220 })
  slug: string;

  @Column({ type: "text" })
  excerpt: string;

  @Column({ type: "enum", enum: PostType })
  postType: PostType;

  @Column({ type: "varchar", length: 20 })
  channel: EditorialChannel;

  @Column({ type: "varchar", length: 20 })
  format: ContentFormat;

  @Column({ type: "varchar", length: 20 })
  status: EditorialStatus;

  @Column({ type: "timestamp", nullable: true })
  publishedAt?: Date | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: "varchar", nullable: true })
  imageUrl?: string | null;

  @Column({ type: "varchar", nullable: true })
  imageAlt?: string | null;

  @Column({ type: "text", nullable: true })
  imageCaption?: string | null;

  @Column({ type: "varchar", nullable: true })
  imageCredit?: string | null;

  @Column({ type: "varchar", nullable: true })
  seoTitle?: string | null;

  @Column({ type: "text", nullable: true })
  seoDescription?: string | null;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ type: "smallint", nullable: true })
  featuredPriority?: number | null;

  @ManyToOne(() => User, (user) => user.posts)
  @JoinColumn({ name: "authorId" })
  author: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "editedById" })
  editedBy?: User | null;

  @ManyToOne(() => Category, (category) => category.posts, { nullable: true })
  @JoinColumn({ name: "categoryId" })
  category?: Category | null;

  @ManyToOne(() => AuthorProfile, (profile) => profile.posts)
  @JoinColumn({ name: "authorProfileId" })
  authorProfile: AuthorProfile;

  @ManyToMany(() => Tag, (tag) => tag.posts)
  @JoinTable({
    name: "post_tags",
    joinColumn: { name: "postId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "tagId", referencedColumnName: "id" },
  })
  tags: Tag[];

  @CreateDateColumn({ name: "created_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
  updatedAt: Date;

  @Column({ default: 0 })
  views?: number;

  @OneToMany(() => Comment, (comment) => comment.post)
  comments: Comment[];

  @OneToMany(() => PostLike, (like) => like.post)
  likes: PostLike[];
}

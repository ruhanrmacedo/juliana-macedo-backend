import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
  } from "typeorm";
  import { User } from "./User";
  import { PostType } from "./enums/PostType"; // Importando o Enum externo
  
  @Entity("posts")
  export class Post {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    title: string;
  
    @Column("text")
    content: string;
  
    @Column({ type: "enum", enum: PostType })
    postType: PostType;
  
    @Column({ default: true })
    isActive: boolean;
  
    @Column({ nullable: true })
    imageUrl?: string;
  
    @ManyToOne(() => User, (user) => user.posts)
    @JoinColumn({ name: "authorId" })
    author: User;
  
    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "editedById" })
    editedBy?: User | null;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }
  
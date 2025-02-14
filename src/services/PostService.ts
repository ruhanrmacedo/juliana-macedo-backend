import { AppDataSource } from "../config/ormconfig";
import { Post } from "../models/Post";
import { User } from "../models/User";
import { PostType } from "../models/enums/PostType";

const postRepository = AppDataSource.getRepository(Post);

export class PostService {
  // Criar um novo post
  static async createPost(
    title: string,
    content: string,
    postType: PostType,
    authorId: number,
    imageUrl?: string
  ) {
    const author = await AppDataSource.getRepository(User).findOne({
      where: { id: authorId },
    });
    if (!author) throw new Error("Autor não encontrado");

    const post = postRepository.create({
      title,
      content,
      postType,
      isActive: true,
      author,
      imageUrl,
    });

    await postRepository.save(post);
    return post;
  }

  // Listar todos os posts ativos
  static async getAllPosts() {
    return await postRepository.find({
      where: { isActive: true },
      relations: ["author", "editedBy"],
    });
  }

  // Buscar um post pelo ID
  static async getPostById(postId: number) {
    const post = await postRepository.findOne({
      where: { id: postId },
      relations: ["author", "editedBy"],
    });
    if (!post) throw new Error("Post não encontrado");
    return post;
  }

  // Atualizar um post
  static async updatePost(
    postId: number,
    userId: number,
    title?: string,
    content?: string,
    postType?: PostType,
    imageUrl?: string
  ) {
    const post = await postRepository.findOne({
      where: { id: postId },
      relations: ["author"], // Trazendo o autor
    });

    if (!post) throw new Error("Post não encontrado");

    if (!post.author || post.author.id !== userId)
      throw new Error("Apenas o autor pode editar este post");

    if (title) post.title = title;
    if (content) post.content = content;
    if (postType) post.postType = postType;
    if (imageUrl) post.imageUrl = imageUrl;

    const editor = await AppDataSource.getRepository(User).findOne({
      where: { id: userId },
    });

    if (editor) {
      post.editedBy = editor;
    }

    await postRepository.save(post);
    return post;
  }

  // Alternar ativo/inativo
  static async toggleActive(postId: number, userId: number) {
    const post = await postRepository.findOne({
      where: { id: postId },
      relations: ["author"],
    });

    if (!post) throw new Error("Post não encontrado");

    if (!post.author || post.author.id !== userId)
      throw new Error("Apenas o autor pode desativar este post");

    post.isActive = !post.isActive;
    await postRepository.save(post);
    return post;
  }

  // Deletar permanentemente um post (apenas Admin)
  static async deletePost(postId: number, userRole: string) {
    if (userRole !== "admin")
      throw new Error("Apenas admins podem deletar posts permanentemente");

    const post = await postRepository.findOne({ where: { id: postId } });
    if (!post) throw new Error("Post não encontrado");

    await postRepository.remove(post);
    return { message: "Post deletado permanentemente." };
  }

  // Filtrar posts por título, categoria, autor ou data
  static async filterPosts(
    title?: string,
    category?: PostType,
    author?: string,
    date?: string
  ) {
    const queryBuilder = postRepository.createQueryBuilder("post");

    if (title)
      queryBuilder.andWhere("post.title ILIKE :title", { title: `%${title}%` });
    if (category)
      queryBuilder.andWhere("post.postType = :category", { category });
    if (author) {
      queryBuilder.leftJoinAndSelect("post.author", "author");
      queryBuilder.andWhere("author.email ILIKE :author", {
        author: `%${author}%`,
      });
    }
    if (date) queryBuilder.andWhere("DATE(post.createdAt) = :date", { date });

    return await queryBuilder.getMany();
  }
}

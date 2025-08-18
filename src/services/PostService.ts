import { Between, ILike } from "typeorm";
import { AppDataSource } from "../config/ormconfig";
import { Post } from "../models/Post";
import { User } from "../models/User";
import { PostType } from "../models/enums/PostType";

const postRepository = AppDataSource.getRepository(Post);

export class PostService {
  // Criar um novo post teste
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

  // Contar número de views de um post
  static async incrementPostViews(postId: number) {
    await postRepository.increment({ id: postId }, "views", 1);
  }

  //  Listar posts com paginação
  static async getPaginated(page = 1, limit = 10) {
    // 🔒 Sanitização e fallback defensivo
    const currentPage = Number(page);
    const pageSize = Number(limit);

    if (isNaN(currentPage) || isNaN(pageSize) || currentPage <= 0 || pageSize <= 0) {
      throw new Error("Parâmetros inválidos: 'page' e 'limit' devem ser inteiros positivos");
    }

    const [posts, total] = await postRepository.findAndCount({
      where: { isActive: true },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      order: { createdAt: "DESC" },
      relations: ["author", "editedBy"],
    });

    // 🔍 Garantir que mesmo se likes ou comments forem lazy-loaded ou nulos, temos fallback
    const enrichedPosts = posts.map((post) => ({
      ...post,
      commentsCount: post.comments?.length ?? 0,
      likes: post.likes?.length ?? 0,
    }));

    return { enrichedPosts, total };
  }

  // Filtrar posts por título, categoria, autor ou data
  static async filterPosts(
    title?: string,
    category?: string,
    author?: string,
    date?: string
  ) {
    console.log("🛠️ Iniciando a montagem da query para filtrar posts...");

    const query = postRepository
      .createQueryBuilder("post")
      .leftJoinAndSelect("post.author", "author")
      .where("post.isActive = :isActive", { isActive: true });

    console.log("🟢 Query inicializada!");

    // 🔍 Filtrar por título
    if (title) {
      console.log("📌 Filtrando por título:", title);
      query.andWhere("post.title ILIKE :title", { title: `%${title}%` });
    }

    // 🔍 Filtrar por categoria
    if (category) {
      console.log("📌 Filtrando por categoria:", category);
      const enumValue = Object.values(PostType).find(
        (e) => e.toLowerCase() === category.toLowerCase()
      );
      if (!enumValue) {
        console.log("❌ Categoria inválida:", category);
        throw new Error(`Categoria inválida: ${category}`);
      }
      query.andWhere(`post."postType" = :category`, { category: enumValue });
    }

    // 🔍 Filtrar por autor (name)
    if (author) {
      console.log("🔍 Buscando posts pelo autor:", author);
      query.andWhere("author.name ILIKE :authorName", { authorName: `%${author}%` });
    }

    // 🔍 Filtrar por data
    if (date) {
      console.log("📌 Filtrando por data:", date);
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.andWhere("post.created_at BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      });
    }

    // 🔎 Log da query final
    const [sqlQuery, parameters] = query.getQueryAndParameters();
    console.log("📝 Query SQL Final:", sqlQuery);
    console.log("📊 Parâmetros da Query:", parameters);

    const result = await query.getMany();
    console.log("✅ Posts retornados:", result.length);

    return result;
  }

  // Listar posts mais visualizados
  static async getTopViewed(limit: number) {
    return await postRepository.find({
      where: { isActive: true },
      order: { views: "DESC" },
      take: limit,
      relations: ["author", "editedBy"],
    });
  }
}

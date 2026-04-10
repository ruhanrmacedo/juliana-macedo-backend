import { Between, ILike } from "typeorm";
import { AppDataSource } from "../config/ormconfig";
import { Post } from "../models/Post";
import { User } from "../models/User";
import { PostType } from "../models/enums/PostType";

const postRepository = AppDataSource.getRepository(Post);

const slugToEnum: Record<string, PostType> = {
  receitas: PostType.RECEITA,
  saude: PostType.SAUDE,
  artigos: PostType.ARTIGO,
  alimentacao: PostType.ALIMENTACAO,
  dicas: PostType.DICAS,
  novidades: PostType.NOVIDADES,
};

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

  // Buscar todos os posts (admin)
  static async getAdminPosts() {
    return await postRepository.find({
      order: { createdAt: "DESC" },
      relations: ["author", "editedBy"],
    });
  }

  // Atualizar um post
  static async updatePost(
    postId: number,
    userId: number,
    userRole: string,
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

    if (!post.author || post.author.id !== userId && userRole !== "admin")
      throw new Error("Apenas o autor ou um admin pode editar este post");

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
  static async toggleActive(postId: number, userId: number, userRole: string) {
    const post = await postRepository.findOne({
      where: { id: postId },
      relations: ["author"],
    });

    if (!post) throw new Error("Post não encontrado");

    if (!post.author || post.author.id !== userId && userRole !== "admin")
      throw new Error("Apenas o autor ou um admin pode desativar este post");

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
  static async getPaginated(page = 1, limit = 10, typeSlug?: string) {
    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.max(1, Number(limit) || 10);

    const qb = AppDataSource.getRepository(Post)
      .createQueryBuilder("post")
      .leftJoinAndSelect("post.author", "author")
      .where("post.isActive = :isActive", { isActive: true })
      .loadRelationCountAndMap("post.commentsCount", "post.comments")
      .loadRelationCountAndMap("post.likesCount", "post.likes")
      .orderBy("post.createdAt", "DESC")
      .addOrderBy("post.id", "DESC")
      .skip((currentPage - 1) * pageSize)
      .take(pageSize);

    if (typeSlug) {
      const enumValue = slugToEnum[typeSlug];
      if (enumValue) qb.andWhere(`post."postType" = :t`, { t: enumValue });
    }

    const [rows, total] = await qb.getManyAndCount();

    const posts = rows.map((p: any) => ({
      id: p.id,
      title: p.title,
      excerpt: p.content?.slice(0, 200) ?? "",
      imageUrl: p.imageUrl,
      createdAt: p.createdAt,
      author: p.author ? { id: p.author.id, name: p.author.name } : null,
      likes: p.likesCount ?? 0,
      commentsCount: p.commentsCount ?? 0,
      views: typeof p.views === "number" ? p.views : 0,
    }));

    return { posts, total };
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
    const qb = AppDataSource.getRepository(Post)
      .createQueryBuilder("post")
      .leftJoinAndSelect("post.author", "author")
      .where("post.isActive = :isActive", { isActive: true })
      .loadRelationCountAndMap("post.commentsCount", "post.comments")
      .loadRelationCountAndMap("post.likesCount", "post.likes")
      .orderBy("post.views", "DESC")
      .take(limit);

    const rows = await qb.getMany();
    return rows.map((p: any) => ({
      id: p.id,
      title: p.title,
      excerpt: p.content?.slice(0, 200) ?? "",
      imageUrl: p.imageUrl,
      createdAt: p.createdAt,
      author: p.author ? { id: p.author.id, name: p.author.name } : null,
      likes: p.likesCount ?? 0,
      commentsCount: p.commentsCount ?? 0,
      views: typeof p.views === "number" ? p.views : 0,
    }));
  }
}

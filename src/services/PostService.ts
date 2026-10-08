import { AppDataSource } from "../config/ormconfig";
import { Post } from "../models/Post";
import { User } from "../models/User";
import { PostType } from "../models/enums/PostType";
import { EditorialChannel } from "../models/enums/EditorialChannel";
import { ContentFormat } from "../models/enums/ContentFormat";
import { EditorialStatus } from "../models/enums/EditorialStatus";
import { Category } from "../models/Category";
import { Tag } from "../models/Tag";
import { AuthorProfile } from "../models/AuthorProfile";
import { PostSlugRedirect } from "../models/PostSlugRedirect";
import {
  buildExcerpt,
  canonicalPostPath,
  normalizeSlug,
  sanitizeEditorialHtml,
} from "../utils/editorial";

const postRepository = AppDataSource.getRepository(Post);
const slugToEnum: Record<string, PostType> = {
  receitas: PostType.RECEITA,
  saude: PostType.SAUDE,
  artigos: PostType.ARTIGO,
  alimentacao: PostType.ALIMENTACAO,
  dicas: PostType.DICAS,
  novidades: PostType.NOVIDADES,
};
const JULIANA_AUTHOR_SLUG = "juliana-lacerda-macedo";
const PUBLIC_RELATIONS = ["authorProfile", "category", "tags"];
const ADMIN_RELATIONS = ["author", "editedBy", ...PUBLIC_RELATIONS];

export type EditorialPostInput = {
  title: string;
  content: string;
  postType?: PostType;
  slug?: string;
  excerpt?: string;
  channel?: EditorialChannel;
  format?: ContentFormat;
  status?: EditorialStatus;
  publishedAt?: string | Date | null;
  categoryId?: number | null;
  tagNames?: string[];
  authorProfileId?: number;
  imageUrl?: string | null;
  imageAlt?: string | null;
  imageCaption?: string | null;
  imageCredit?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  isFeatured?: boolean;
  featuredPriority?: number | null;
};

function assertEnumValue<T extends string>(value: T, values: readonly T[], label: string) {
  if (!values.includes(value)) throw new Error(`${label} inválido`);
}

function publicQuery() {
  return postRepository
    .createQueryBuilder("post")
    .leftJoinAndSelect("post.authorProfile", "authorProfile")
    .leftJoinAndSelect("post.category", "category")
    .leftJoinAndSelect("post.tags", "tags")
    .where("post.status = :status", { status: EditorialStatus.PUBLISHED })
    .andWhere("post.isActive = true")
    .andWhere('post."publishedAt" IS NOT NULL')
    .andWhere('post."publishedAt" <= CURRENT_TIMESTAMP');
}

export class PostService {
  private static async defaultAuthorProfile() {
    const profile = await AppDataSource.getRepository(AuthorProfile).findOne({
      where: { slug: JULIANA_AUTHOR_SLUG, isActive: true },
    });
    if (!profile) throw new Error("Perfil público da Juliana não encontrado");
    return profile;
  }

  private static async uniqueSlug(requested: string, postId?: number) {
    const base = normalizeSlug(requested);
    if (!base) throw new Error("Slug inválido");
    let candidate = base;
    let suffix = 2;
    while (true) {
      const existing = await postRepository
        .createQueryBuilder("post")
        .where("LOWER(post.slug) = LOWER(:slug)", { slug: candidate })
        .andWhere(postId ? "post.id <> :postId" : "1=1", { postId })
        .getOne();
      const redirect = await AppDataSource.getRepository(PostSlugRedirect)
        .createQueryBuilder("redirect")
        .where("LOWER(redirect.oldSlug) = LOWER(:slug)", { slug: candidate })
        .getOne();
      if (!existing && !redirect) return candidate;
      candidate = `${base}-${suffix++}`;
    }
  }

  private static async resolveTags(tagNames: string[] = []) {
    const repository = AppDataSource.getRepository(Tag);
    const normalized = [...new Set(tagNames.map((name) => name.trim()).filter(Boolean))].slice(0, 20);
    const tags: Tag[] = [];
    for (const name of normalized) {
      const slug = normalizeSlug(name);
      if (!slug) continue;
      let tag = await repository
        .createQueryBuilder("tag")
        .where("LOWER(tag.slug) = LOWER(:slug)", { slug })
        .getOne();
      if (!tag) tag = await repository.save(repository.create({ name, slug }));
      tags.push(tag);
    }
    return tags;
  }

  private static validateForPublish(input: {
    title: string;
    content: string;
    excerpt: string;
    imageUrl?: string | null;
    imageAlt?: string | null;
    publishedAt?: Date | null;
  }) {
    if (!input.title.trim()) throw new Error("Título é obrigatório para publicar");
    if (!input.content.trim()) throw new Error("Conteúdo é obrigatório para publicar");
    if (!input.excerpt.trim()) throw new Error("Resumo é obrigatório para publicar");
    if (input.imageUrl && !input.imageAlt?.trim()) {
      throw new Error("Texto alternativo é obrigatório para publicar uma imagem");
    }
    if (!input.publishedAt) throw new Error("Data de publicação é obrigatória");
  }

  static async createPost(
    inputOrTitle: EditorialPostInput | string,
    legacyContent?: string,
    legacyPostType?: PostType,
    legacyAuthorId?: number,
    legacyImageUrl?: string,
  ) {
    const input: EditorialPostInput = typeof inputOrTitle === "string"
      ? {
          title: inputOrTitle,
          content: legacyContent || "",
          postType: legacyPostType || PostType.ARTIGO,
          format: legacyPostType === PostType.RECEITA ? ContentFormat.RECIPE : ContentFormat.ARTICLE,
          status: EditorialStatus.PUBLISHED,
          imageUrl: legacyImageUrl,
          imageAlt: legacyImageUrl ? inputOrTitle : undefined,
        }
      : inputOrTitle;
    const authorId = typeof inputOrTitle === "string" ? legacyAuthorId! : legacyAuthorId!;
    const author = await AppDataSource.getRepository(User).findOne({ where: { id: authorId } });
    if (!author) throw new Error("Autor técnico não encontrado");

    const cleanContent = sanitizeEditorialHtml(input.content);
    const status = input.status || EditorialStatus.DRAFT;
    const channel = input.channel || EditorialChannel.CONTENT;
    const format = input.format || (input.postType === PostType.RECEITA ? ContentFormat.RECIPE : ContentFormat.ARTICLE);
    assertEnumValue(channel, Object.values(EditorialChannel), "Canal");
    assertEnumValue(format, Object.values(ContentFormat), "Formato");
    assertEnumValue(status, Object.values(EditorialStatus), "Status");
    if (channel === EditorialChannel.BLOG && format !== ContentFormat.ARTICLE) {
      throw new Error("Publicações do Blog devem usar o formato ARTICLE");
    }

    const publishedAt = status === EditorialStatus.PUBLISHED
      ? input.publishedAt ? new Date(input.publishedAt) : new Date()
      : input.publishedAt ? new Date(input.publishedAt) : null;
    const excerpt = input.excerpt?.trim() || buildExcerpt(cleanContent);
    if (status === EditorialStatus.PUBLISHED) {
      this.validateForPublish({ ...input, content: cleanContent, excerpt, publishedAt });
    }

    const category = input.categoryId
      ? await AppDataSource.getRepository(Category).findOne({ where: { id: input.categoryId, isActive: true } })
      : null;
    if (input.categoryId && !category) throw new Error("Categoria não encontrada");
    const authorProfile = input.authorProfileId
      ? await AppDataSource.getRepository(AuthorProfile).findOne({ where: { id: input.authorProfileId, isActive: true } })
      : await this.defaultAuthorProfile();
    if (!authorProfile) throw new Error("Perfil público de autoria não encontrado");

    const post = postRepository.create({
      title: input.title.trim(),
      slug: await this.uniqueSlug(input.slug || input.title),
      content: cleanContent,
      excerpt,
      postType: input.postType || (format === ContentFormat.RECIPE ? PostType.RECEITA : PostType.ARTIGO),
      channel,
      format,
      status,
      publishedAt,
      isActive: status === EditorialStatus.PUBLISHED,
      imageUrl: input.imageUrl || null,
      imageAlt: input.imageAlt?.trim() || null,
      imageCaption: input.imageCaption?.trim() || null,
      imageCredit: input.imageCredit?.trim() || null,
      seoTitle: input.seoTitle?.trim() || null,
      seoDescription: input.seoDescription?.trim() || null,
      isFeatured: Boolean(input.isFeatured),
      featuredPriority: input.isFeatured ? input.featuredPriority ?? 0 : null,
      author,
      authorProfile,
      category,
      tags: await this.resolveTags(input.tagNames),
    });
    return postRepository.save(post);
  }

  static async updatePost(postId: number, userId: number, userRole: string, inputOrTitle: Partial<EditorialPostInput> | string, legacyContent?: string, legacyPostType?: PostType, legacyImageUrl?: string) {
    const input: Partial<EditorialPostInput> = typeof inputOrTitle === "string"
      ? { title: inputOrTitle, content: legacyContent, postType: legacyPostType, imageUrl: legacyImageUrl }
      : inputOrTitle;
    const post = await postRepository.findOne({ where: { id: postId }, relations: ADMIN_RELATIONS });
    if (!post) throw new Error("Post não encontrado");
    if (userRole !== "admin" && post.author?.id !== userId) {
      throw new Error("Apenas o autor ou um admin pode editar este post");
    }

    const wasPublished = post.status === EditorialStatus.PUBLISHED;
    if (input.title !== undefined) post.title = input.title.trim();
    if (input.content !== undefined) post.content = sanitizeEditorialHtml(input.content);
    if (input.excerpt !== undefined) post.excerpt = input.excerpt.trim() || buildExcerpt(post.content);
    if (input.postType !== undefined) post.postType = input.postType;
    if (input.channel !== undefined) post.channel = input.channel;
    if (input.format !== undefined) post.format = input.format;
    if (input.status !== undefined) post.status = input.status;
    if (input.publishedAt !== undefined) post.publishedAt = input.publishedAt ? new Date(input.publishedAt) : null;
    if (post.status === EditorialStatus.PUBLISHED && !post.publishedAt) post.publishedAt = new Date();
    if (input.imageUrl !== undefined) post.imageUrl = input.imageUrl || null;
    if (input.imageAlt !== undefined) post.imageAlt = input.imageAlt?.trim() || null;
    if (input.imageCaption !== undefined) post.imageCaption = input.imageCaption?.trim() || null;
    if (input.imageCredit !== undefined) post.imageCredit = input.imageCredit?.trim() || null;
    if (input.seoTitle !== undefined) post.seoTitle = input.seoTitle?.trim() || null;
    if (input.seoDescription !== undefined) post.seoDescription = input.seoDescription?.trim() || null;
    if (input.isFeatured !== undefined) post.isFeatured = input.isFeatured;
    if (input.featuredPriority !== undefined) post.featuredPriority = input.featuredPriority;
    if (!post.isFeatured) post.featuredPriority = null;
    if (input.categoryId !== undefined) {
      post.category = input.categoryId
        ? await AppDataSource.getRepository(Category).findOne({ where: { id: input.categoryId, isActive: true } })
        : null;
      if (input.categoryId && !post.category) throw new Error("Categoria não encontrada");
    }
    if (input.authorProfileId !== undefined) {
      const profile = await AppDataSource.getRepository(AuthorProfile).findOne({ where: { id: input.authorProfileId, isActive: true } });
      if (!profile) throw new Error("Perfil público de autoria não encontrado");
      post.authorProfile = profile;
    }
    if (input.tagNames !== undefined) post.tags = await this.resolveTags(input.tagNames);
    if (post.channel === EditorialChannel.BLOG && post.format !== ContentFormat.ARTICLE) throw new Error("Publicações do Blog devem usar ARTICLE");

    if (input.slug !== undefined) {
      const normalized = normalizeSlug(input.slug);
      if (normalized !== post.slug) {
        const newSlug = await this.uniqueSlug(normalized, post.id);
        if (wasPublished) {
          const redirects = AppDataSource.getRepository(PostSlugRedirect);
          await redirects.save(redirects.create({ oldSlug: post.slug, post }));
        }
        post.slug = newSlug;
      }
    }
    if (!post.excerpt) post.excerpt = buildExcerpt(post.content);
    if (post.status === EditorialStatus.PUBLISHED) this.validateForPublish(post);
    post.isActive = post.status === EditorialStatus.PUBLISHED;
    const editor = await AppDataSource.getRepository(User).findOne({ where: { id: userId } });
    if (editor) post.editedBy = editor;
    return postRepository.save(post);
  }

  static async getAllPosts() {
    return publicQuery().orderBy("post.publishedAt", "DESC").getMany();
  }

  static async getAdminPosts() {
    return postRepository.find({ order: { updatedAt: "DESC" }, relations: ADMIN_RELATIONS });
  }

  static async getAdminPostById(postId: number) {
    const post = await postRepository.findOne({ where: { id: postId }, relations: ADMIN_RELATIONS });
    if (!post) throw new Error("Post não encontrado");
    return post;
  }

  // Compatibilidade interna temporária com chamadas legadas do serviço.
  static async getPostById(postId: number) {
    return this.getAdminPostById(postId);
  }

  static async getPublicPostById(postId: number) {
    const post = await publicQuery().andWhere("post.id = :postId", { postId }).getOne();
    if (!post) throw new Error("Conteúdo não encontrado");
    return post;
  }

  static async getPublicPostBySlug(slug: string) {
    const normalized = normalizeSlug(slug);
    let post = await publicQuery().andWhere("LOWER(post.slug) = LOWER(:slug)", { slug: normalized }).getOne();
    let redirectedFrom: string | null = null;
    if (!post) {
      const redirect = await AppDataSource.getRepository(PostSlugRedirect)
        .createQueryBuilder("redirect")
        .leftJoinAndSelect("redirect.post", "post")
        .where("LOWER(redirect.oldSlug) = LOWER(:slug)", { slug: normalized })
        .getOne();
      if (redirect) {
        post = await publicQuery().andWhere("post.id = :id", { id: redirect.post.id }).getOne();
        redirectedFrom = normalized;
      }
    }
    if (!post) throw new Error("Conteúdo não encontrado");
    return { post, redirectedFrom, canonicalPath: canonicalPostPath(post) };
  }

  static async incrementPostViews(postId: number) {
    await postRepository.increment({ id: postId }, "views", 1);
  }

  static async listPublic(options: { page?: number; limit?: number; channel?: EditorialChannel; format?: ContentFormat; category?: string; tag?: string; typeSlug?: string } = {}) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(options.limit) || 10));
    const qb = publicQuery()
      .loadRelationCountAndMap("post.commentsCount", "post.comments")
      .loadRelationCountAndMap("post.likesCount", "post.likes")
      .orderBy("post.publishedAt", "DESC")
      .addOrderBy("post.id", "DESC")
      .skip((page - 1) * limit)
      .take(limit);
    if (options.channel) qb.andWhere("post.channel = :channel", { channel: options.channel });
    if (options.format) qb.andWhere("post.format = :format", { format: options.format });
    if (options.category) qb.andWhere("category.slug = :category", { category: normalizeSlug(options.category) });
    if (options.tag) qb.andWhere("tags.slug = :tag", { tag: normalizeSlug(options.tag) });
    if (options.typeSlug && slugToEnum[options.typeSlug]) qb.andWhere('post."postType" = :postType', { postType: slugToEnum[options.typeSlug] });
    const [posts, total] = await qb.getManyAndCount();
    return { posts, total, page, limit };
  }

  static async getPaginated(page = 1, limit = 10, typeSlug?: string) {
    return this.listPublic({ page, limit, typeSlug });
  }

  static async filterPosts(title?: string, category?: string, author?: string, date?: string) {
    const qb = publicQuery();
    if (title) qb.andWhere("post.title ILIKE :title", { title: `%${title}%` });
    if (category) {
      const legacy = Object.values(PostType).find((value) => value.toLowerCase() === category.toLowerCase());
      if (legacy) qb.andWhere('post."postType" = :legacy', { legacy });
      else qb.andWhere("category.slug = :categorySlug", { categorySlug: normalizeSlug(category) });
    }
    if (author) qb.andWhere('authorProfile."displayName" ILIKE :author', { author: `%${author}%` });
    if (date) qb.andWhere('DATE(post."publishedAt") = :date', { date });
    return qb.orderBy("post.publishedAt", "DESC").getMany();
  }

  static async getTopViewed(limit: number) {
    return publicQuery()
      .loadRelationCountAndMap("post.commentsCount", "post.comments")
      .loadRelationCountAndMap("post.likesCount", "post.likes")
      .orderBy("post.isFeatured", "DESC")
      .addOrderBy("post.featuredPriority", "ASC", "NULLS LAST")
      .addOrderBy("post.views", "DESC")
      .take(Math.min(20, Math.max(1, limit)))
      .getMany();
  }

  static async toggleActive(postId: number, _userId: number, userRole: string) {
    const post = await this.getAdminPostById(postId);
    if (userRole !== "admin" && post.author?.id !== _userId) {
      throw new Error("Apenas o autor ou um admin pode alterar publicação");
    }
    if (post.status === EditorialStatus.PUBLISHED) {
      post.status = EditorialStatus.ARCHIVED;
      post.isActive = false;
    } else {
      post.status = EditorialStatus.PUBLISHED;
      post.publishedAt = post.publishedAt || new Date();
      this.validateForPublish(post);
      post.isActive = true;
    }
    return postRepository.save(post);
  }

  static async deletePost(postId: number, userRole: string) {
    if (userRole !== "admin") throw new Error("Apenas admins podem deletar posts permanentemente");
    const post = await postRepository.findOne({ where: { id: postId } });
    if (!post) throw new Error("Post não encontrado");
    await postRepository.remove(post);
    return { message: "Post deletado permanentemente." };
  }

  static async getTaxonomy() {
    const [categories, tags, authors] = await Promise.all([
      AppDataSource.getRepository(Category).find({ where: { isActive: true }, order: { name: "ASC" } }),
      AppDataSource.getRepository(Tag).find({ order: { name: "ASC" } }),
      AppDataSource.getRepository(AuthorProfile).find({ where: { isActive: true }, order: { displayName: "ASC" } }),
    ]);
    return { categories, tags, authors };
  }

  static async getSitemapEntries() {
    const posts = await publicQuery().orderBy("post.publishedAt", "DESC").getMany();
    return posts.map((post) => ({ path: canonicalPostPath(post), updatedAt: post.updatedAt }));
  }
}

import express from "express";
import request from "supertest";
import { AppDataSource } from "../config/ormconfig";
import { Category } from "../models/Category";
import { User, UserRole } from "../models/User";
import { ContentFormat } from "../models/enums/ContentFormat";
import { EditorialChannel } from "../models/enums/EditorialChannel";
import { EditorialStatus } from "../models/enums/EditorialStatus";
import postRoutes from "../routes/post.routes";
import { PostService } from "../services/PostService";

const app = express();
app.use(express.json());
app.use("/post", postRoutes);

describe("Paginação editorial pública", () => {
  let admin: User;
  let category: Category;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();

    await AppDataSource.query(`
      TRUNCATE TABLE
        "post_slug_redirects",
        "post_tags",
        "post_likes",
        "comments",
        "posts",
        "users"
      RESTART IDENTITY CASCADE
    `);

    admin = await AppDataSource.getRepository(User).save({
      name: "Admin paginação editorial",
      email: "editorial-pagination@example.com",
      password: "hash",
      role: UserRole.ADMIN,
    });
    category = await AppDataSource.getRepository(Category).findOneByOrFail({
      slug: "alimentacao",
    });

    const common = {
      content: "<p>Conteúdo editorial para paginação.</p>",
      excerpt: "Resumo editorial.",
      status: EditorialStatus.PUBLISHED,
      categoryId: category.id,
      authorProfileId: 1,
      tagNames: ["Integração", "Paginação"],
    };

    await PostService.createPost({
      ...common,
      title: "Artigo empatado mais antigo",
      channel: EditorialChannel.CONTENT,
      format: ContentFormat.ARTICLE,
      publishedAt: "2024-03-01T12:00:00.000Z",
    }, undefined, undefined, admin.id);

    await PostService.createPost({
      ...common,
      title: "Artigo empatado mais novo",
      channel: EditorialChannel.CONTENT,
      format: ContentFormat.ARTICLE,
      publishedAt: "2024-03-01T12:00:00.000Z",
    }, undefined, undefined, admin.id);

    await PostService.createPost({
      ...common,
      title: "Post do blog",
      channel: EditorialChannel.BLOG,
      format: ContentFormat.ARTICLE,
      publishedAt: "2024-02-01T12:00:00.000Z",
    }, undefined, undefined, admin.id);

    await PostService.createPost({
      ...common,
      title: "Receita mais recente",
      channel: EditorialChannel.CONTENT,
      format: ContentFormat.RECIPE,
      publishedAt: "2024-04-01T12:00:00.000Z",
    }, undefined, undefined, admin.id);

    await PostService.createPost({
      ...common,
      title: "Rascunho privado",
      channel: EditorialChannel.CONTENT,
      format: ContentFormat.ARTICLE,
      status: EditorialStatus.DRAFT,
    }, undefined, undefined, admin.id);

    await PostService.createPost({
      ...common,
      title: "Conteúdo arquivado",
      channel: EditorialChannel.CONTENT,
      format: ContentFormat.ARTICLE,
      status: EditorialStatus.ARCHIVED,
    }, undefined, undefined, admin.id);
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  });

  it("pagina posts com relações, filtros, contrato público e ordenação determinística", async () => {
    const response = await request(app)
      .get("/post/postspaginated")
      .query({ page: 1, limit: 6 })
      .expect(200);

    expect(response.body).toMatchObject({
      page: 1,
      limit: 6,
      total: 4,
    });
    expect(response.body.posts).toHaveLength(4);
    expect(response.body.posts.map((post: { title: string }) => post.title)).toEqual([
      "Receita mais recente",
      "Artigo empatado mais novo",
      "Artigo empatado mais antigo",
      "Post do blog",
    ]);

    const article = response.body.posts.find(
      (post: { title: string }) => post.title === "Artigo empatado mais novo",
    );
    expect(article).toMatchObject({
      channel: EditorialChannel.CONTENT,
      format: ContentFormat.ARTICLE,
      status: EditorialStatus.PUBLISHED,
      category: {
        id: category.id,
        slug: "alimentacao",
      },
      author: {
        id: 1,
        displayName: "Juliana Lacerda Macedo",
      },
      commentsCount: 0,
      likesCount: 0,
      likes: 0,
    });
    expect(article.tags.map((tag: { slug: string }) => tag.slug).sort()).toEqual([
      "integracao",
      "paginacao",
    ]);
    expect(article.canonicalPath).toBe(`/conteudos/${article.slug}`);
    expect(article).not.toHaveProperty("content");

    const contentResponse = await request(app)
      .get("/post/postspaginated")
      .query({ page: 1, limit: 6, channel: EditorialChannel.CONTENT })
      .expect(200);
    expect(contentResponse.body.total).toBe(3);
    expect(
      contentResponse.body.posts.every(
        (post: { channel: EditorialChannel }) => post.channel === EditorialChannel.CONTENT,
      ),
    ).toBe(true);

    const blogResponse = await request(app)
      .get("/post/postspaginated")
      .query({ page: 1, limit: 6, channel: EditorialChannel.BLOG })
      .expect(200);
    expect(blogResponse.body.total).toBe(1);
    expect(blogResponse.body.posts[0].title).toBe("Post do blog");

    const recipeResponse = await request(app)
      .get("/post/postspaginated")
      .query({
        page: 1,
        limit: 6,
        channel: EditorialChannel.CONTENT,
        format: ContentFormat.RECIPE,
      })
      .expect(200);
    expect(recipeResponse.body.total).toBe(1);
    expect(recipeResponse.body.posts[0].title).toBe("Receita mais recente");

    const titles = response.body.posts.map((post: { title: string }) => post.title);
    expect(titles).not.toContain("Rascunho privado");
    expect(titles).not.toContain("Conteúdo arquivado");
  });
});

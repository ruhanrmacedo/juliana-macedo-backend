import { AppDataSource } from "../config/ormconfig";
import { User, UserRole } from "../models/User";
import { PostService } from "../services/PostService";
import { EditorialStatus } from "../models/enums/EditorialStatus";
import { EditorialChannel } from "../models/enums/EditorialChannel";
import { ContentFormat } from "../models/enums/ContentFormat";
import { buildExcerpt } from "../utils/editorial";

describe("Conteúdo editorial 2.0", () => {
  let admin: User;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  });

  beforeEach(async () => {
    await AppDataSource.query(`DELETE FROM "post_slug_redirects"`);
    await AppDataSource.query(`DELETE FROM "post_tags"`);
    await AppDataSource.query(`DELETE FROM "posts"`);
    await AppDataSource.query(`DELETE FROM "users"`);
    admin = await AppDataSource.getRepository(User).save({
      name: "Admin editorial",
      email: `editorial-${Date.now()}@example.com`,
      password: "hash",
      role: UserRole.ADMIN,
    });
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  });

  it("gera excerpt sem HTML preservando espaços entre blocos", () => {
    expect(
      buildExcerpt("<h2>Saúde no cotidiano</h2><p>Um texto com <strong>HTML</strong>.</p>"),
    ).toBe("Saúde no cotidiano Um texto com HTML.");
  });

  it("mantém draft e archived fora da leitura pública", async () => {
    const draft = await PostService.createPost({
      title: "Rascunho privado",
      content: "<p>Não publicar</p>",
      status: EditorialStatus.DRAFT,
      channel: EditorialChannel.CONTENT,
      format: ContentFormat.ARTICLE,
    }, undefined, undefined, admin.id);

    await expect(PostService.getPublicPostById(draft.id)).rejects.toThrow(
      "Conteúdo não encontrado",
    );
    const archived = await PostService.updatePost(
      draft.id,
      admin.id,
      UserRole.ADMIN,
      { ...draft, status: EditorialStatus.ARCHIVED, tagNames: [] },
    );
    await expect(PostService.getPublicPostById(archived.id)).rejects.toThrow();
  });

  it("publica, sanitiza HTML e usa autoria pública da Juliana", async () => {
    const post = await PostService.createPost({
      title: "Saúde & Alimentação",
      content: '<p>Conteúdo seguro</p><script>alert("x")</script>',
      excerpt: "Resumo seguro",
      status: EditorialStatus.PUBLISHED,
      channel: EditorialChannel.CONTENT,
      format: ContentFormat.ARTICLE,
    }, undefined, undefined, admin.id);

    const publicPost = await PostService.getPublicPostById(post.id);
    expect(publicPost.slug).toBe("saude-alimentacao");
    expect(publicPost.content).not.toContain("<script");
    expect(publicPost.authorProfile.displayName).toBe("Juliana Lacerda Macedo");
  });

  it("preserva slug anterior ao alterar explicitamente um post publicado", async () => {
    const post = await PostService.createPost({
      title: "Título original",
      content: "<p>Conteúdo</p>",
      excerpt: "Resumo",
      status: EditorialStatus.PUBLISHED,
      channel: EditorialChannel.BLOG,
      format: ContentFormat.ARTICLE,
    }, undefined, undefined, admin.id);

    const updated = await PostService.updatePost(post.id, admin.id, UserRole.ADMIN, {
      slug: "novo-titulo",
    });
    expect(updated.slug).toBe("novo-titulo");
    const old = await PostService.getPublicPostBySlug("titulo-original");
    expect(old.post.id).toBe(post.id);
    expect(old.redirectedFrom).toBe("titulo-original");
    expect(old.canonicalPath).toBe("/blog/novo-titulo");
  });

  it("resolve colisões e tags normalizadas", async () => {
    const base = {
      title: "Mesmo título",
      content: "<p>Conteúdo</p>",
      excerpt: "Resumo",
      status: EditorialStatus.PUBLISHED,
      channel: EditorialChannel.CONTENT,
      format: ContentFormat.RECIPE,
      imageUrl: null,
      tagNames: ["Saúde mental", "Saúde mental"],
    };
    const first = await PostService.createPost(base, undefined, undefined, admin.id);
    const second = await PostService.createPost(base, undefined, undefined, admin.id);
    expect(first.slug).toBe("mesmo-titulo");
    expect(second.slug).toBe("mesmo-titulo-2");
    expect(first.tags).toHaveLength(1);
  });
});

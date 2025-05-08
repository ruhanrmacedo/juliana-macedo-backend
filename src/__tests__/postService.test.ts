import { AppDataSource } from "../config/ormconfig";
import { PostService } from "../services/PostService";
import { User, UserRole } from "../models/User";
import { PostType } from "../models/enums/PostType";

beforeAll(async () => {
  await AppDataSource.initialize();
});

afterAll(async () => {
  await AppDataSource.destroy();
});

describe("PostService", () => {
  let user: User;

  beforeEach(async () => {
    await AppDataSource.query(`DELETE FROM posts`);
    await AppDataSource.query(`DELETE FROM users`);

    const userRepository = AppDataSource.getRepository(User);

    user = userRepository.create({
      email: `test${Date.now()}@example.com`, // Garantindo email único
      name: "Test User",
      password: "password",
      role: UserRole.USER,
    });

    await userRepository.save(user);
  });

  it("Deve criar um post com sucesso", async () => {
    const post = await PostService.createPost(
      "Teste de Post",
      "Conteúdo do post",
      PostType.RECEITA,
      user.id,
      "https://example.com/image.jpg"
    );

    expect(post).toHaveProperty("id");
    expect(post.title).toBe("Teste de Post");
    expect(post.content).toBe("Conteúdo do post");
  });

  it("Deve listar todos os posts ativos", async () => {
    const posts = await PostService.getAllPosts();
    expect(posts.length).toBeGreaterThanOrEqual(0);
  });

  it("Deve buscar um post pelo ID", async () => {
    const post = await PostService.createPost(
      "Post para Teste",
      "Outro conteúdo",
      PostType.SAUDE,
      user.id
    );

    const foundPost = await PostService.getPostById(post.id);
    expect(foundPost).toHaveProperty("id", post.id);
  });

  it("Deve atualizar um post existente", async () => {
    const post = await PostService.createPost(
      "Post Editável",
      "Conteúdo inicial",
      PostType.ESTUDO,
      user.id
    );

    const updatedPost = await PostService.updatePost(
      post.id,
      user.id,
      "Post Atualizado"
    );

    expect(updatedPost.title).toBe("Post Atualizado");
  });

  it("Deve desativar um post", async () => {
    const post = await PostService.createPost(
      "Post para Desativar",
      "Conteúdo...",
      PostType.DICAS,
      user.id
    );

    const toggledPost = await PostService.toggleActive(post.id, user.id);
    expect(toggledPost.isActive).toBe(false);
  });

  it("Deve deletar um post permanentemente", async () => {
    const post = await PostService.createPost(
      "Post para Excluir",
      "Vai ser excluído...",
      PostType.BEM_ESTAR,
      user.id
    );

    await PostService.deletePost(post.id, "admin");
    await expect(PostService.getPostById(post.id)).rejects.toThrow(
      "Post não encontrado"
    );
  });
});

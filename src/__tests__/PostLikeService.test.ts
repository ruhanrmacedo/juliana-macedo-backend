import { AppDataSource } from "../config/ormconfig";
import { PostLikeService } from "../services/PostLikeService";
import { User } from "../models/User";
import { Post } from "../models/Post";
import { PostType } from "../models/enums/PostType";
import { UserRole } from "../models/User";

beforeAll(async () => {
  await AppDataSource.initialize();
});

afterAll(async () => {
  await AppDataSource.destroy();
});

describe("PostLikeService", () => {
  let post: Post;

  beforeEach(async () => {
    // Limpa as tabelas respeitando os relacionamentos
    await AppDataSource.query(`TRUNCATE TABLE post_likes, posts, users CASCADE`);

    const userRepository = AppDataSource.getRepository(User);
    const postRepository = AppDataSource.getRepository(Post);

    const user = userRepository.create({
      email: `test${Date.now()}@example.com`,
      name: "Test User",
      password: "password",
      role: UserRole.USER,
    });

    await userRepository.save(user);

    post = postRepository.create({
      title: "Post de Teste",
      content: "Conteúdo do post",
      postType: PostType.DICAS,
      author: user,
    });

    await postRepository.save(post);
  });

  it("Deve permitir curtir um post com IP e User-Agent únicos", async () => {
    const like = await PostLikeService.like(post.id, "192.168.0.1", "TestAgent/1.0");

    expect(like).toHaveProperty("id");
    expect(like.post.id).toBe(post.id);
    expect(like.ip).toBe("192.168.0.1");
  });

  it("Deve impedir curtir o mesmo post com o mesmo IP e User-Agent", async () => {
    await PostLikeService.like(post.id, "192.168.0.2", "Mozilla");

    await expect(
      PostLikeService.like(post.id, "192.168.0.2", "Mozilla")
    ).rejects.toThrow("Você já curtiu esse post");
  });

  it("Deve contar corretamente o número de curtidas", async () => {
    await PostLikeService.like(post.id, "192.168.1.1", "AgentA");
    await PostLikeService.like(post.id, "192.168.1.2", "AgentB");

    const count = await PostLikeService.count(post.id);
    expect(count).toBe(2);
  });
});

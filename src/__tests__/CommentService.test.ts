import { AppDataSource } from "../config/ormconfig";
import { User, UserRole } from "../models/User";
import { Post } from "../models/Post";
import { CommentService } from "../services/CommentService";
import { PostType } from "../models/enums/PostType";

beforeAll(async () => {
    await AppDataSource.initialize();
});

afterAll(async () => {
    await AppDataSource.destroy();
});

describe("CommentService", () => {
    let user: User;
    let admin: User;
    let post: Post;

    beforeEach(async () => {
        await AppDataSource.query(`TRUNCATE TABLE comments, posts, users CASCADE`);

        const userRepo = AppDataSource.getRepository(User);
        const postRepo = AppDataSource.getRepository(Post);

        user = userRepo.create({
            email: `user${Date.now()}@test.com`,
            name: "User Test",
            password: "123456",
            role: UserRole.USER,
        });

        admin = userRepo.create({
            email: `admin${Date.now()}@test.com`,
            name: "Admin Test",
            password: "123456",
            role: UserRole.ADMIN,
        });

        await userRepo.save([user, admin]);

        post = postRepo.create({
            title: "Post Teste",
            content: "Conteúdo de teste",
            postType: PostType.RECEITA,
            author: user,
        });

        await postRepo.save(post);
    });

    it("Deve criar um comentário com sucesso", async () => {
        const comment = await CommentService.create(post.id, user.id, "Comentário legal!");
        expect(comment).toHaveProperty("id");
        expect(comment.content).toBe("Comentário legal!");
        expect(comment.user.id).toBe(user.id);
        expect(comment.post.id).toBe(post.id);
    });

    it("Deve atualizar um comentário (pelo autor)", async () => {
        const comment = await CommentService.create(post.id, user.id, "Original");
        const updated = await CommentService.update(comment.id, user.id, "Editado");

        expect(updated.content).toBe("Editado");
        expect(updated.isEdited).toBe(true);
    });

    it("Não deve permitir atualização por outro usuário", async () => {
        const comment = await CommentService.create(post.id, user.id, "Original");

        await expect(
            CommentService.update(comment.id, admin.id, "Tentativa de edição")
        ).rejects.toThrow("Apenas o autor pode editar");
    });

    it("Deve deletar comentário como autor", async () => {
        const comment = await CommentService.create(post.id, user.id, "Remover eu mesmo");
        await expect(CommentService.delete(comment.id, user.id, false)).resolves.toBeTruthy();
    });

    it("Deve deletar comentário como admin", async () => {
        const comment = await CommentService.create(post.id, user.id, "Removido pelo admin");
        await expect(CommentService.delete(comment.id, admin.id, true)).resolves.toBeTruthy();
    });

    it("Não deve permitir deletar por outro usuário comum", async () => {
        const comment = await CommentService.create(post.id, user.id, "Tentativa inválida");

        await expect(
            CommentService.delete(comment.id, admin.id, false)
        ).rejects.toThrow("Apenas o autor ou admin pode excluir");
    });

    it("Deve listar comentários de um post", async () => {
        await CommentService.create(post.id, user.id, "Comentário A");
        await CommentService.create(post.id, user.id, "Comentário B");

        const list = await CommentService.listByPost(post.id);
        expect(list.length).toBe(2);
        expect(list[0]).toHaveProperty("user");
        expect(list[0]).toHaveProperty("createdAt");
    });
});
